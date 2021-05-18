<template>
  <div>
    <ConnectStatus ref="connectStatus" @open="socketOpened" @message="processStream" />
    <div class="d-flex align-center">
      <PortfolioBar @changedPortfolio="changedPortfolio" />
      <v-spacer />
      <v-btn
        class="ml-auto mr-0 my-2"
        color="primary"
        @click="addDialogShow = true"
      >
        Add pair
      </v-btn>
    </div>
    <v-data-table
      :headers="tableHeaders"
      :items="tableItems"
      :items-per-page="-1"
      :sort-by.sync="columnSortBy"
      :sort-desc.sync="columnSortDesc"
      :must-sort='true'
      mobile-breakpoint=720
      hide-default-footer
      class="elevation-1"
      @click:row="rowClicked($event)"
    >
      <template v-slot:[`item.percent`]="{ item }">
        <span :style="getPercentColor(item.percent)">
          {{ item.percent }}
        </span>
      </template>
      <template v-slot:[`item.volume`]="{ item }">
        <span style="color:grey">
          {{ item.volume }}
        </span>
      </template>
      <template v-slot:[`item.comment`]="props">
        <v-card class="pa-1" width="180px" color="yellow lighten-4" flat>
          <v-edit-dialog @open="openComment(props.item)" @save="saveComment(props.item)">
            {{ truncateComment(props.item.comment) }}
            <template v-slot:input>
              <v-text-field
                v-model="draftComment"
                clearable autofocus
                :placeholder="props.item.pair"
                single-line
              ></v-text-field>
            </template>
          </v-edit-dialog>
        </v-card>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <div style="white-space:nowrap">
        <template v-if="columnSortBy === 'order'">
          <v-icon class="mr-2" @click.stop="moveItem($event, true, item.order - 1)">
            mdi-arrow-up
          </v-icon>
          <v-icon class="mr-2" @click.stop="moveItem($event, false, item.order - 1)">
            mdi-arrow-down
          </v-icon>
          <v-divider class="mr-2 py-2" vertical />
        </template>
        <v-icon
          @click.stop="openDeleteDialog($event, item)"
        >
          mdi-delete
        </v-icon>
        </div>
      </template>
    </v-data-table>
    <ChartPopup v-model="chartCurrentPair" />
    <v-dialog v-model="deleteDialog.show" max-width="290">
      <v-card>
        <v-card-title>Delete {{ deleteDialog.pair }}?</v-card-title>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='deleteItem(deleteDialog.index)'>Yes</v-btn>
          <v-btn color='primary' @click='deleteDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="addDialogShow" max-width="290">
      <v-card>
        <v-card-title>Add pair</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="draftAddPair"
            @keyup.enter='addPair()'
            clearable autofocus
            placeholder='Example: btcusdt'
            single-line
          ></v-text-field>
        </v-card-text>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='addPair()'>OK</v-btn>
          <v-btn color='primary' @click='addDialogShow = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import ConnectStatus from "@/components/ConnectStatus"
