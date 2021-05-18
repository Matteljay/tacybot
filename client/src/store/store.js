import Vue from 'vue'
import Vuex from 'vuex'
import UserPermit from './UserPermit'
import Content from './Content'

Vue.use(Vuex)

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  state: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    UserPermit,
    Content,
  }
})
