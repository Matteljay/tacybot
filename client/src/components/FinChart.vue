<script>
  import { Scatter } from 'vue-chartjs'
  export default {
    extends: Scatter,
    props: {
      candles: Array,
    },
    data: () => ({
      options: {
        tooltips: false,
        scales: {
          xAxes: [{
            xAxisID: 'x-axis-1',
            position: 'bottom',
            ticks: {
              maxTicksLimit: 6,
            }
          }, {
            xAxisID: 'x-axis-2',
            offset: true,
            gridLines: {
              display: false,
            },
            ticks: {
              display: false,
            }
          }],
          yAxes: [{
            yAxisID: 'y-axis-1',
            position: 'right',
            ticks: {
              maxTicksLimit: 8,
            },
          }, {
            yAxisID: 'y-axis-2',
            afterDataLimits: (axis) => {
              axis.max *= 4;
              axis.options.ticks.stepSize = axis.max / 50;
            },
            gridLines: {
              display: false,
            },
            ticks: {
              beginAtZero: false,
              display: false,
            },
          }],
        },
        legend: {
          display: false
        },
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0,
        },
      }
    }),
    methods: {
      fillDatasets(datasets) {
        const volumeData = [];
        let lastTime = 0;
        for(let i = 0; i < this.candles.length; i++) {
          const candle = this.candles[i];
          const isLastCandle = i === this.candles.length - 1;
          const time = candle.time;
          lastTime = time;
          let color;
          if(candle.o === candle.c || isLastCandle) {
            color = 'grey';
          } else if(candle.o < candle.c) {
            color = 'green';
          } else {
            color = 'red';
          }
          datasets.push({
            type: 'line',
            xAxisID: 'x-axis-1',
            yAxisID: 'y-axis-1',
            fill: false,
            pointRadius: 0,
            borderWidth: 1,
            borderColor: color,
            data: [{x: time, y: candle.l}, {x: time, y: candle.h}],
          })
          datasets.push({
            type: 'line',
            xAxisID: 'x-axis-1',
            yAxisID: 'y-axis-1',
            fill: false,
            pointRadius: 0,
            borderWidth: 6,
            borderColor: color,
            data: [{x: time, y: candle.c}, {x: time, y: candle.o}],
          })
          volumeData.push(candle.volume);
        }
        datasets.push({
          type: 'bar',
          xAxisID: 'x-axis-2',
          yAxisID: 'y-axis-2',
          backgroundColor: '#eee',
          data: volumeData
        });
        return lastTime;
      },
      createGraph() {
        const startTime = this.candles.length > 0 ? this.candles[0].time : 0;
        const stepTime = this.candles.length > 1 ? this.candles[1].time - startTime : 0;
        const datasets = [];
        const lastTime = this.fillDatasets(datasets);
        const useDays = lastTime - startTime > 86400;
        const min = startTime - (stepTime / 2);
        const max = lastTime + (stepTime / 2);
        this.options.scales.xAxes[0].ticks = {
          min,
          max,
          callback: (tick, index, values) => {
            if(index === 0 || index >= values.length - 1 ) {
              return '';
            }
            const date = new Date(tick * 1000);
            let tickString = '';
            if(useDays) {
              tickString = date.toISOString().slice(5, 10);
            } else {
              tickString = date.toISOString().slice(11, 16);
            }
            return tickString;
          }
        }
        this.renderChart({ labels: [...Array(this.candles.length).keys()], datasets }, this.options)
      },
    },
    watch: {
      candles() {
        this.createGraph()
      },
    },
    mounted() {
      this.createGraph()
    },
  }
</script>
