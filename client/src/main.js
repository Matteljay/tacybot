import Vue from 'vue'
import App from './App.vue'
import store from './store/store'
import vuetify from './plugins/vuetify';
import VueClipboard from 'vue-clipboard2'

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.use(VueClipboard)

new Vue({
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')
