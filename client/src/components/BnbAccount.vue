<template>
  <div class="mb-5">
    <v-btn class="my-4" @click="loadWallet">
      Load Wallet
      <v-icon class="ml-2">mdi-refresh</v-icon>
    </v-btn>
    <v-btn
      v-if="value && value.length"
      icon class="ml-3"
      @click="$emit('input', [])"
    >
      <v-icon>mdi-close-circle</v-icon>
    </v-btn>
    <v-data-table
      v-if="value && value.length"
      :headers="headers"
      :items="value"
      :items-per-page="-1"
      :sort-by.sync="columnSortBy"
      :sort-desc.sync="columnSortDesc"
      :must-sort='true'
      mobile-breakpoint=720
      hide-default-footer
      class="elevation-1 mb-10"
    > <!-- @click:row="rowClicked" -->
      <template v-slot:[`item.networks`]="{ item }">
        {{ item.networkList.map(e => e.network).join(', ') }}
      </template>
    </v-data-table>
  </div>
</template>

<script>
export default {
  props: {
    value: Array,
  },
  data: () => ({
    headers: [
      { align: 'start', text: 'Coin', value: 'coin' },
      { align: 'start', text: 'Free', value: 'free' },
      { align: 'start', text: 'Networks', value: 'networks' },
    ],
    columnSortBy: 'created',
    columnSortDesc: true,
  }),
  methods: {
    rowClicked(event) { // not very useful
      this.$emit('updateItem',
        { type: 'mkt', pair: event.coin + 'USDT', volume: event.free, percent: '1.25' })
    },
    loadWallet() {
      this.$emit('update', { action: 'getWallet' })
    },
  },
  created() {
    //
  }
}
</script>

<style scoped>

</style>
