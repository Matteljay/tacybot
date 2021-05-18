import axios from 'axios'
import UserPermit from './UserPermit'
const state = {
  currentView: '',
  popup: { msg: '', delay: 5000, color: 'green', show: false },
  popupTimer: null,
  listContent: {
    currentPortfolioIndex: 0,
    portfolios: [{
      name: 'Main List',
      pairs: [ { pair: 'btcusdt', comment: '' }, { pair: 'ethusdt', comment: '' } ]
    }],
  },
  tradeContent: {
    trades: [],
  },
  remoteStorageTimer: null,
  backendSynced: true,
  loadingTrade: false,
  infoDialog: '',
}

const getters = {
  getInfoDialog: () => state.infoDialog,
  getCurrentView: () => state.currentView,
  getPopup: () => state.popup,
  getBackendSynced: () => state.backendSynced,
  getListContent: () => state.listContent,
  getTradeContent: () => state.tradeContent,
  getLoadingTrade: () => state.loadingTrade,
}

const mutations = {
  infoDialog: (state, args) => state.infoDialog = args,
  setCurrentView: (state, args) => state.currentView = args,
  setPopup: (state, args) => {
    if(!args) state.popup.show = false
    else state.popup = { ...args, show: true }
  },
  popupTimer: (state, args) => {
    if(args === null) clearTimeout(state.popupTimer)
    else state.popupTimer = args
  },
  setBackendSynced: (state, args) => state.backendSynced = args,
  setTrades: (state, args) => state.tradeContent.trades = args,
  setTradeContent: (state, args) => state.tradeContent = args,
  setLoadingTrade: (state, args) => state.loadingTrade = args,
  extractListContent: (state, args) => {
    if(!isNaN(args.currentPortfolioIndex) && args.portfolios && args.portfolios.length > 0) {
      state.listContent.currentPortfolioIndex = args.currentPortfolioIndex
      state.listContent.portfolios = args.portfolios
    }
    delete args.currentPortfolioIndex
    delete args.portfolios
  },
  insertPair: (state, args) => {
    const currentIndex = state.listContent.currentPortfolioIndex
    state.listContent.portfolios[currentIndex].pairs.splice(
      args.pos, 0, args.item
    )
  },
  deletePair: (state, args) => {
    const currentIndex = state.listContent.currentPortfolioIndex
    state.listContent.portfolios[currentIndex].pairs.splice(args, 1)
  },
  addComment: (state, args) => {
    const currentIndex = state.listContent.currentPortfolioIndex
    state.listContent.portfolios[currentIndex].pairs[args.index].comment = args.comment
  },
  setPortfolioIndex: (state, args) => {
    state.listContent.currentPortfolioIndex = args
  },
  deletePortfolio: (state) => {
    let currentIndex = state.listContent.currentPortfolioIndex
    state.listContent.portfolios.splice(currentIndex, 1)
    // check list limit
    const numPortfolios = state.listContent.portfolios.length
    if(numPortfolios <= currentIndex) currentIndex--
    if(currentIndex < 0) currentIndex = null // should not be possible (length is checked in template)
    state.listContent.currentPortfolioIndex = currentIndex
  },
  addPortfolio: (state, args) => {
    state.listContent.portfolios.push(args)
    state.listContent.currentPortfolioIndex = state.listContent.portfolios.length - 1
  },
  renamePortfolio: (state, args) => {
    const currentIndex = state.listContent.currentPortfolioIndex
    state.listContent.portfolios[currentIndex].name = args
  },
  newRemoteTimer: (state, args) => {
    clearTimeout(state.remoteStorageTimer)
    state.remoteStorageTimer = setTimeout(args, 4000)
  }
}

const actions = {
  popup({ commit }, payload) {
    commit('popupTimer', null)
    commit('setPopup', payload)
    commit('popupTimer', setTimeout(() => commit('setPopup', null), payload.delay || 5000))
  },
  remoteStoragePush({ commit, dispatch }, payload) {
    commit('setBackendSynced', false)
    commit('newRemoteTimer', async () => {
      try {
        const response = await axios.post('/api/content/store', payload, UserPermit.getters.getLocalAxiosConfig())
        commit('setBackendSynced', true)
        return response.data
      } catch(err) {
        const msg = err.response?.data || err.response?.statusText ||
          err.message || JSON.stringify(err)
        dispatch('popup', { msg, color: 'red' })
        return null
      }
    })
  },
}

export default {
  state,
  getters,
  mutations,
  actions
}
