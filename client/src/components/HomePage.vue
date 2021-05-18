<template>
  <div>
    <h1 class="my-6 text-center">Home Page</h1>
    <v-card class="pa-10 my-12 mx-auto text-center rounded-lg" width="75%" color="yellow lighten-5">
      Welcome to TacyBot - The price aggregator and advanced Binance trading tool
    </v-card>
    <v-card class="pa-10 my-12 mx-auto text-center rounded-lg" width="75%" color="blue lighten-5">
      Execute trade types: <i>instant market</i>, <i>market-if-touched</i>, <i>trailing market</i>, <i>trailing market-if-touched</i>.
      Or simply use it as a highly customizable and responsive price aggregator and crypto portfolio management tool.
    </v-card>
    <v-card class="pa-10 my-12 mx-auto text-center rounded-lg" width="75%" color="light-green lighten-5">
      If this is the first time you're visiting this web application,
      <v-btn outlined class="px-2 py-0 ma-0" color="pink" plain
        @click.stop="$store.commit('setCurrentView', 'UserCreate')"
      >
        request an account
      </v-btn> and wait for approval.
      If you already have an account, proceed to 
      <v-btn outlined class="px-2 py-0 ma-0" color="blue" plain
        @click.stop="$store.commit('setCurrentView', 'UserLogin')"
      >
        logging in
      </v-btn>.
    </v-card>
    <v-card class="pa-10 my-12 mx-auto text-center rounded-lg" width="75%" color="pink lighten-5">
      Are you enjoying this web service? Tip from your profits:<br />
      Bitcoin: <a @click.stop="pressClip">14VZcizduTvUTesw4T9yAHZ7GjDDmXZmVs</a><br />
      Ethereum: <a @click.stop="pressClip">0x7C64707BD877f9cFBf0B304baf200cB1BB197354</a><br />
      Binance: <a @click.stop="pressClip">bnb1qvzenk3w9sfj5mgtqwsg0ph5m2x9m27x4krkgn</a>
    </v-card>
  </div>
</template>

<script>
export default {
  data: () => ({
    //
  }),
  methods: {
    pressClip(event) {
      const addr = event.target.outerText
      this.$copyText(addr)
      this.$store.dispatch('popup', { msg: `Copied ${addr.substring(0, 6)}… to clipboard` })
    }
  }
}
</script>

<style scoped>

</style>