import PortfolioBar from "@/components/PortfolioBar"
import ChartPopup from "@/components/ChartPopup"
import axios from "axios";
axios.defaults.timeout = 8000;
axios.defaults.withCredentials = false;
const MAX_COMMENT_CHARS = 20;
export default {
  name: "MiniCharts",
  components: {
    ConnectStatus,
    PortfolioBar,
    ChartPopup,
  },
  data: () => ({
    tableHeaders: [
      {
        text: "#",
        align: "start",
        sortable: true,
        value: "order",
      },
      { text: "Pair", value: "pair" },
      { text: "Price (USD)", value: "price" },
      { text: "% 24h", value: "percent" },
      { text: "Vol 24h", value: "volume" },
      { text: "Comment", value: "comment" },
      { text: "Actions", value: "actions", sortable: false },
    ],
    draftAddPair: '',
    deleteDialog: { 'show': false, 'index': -1, 'pair': '' },
    addDialogShow: false,
    draftComment: '',
    columnSortBy: 'order',
    columnSortDesc: false,
    tableItems: [],
    priceNotationScientific: true,
    chartCurrentPair: '',
    socket: null,
  }),
  computed: {
    content() { return this.$store.getters.getListContent },
    getPairs() {
      if(!this.content.portfolios?.length) return []
      return this.content.portfolios[this.content.currentPortfolioIndex].pairs.map(o => o.pair)
    },
  },
  methods: {
    changedPortfolio() {
      this.$refs.connectStatus.renew()
      this.buildTableItems()
    },
    addPair() {
      // Check input
      const cleanedPair = this.draftAddPair.trim().toLowerCase()
      if(!cleanedPair) {
        this.draftAddPair = ''
        return
      }
      const pos = this.getPairs.indexOf(cleanedPair)
      if(pos > -1) {
        this.$store.dispatch('popup', { msg: 'Pair already exists (#' + (pos + 1) + ')', color: 'red' })
        return
      }
      this.checkPairAndSubscribe(cleanedPair)
      // Close dialog
      this.addDialogShow = false
      this.draftAddPair = ''
    },
    async checkPairAndSubscribe(cleanedPair) {
      const upperCleanedPair = cleanedPair.toUpperCase()
      // Check if pair exists
      try {
        await axios.get(
          'https://api.binance.com/api/v3/klines?symbol='
          + upperCleanedPair
          + '&interval=1d&limit=1');
      } catch (err) {
        // Feedback message
        this.$store.dispatch('popup', { msg: upperCleanedPair + ' not found!', color: 'red' })
        return
      }
      // Add pair to arrays
      this.$store.commit({
        type: 'insertPair',
        pos: this.getPairs.length,
        item: { pair: cleanedPair, comment: '' }
      })
      this.tableItems.push({
        order: (this.tableItems.length + 1).toString(),
        pair: upperCleanedPair,
        price: '-',
        volume: '-',
        percent: '-',
        comment: '',
      });
      // remote storage push
      this.$store.dispatch('remoteStoragePush', this.content)
      // Add and send subscription message
      const obj = this.buildSubscriptionObject([cleanedPair])
      if(this.$refs.connectStatus.isConnected()) {
        this.socket.send(JSON.stringify(obj))
      } else {
        // this is needed when a new _empty_ list is created
        this.$refs.connectStatus.renew()
      }
      // Feedback message
      this.$store.dispatch('popup', { msg: 'Added ' + upperCleanedPair })
    },
    truncateComment(comment) {
      if(comment.length > MAX_COMMENT_CHARS) {
        return comment.substring(0, MAX_COMMENT_CHARS - 1) + '…'
      }
      return comment
    },
    openComment(item) {
      this.draftComment = item.comment.length > 1 ? item.comment : ''
    },
    saveComment(item) {
      // local table
      if(!this.draftComment || !this.draftComment.length) {
        item.comment = ''
      } else {
        item.comment = this.draftComment
      }
      this.draftComment = ''
      // global vuex state
      this.$store.commit('addComment', { index: item.order - 1, comment: item.comment })
      // remote storage push
      this.$store.dispatch('remoteStoragePush', this.content)
    },
    fixOrderings() {
      // Fix orders after move or delete
      for(let i = 0; i < this.tableItems.length; i++) {
        this.tableItems[i].order = i + 1
      }
    },
    moveItem(event, directionUp, index) {
      const lastIndex = this.tableItems.length - 1
      let toIndex
      if(this.columnSortDesc === true) {
        directionUp = !directionUp
      }
      if(directionUp) {
        if(index === 0) toIndex = lastIndex
        else toIndex = index - 1
      } else {
        if(index === lastIndex) toIndex = 0
        else toIndex = index + 1
      }
      // local table
      this.tableItems.splice(toIndex, 0, this.tableItems.splice(index, 1)[0])
      this.fixOrderings()
      event.target.blur()
      // global vuex state
      const pairToAdd = this.content.portfolios[this.content.currentPortfolioIndex].pairs[index]
      this.$store.commit('deletePair', index)
      this.$store.commit({
        type: 'insertPair',
        pos: toIndex,
        item: pairToAdd
      })
      // remote storage push
      this.$store.dispatch('remoteStoragePush', this.content)
    },
    openDeleteDialog(event, item) {
      this.deleteDialog = {
        show: true,
        index: item.order - 1,
        pair: item.pair
      }
      event.target.blur()
    },
    deleteItem(index) {
      this.deleteDialog.show = false
      // local table
      this.tableItems.splice(index, 1)
      this.fixOrderings()
      // global vuex state
      this.$store.commit('deletePair', index)
      // remote storage push
      this.$store.dispatch('remoteStoragePush', this.content)
    },
    getPercentColor(percent) {
      let color = "";
      if (percent < 0) {
        color = "color: red";
      } else if (percent > 0) {
        color = "color: green";
      }
      return color;
    },
    rowClicked(e) {
      this.chartCurrentPair = e.pair;
    },
    processPriceTicker(msg) {
      const data = msg.data;
      for (const item of this.tableItems) {
        if (item.pair === data.s.toUpperCase()) {
          item.price = parseFloat(data.c).toExponential(3);
          item.volume = (data.c * data.v).toExponential(2);
          item.percent = parseFloat(data.P).toFixed(2);
        }
      }
    },
    processStream(e) {
      const msg = JSON.parse(e.data);
      if (!("data" in msg)) {
        return;
      }
      if (msg.stream.includes("@ticker")) {
        this.processPriceTicker(msg);
      }
    },
    buildTableItems() {
      const portIndex = this.content.currentPortfolioIndex
      this.tableItems = [];
      for (let i = 0; i < this.getPairs.length; i++) {
        this.tableItems.push({
          order: (i + 1).toString(),
          pair: this.getPairs[i].toUpperCase(),
          price: '-',
          volume: '-',
          percent: '-',
          comment: this.content.portfolios[portIndex].pairs[i].comment,
        });
      }
    },
    buildSubscriptionObject(pairs) {
      if(!pairs) return null
      let obj = { method: "SUBSCRIBE", params: [], id: 1 };
      for (const pair of pairs) {
        obj.params.push(pair + "@ticker");
      }
      return obj;
    },
    socketOpened(socket) {
      const obj = this.buildSubscriptionObject(this.getPairs)
      if(obj) socket.send(JSON.stringify(obj));
      this.socket = socket
    },
  },
  created() {
    this.buildTableItems();
  },
};
</script>

<style scoped>

</style>
