<template>
  <v-dialog :value="!!chartPair" @input="hideChart()" width="800">
    <v-card
      class="d-flex flex-column ma-0 pa-0 hidden-scroll"
      ref="scrollChart"
      style="overflow-y: hidden"
      height="450"
      @mousedown="hideChart()"
    >
      <div class='d-flex align-self-center mt-1 grey--text' style='position:fixed'>
        {{ chartPair }}
      </div>
      <div class="d-flex flex-grow-1 align-center">
        <v-progress-circular
          v-if="!chartValues.length"
          indeterminate
          class="flex-grow-1"
          size="70"
          width="10"
          color="amber"
        />
        <fin-chart
          v-else
          class="flex-grow-1 ma-5"
          :height='420'
          :width='770'
          :candles="chartValues"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
import FinChart from "@/components/FinChart";
import axios from "axios";
axios.defaults.timeout = 8000;
axios.defaults.withCredentials = false;
export default {
  props: {
    value: String,
  },
  components: {
    FinChart,
  },
  data: () => ({
    chartPair: '',
    chartValues: [],
  }),
  methods: {
    hideChart() {
      this.chartValues = []
      this.$emit('input', '')
    },
    async retrieveDataAndLoad(newPair) {
      const url = 'https://api.binance.com/api/v3/klines?symbol='
        + newPair + '&interval=1d&limit=90'
      const binanceArray = await this.getBinanceArray(url)
      this.chartValues = this.binanceToFinChart(binanceArray)
      //console.dir(this.$refs.scrollChart) // DEBUG
      this.$nextTick(() => {
        this.$refs.scrollChart.$el.scrollBy(999, 0)
      })
    },
    async getBinanceArray(url) {
      let response;
      try {
        response = await axios.get(url);
        if (!response.data) {
          console.err("Got empty response");
          return [];
        }
      } catch (err) {
        console.err(err.message);
        return [];
      }
      return response.data;
    },
    binanceToFinChart(binanceData) {
      const finData = [];
      for (const element of binanceData) {
        finData.push({
          time: element[0] / 1000,
          o: Number(element[1]),
          h: Number(element[2]),
          l: Number(element[3]),
          c: Number(element[4]),
          volume: Number(element[5]),
        });
      }
      return finData;
    },
  },
  watch: {
    value(newPair) { // (newPair, oldPair)
      this.chartPair = newPair
      if(newPair) {
        this.retrieveDataAndLoad(newPair);
        //setTimeout(() => this.retrieveDataAndLoad(newPair), 5000)
      }
    },
  },
}
</script>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.hidden-scroll::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.hidden-scroll {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
