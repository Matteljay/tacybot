<template>
  <div class="mb-14">
    <v-card class="my-4" flat>
      <h1 class="d-inline">Automatic Trader</h1>
      <v-btn plain @click.stop="openKeysDialog">
        <v-icon class="keyIcon">mdi-key-chain</v-icon>
      </v-btn>
    </v-card>
    <BnbAccount v-model="walletLines" @update="socketPush" @updateItem="updateItem={...$event}" />
    <AddTradeGroupOne v-model="updateItem" @update="socketPush" />
    <v-data-table
      :headers="headers"
      :items="trades"
      :items-per-page="-1"
      :sort-by.sync="columnSortBy"
      :sort-desc.sync="columnSortDesc"
      :must-sort='true'
      mobile-breakpoint=720
      hide-default-footer
      class="elevation-1 my-10"
    >
      <template v-slot:item="row">
        <tr :class="rowColor(row.item)" @click="rowClicked(row.item)">
          <td v-for="{ value: headerName } in row.headers" class='text-start' :key='headerName'>
            <template v-if="headerName==='created'">
              {{ getISOtime(row.item[headerName]) }}
            </template>
            <template v-else-if="headerName==='sell'">
              <span class="ml-4" :style="getApprovedColor(!row.item[headerName])">
                {{ row.item[headerName] ? 'sell' : 'buy' }}
              </span>
            </template>
            <template v-else-if="['enterPrice', 'peekPrice'].includes(headerName)">
              {{ isNaN(row.item[headerName]) ? '-' : parseFloat(row.item[headerName]).toExponential(3) }}
            </template>
            <template v-else-if="headerName==='percent'">
              {{ isNaN(row.item[headerName]) ? '-' : parseFloat(row.item[headerName]).toFixed(3) }}
            </template>
            <template v-else-if="headerName==='priceCalc'">
              <span :class="!row.item[headerName] && 'grey--text'">
                {{ getPriceCalc(row.item) }}
              </span>
            </template>
            <template v-else-if="headerName==='actions'">
              <div style="white-space:nowrap;">
                <v-icon @click.stop="openInfoDialog($event, row.item)">
                  mdi-information-outline
                </v-icon>
                <v-icon class="ml-2" :disabled="row.item.finished"
                  @click.stop="openHaltDialog($event, row.item)"
                >
                  mdi-stop-circle-outline
                </v-icon>
                <v-icon class="ml-2"
                  @click.stop="openDeleteDialog($event, row.item)"
                >
                  mdi-delete
                </v-icon>
              </div>
            </template>
            <template v-else>
              {{ row.item[headerName] }}
            </template>
          </td>
        </tr>
      </template>
    </v-data-table>

    <v-dialog v-model="deleteDialog.show" max-width="290">
      <v-card>
        <v-card-title>Delete trade for<br />{{ deleteDialog.trade.pair }}?</v-card-title>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='deleteItem(deleteDialog.trade)'>Yes</v-btn>
          <v-btn color='warning' @click='deleteItem()'>Finished</v-btn>
          <v-btn color='primary' @click='deleteDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="haltDialog.show" max-width="290">
      <v-card>
        <v-card-title>Halt trade for<br />{{ haltDialog.trade.pair }}?</v-card-title>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='haltItem(haltDialog.trade)'>Yes</v-btn>
          <v-btn color='primary' @click='haltDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="keyDialog.show" max-width="290">
      <v-card>
        <v-card-title>Binance API keys</v-card-title>
        <v-card-text>
          <p>
            Keys are required for automated trades.
            Leave the fields empty and press OK to delete the keys from the server.
          </p>
          <p class="red--text">
            Warning: keys will be stored in plain text on the server.
            Security is NOT guaranteed. Never trade with more than you're willing to lose.
          </p>
          <v-text-field clearable single-line autofocus
            v-model="keyDialog.key1" placeholder='Label Key'
          />
          <v-text-field clearable single-line
            v-model="keyDialog.key2" placeholder='Secret Key'
          />
        </v-card-text>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='postKeys'>OK</v-btn>
          <v-btn color='primary' @click='keyDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script>
