<template>
  <v-form ref="form" v-model="validForm" @submit.prevent="addEditTrade">
    <v-row>
      <v-col class="pb-0">
        <v-select filled label="Order type" v-model="formData.type"
          :items="orderTypesSelect" :rules="[fieldRules.required]" :disabled="!addNew"
          @input="$refs.form.resetValidation()"
        />
      </v-col>
      <v-col class="pb-0">
        <v-icon class="mx-2 mt-4" @click.stop="$store.commit('infoDialog',
          tradeTypeInfo[formData.type]); $event.target.blur()">
          mdi-information-outline
        </v-icon>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="pb-0">
        <v-text-field
          filled :label="'Pair' + (trades.length ? '' : ' (example: BTCUSDT)')"
          v-model="formData.pair" :rules="[fieldRules.required]" :disabled="!addNew"
        />
      </v-col>
      <v-col class="pb-0">
        <v-select filled label="Buy/sell" v-model="formData.sell" :disabled="!addNew"
          :items="[{text:'buy', value:false}, {text:'sell', value:true}]"
          :rules="[fieldRules.required]"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col class="pb-0">
        <v-text-field
          filled label="Volume (rounded)" v-model="formData.volume"
          :rules="[fieldRules.required, fieldRules.number]"
        />
      </v-col>
      <v-col class="pb-0">
        <v-text-field v-if="['mit', 'tmit'].includes(formData.type)"
          filled label="Enter Price" v-model="formData.enterPrice"
          :rules="[fieldRules.required, fieldRules.number]"
        />
        <v-text-field v-else filled background-color="lime lighten-5" :disabled="true" />
      </v-col>
    </v-row>
    <v-row>
      <v-col class="pb-0">
        <v-text-field v-if="['tmkt', 'tmit'].includes(formData.type)"
          filled label="Trail %" v-model="formData.percent"
          :rules="[fieldRules.percent]"
        />
        <v-text-field v-else filled background-color="lime lighten-5" :disabled="true" />
      </v-col>
      <v-col class="pb-0">
        <v-text-field v-if="['tmit'].includes(formData.type)"
          filled label="Worst exit price" v-model="fieldExitPrice"
          :rules="[fieldRules.required, fieldRules.number]"
        />
        <v-text-field v-else filled background-color="lime lighten-5" :disabled="true" />
      </v-col>
    </v-row>
    <v-btn class="mt-4" color="primary" type="submit"
      :disabled="!validForm"
      :loading="$store.getters.getLoadingTrade"
    >
      {{ addNew && 'Add trade' || 'Change trade' }}
    </v-btn>
    <v-btn v-if="!addNew" class="ml-2 mt-4" color="warning" @click="cancelTradeEdit">
      Cancel
    </v-btn>
  </v-form>
</template>

<script>
import axios from 'axios'
axios.defaults.timeout = 8000
axios.defaults.withCredentials = false
export default {
  props: {
    value: Object,
  },
  data: () => ({
    tradeTypeInfo: {
      mkt: 'MKT, example pair: ETHUSDT\n\nBUY: instantly buy [volume] amount of ETH\n\nSELL: instantly sell [volume] amount of ETH',
      mit: 'MIT, example pair: ETHUSDT\n\nBUY: buy [volume] amount of ETH if higher [enterPrice] in USDT is reached\n\nSELL: sell [volume] amount of ETH if lower [enterPrice] in USDT is reached',
      tmkt: 'TMKT, example pair: ETHUSDT\n\nBUY: Buy [volume] amount of ETH if the price rises above [percentage] of the lowest peek price. Use this if you want to buy ETH but you want to wait and see how low the price can go.\n\nSELL: Sell [volume] amount of ETH if the price falls below [percentage] of the highest peek price. Use this if you want to sell ETH but you want to wait and see how high the price can go.',
      tmit: 'TMIT, example pair: ETHUSDT\n\nBUY: buy [volume] amount of ETH if higher [enterPrice] in USDT is reached, then SELL back to USDT if the price drops below [percentage] of the highest peek price. Useful for trading breakouts above price resistance.\n\nSELL: sell [volume] amount of ETH if lower [enterPrice] in USDT is reached, then BUY back ETH if the price rises above [percentage] of the lowest peek price. Useful for trading breakdown below price resistance.',
    },
    orderTypesSelect: [
      { text: 'Instant market (mkt)', value: 'mkt' },
      { text: 'Market-if-touched (mit)', value: 'mit' },
      { text: 'Trailing market (tmkt)', value: 'tmkt' },
      { text: 'Trailing market-if-touched (tmit)', value: 'tmit' },
    ],
    formData: { type: 'mkt', pair: '', volume: '', sell: false, enterPrice: '', percent: '1.25', exitPrice: '' },
    validForm: false,
    fieldRules: {
      required: value => (!!value || value === false) || 'Required',
      number: value => !isNaN(value) || 'Need a number',
      percent: value => (value > 0.001 && value < 99.999) || 'Need a percentage 0.001-99.999',
    },
    typeTimer: null,
  }),
  watch: {
    value() {
      this.formData = Object.keys(this.value).length ?
        { ...this.value } : { ...this.$options.data().formData }
      this.$refs.form.resetValidation()
    }
  },
  computed: {
    trades() { return this.$store.getters.getTradeContent.trades },
    addNew() {
      return !this.formData.created
    },
    fieldExitPrice: {
      get() {
        if(isNaN(this.formData.enterPrice)) return ''
        return this.formData.sell ?
          this.formData.enterPrice * (1 + this.formData.percent / 100) :
          this.formData.enterPrice * (1 - this.formData.percent / 100)
      },
      set(val) {
        this.formData.exitPrice = val
        if(this.typeTimer) clearTimeout(this.typeTimer)
        this.typeTimer = setTimeout(() => {
          this.formData.percent = (this.formData.sell ?
            100 * (this.formData.exitPrice/this.formData.enterPrice - 1) :
            100 * (1 - this.formData.exitPrice/this.formData.enterPrice)).toFixed(3)
        }, 1500)
      }
    },
  },
  methods: {
    async addEditTrade() {
      const action = this.addNew ? 'add' : 'edit'
      this.$emit('update', { action, trade: this.formData })
    },
    cancelTradeEdit() {
      if(this.$store.getters.getLoadingTrade) return
      this.$emit('input', { ...this.emptyForm })
      this.$refs.form.resetValidation()
    },
  },
}
</script>

<style scoped>

</style>
