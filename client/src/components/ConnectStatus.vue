<template>
  <v-card class="py-2" flat>
    <p>
      <template v-if="connectStatus === show.CONNECTING">
        Binance price feed: Connecting
      </template>
      <template v-else-if="connectStatus === show.CONNECTED">
        Binance price feed: <span style="color: green">Connected</span>
      </template>
      <template v-else>
        Binance price feed: <span style="color: darkred">NOT connected</span>
        (<a href=".">refresh page</a>)
      </template>
    </p>
  </v-card>
</template>

<script>
const show = {
  CONNECTING: 0,
  CONNECTED: 1,
  DISCONNECTED: 2,
}
export default {
  data: () => ({
    show,
    connectStatus: show.CONNECTING,
    socketTimer: null,
    lastUpdate: 0,
    socket: null,
  }),
  methods: {
    isConnected() {
      return this.socket.readyState === WebSocket.OPEN
    },
    renew() {
      this.destroy()
      this.create()
    },
    destroy() {
      if(this.socketTimer) {
        clearInterval(this.socketTimer)
      }
      this.socket.close()
    },
    create() {
      this.socket = new WebSocket("wss://stream.binance.com/stream");
      this.socket.onmessage = (e) => {
        this.lastUpdate = Date.now();
        this.connectStatus = show.CONNECTED;
        this.$emit('message', e)
      };
      this.socket.onopen = () => {
        this.$emit('open', this.socket)
      };
      this.socketTimer = setInterval(() => {
        if (this.socket.readyState === WebSocket.CONNECTING) {
          this.connectStatus = show.CONNECTING;
        } else if (this.socket.readyState === WebSocket.OPEN) {
          this.connectStatus = Date.now() - this.lastUpdate < 11000 ? show.CONNECTED : show.DISCONNECTED;
        } else {
          this.connectStatus = show.DISCONNECTED;
        }
      }, 3000);
    },
  },
  destroyed() {
    this.destroy()
  },
  created() {
    this.create()
  },
}
</script>

<style scoped>

</style>