import AddTradeGroupOne from '@/components/AddTradeGroupOne';
import BnbAccount from '@/components/BnbAccount';
const getWSroot = () => {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:'
  return protocol + '//' + window.location.host
}
export default {
  components: {
    AddTradeGroupOne,
    BnbAccount,
  },
  data: () => ({
    headers: [
      { align: 'start', text: 'Created', value: 'created' },
      { align: 'start', text: 'Type', value: 'type' },
      { align: 'start', text: 'Pair', value: 'pair' },
      { align: 'start', text: '+/-', value: 'sell' },
      { align: 'start', text: 'Volume', value: 'volume' },
      { align: 'start', text: 'Enter', value: 'enterPrice' },
      { align: 'start', text: '%', value: 'percent' },
      { align: 'start', text: 'Peek', value: 'peekPrice' },
      { align: 'start', text: 'Exit', value: 'priceCalc' },
      { align: 'start', text: 'Actions', value: 'actions', sortable: false }
    ],
    columnSortBy: 'created',
    columnSortDesc: true,
    deleteDialog: { show: false, trade: {} },
    haltDialog: { show: false, trade: {} },
    keyDialog: { show: false, key1: '', key2: '' },
    socket: null,
    updateItem: {},
    walletLines: [],
  }),
  computed: {
    trades() { return this.$store.getters.getTradeContent.trades },
  },
  methods: {
    rowColor(item) {
      if(item.finished) {
        if(item.error) return 'red lighten-4'
        return 'teal lighten-4'
      }
      if(item.created === this.updateItem.created) {
        return 'amber lighten-2'
      }
      return ''
    },
    rowClicked(item) {
      if(item.finished) return
      if(this.updateItem.created === item.created) {
        this.updateItem = {}
      } else {
        this.updateItem = { ...item }
      }
    },
    openKeysDialog(event) {
      this.keyDialog.show = true
      event.target.blur()
    },
    openDeleteDialog(event, trade) {
      if(this.$store.getters.getLoadingTrade) return
      this.deleteDialog = { show: true, trade }
      event.target.blur()
    },
    openHaltDialog(event, trade) {
      if(this.$store.getters.getLoadingTrade) return
      this.haltDialog = { show: true, trade }
      event.target.blur()
    },
    openInfoDialog(event, trade) {
      let text = ''
      Object.keys(trade).forEach(k => {
        text += `<b>${k}:</b> ${trade[k]}<br />`
      })
      this.$store.commit('infoDialog', text)
      event.target.blur()
    },
    postKeys() {
      const keys = { APIkey1: this.keyDialog.key1, APIkey2: this.keyDialog.key2 }
      this.socketPush({ action: 'pushKeys', keys })
      this.keyDialog.key1 = ''
      this.keyDialog.key2 = ''
      this.keyDialog.show = false
    },
    deleteItem(trade) {
      if(this.$store.getters.getLoadingTrade) return
      this.deleteDialog.show = false
      if(!trade) return this.socketPush({action: 'deleteFinished'})
      this.socketPush({action: 'delete', created: trade.created})
    },
    haltItem(trade) {
      if(this.$store.getters.getLoadingTrade) return
      this.haltDialog.show = false
      this.socketPush({action: 'edit', trade: {...trade, finished: !trade.finished}})
    },
    getISOtime(epoch) {
      try {
        return new Date(epoch).toISOString()
      } catch(_) {
        return 'n/a'
      }
    },
    getApprovedColor(approved) {
      return approved ? 'color:green' : 'color:red'
    },
    getPriceCalc(trade) {
      for(const param of ['enterPrice', 'percent'])
        if(isNaN(trade[param])) return '-'
      const calc = trade.sell ?
        trade.peekPrice * (1 - trade.percent / 100) :
        trade.peekPrice * (1 + trade.percent / 100)
      return calc.toExponential(3)
    },
    openConnection() {
      this.socket = new WebSocket(getWSroot() + '/api/content/trade?token=' + this.$store.getters.getToken)
      this.socket.onmessage = (m) => this.messageReceived(m)
    },
    socketPush(payload) {
      const sendString = JSON.stringify(payload)
      this.$store.commit('setLoadingTrade', true)
      if(this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(sendString)
      } else {
        this.socket.close()
        this.openConnection()
        this.socket.onopen = () => this.socket.send(sendString)
      }
    },
    messageReceived(m) {
      try {
        const objectReceived = JSON.parse(m.data)
        if(objectReceived.trades) {
          const trades = objectReceived.trades
          //console.log(trades) //DEBUG
          this.$store.commit('setTrades', trades)
          // Reset UI loading indicator
          if(this.$store.getters.getLoadingTrade) this.updateItem = {}
          // Reset UI if trade suddenly finished
          const trade = trades.find(t => t.created === this.updateItem.created)
          if(trade?.finished) this.updateItem = {}
        }
        if(objectReceived.wallet) {
          this.walletLines = objectReceived.wallet
          //console.log(this.walletLines) //DEBUG
        }
        if(objectReceived.keyUpdate) {
          this.$store.dispatch('popup', { msg: 'Keys were updated' })
        }
      } catch(err) {
        this.$store.dispatch('popup', { msg: m.data, color: 'red' })
      }
      this.$store.commit('setLoadingTrade', false)
    },
  },
  destroyed() {
    this.socket.close()
  },
  mounted() {
    this.openConnection()
  },
}
</script>

<style scoped>
.keyIcon {
  color: rgb(110, 110, 0);
} 
</style>
