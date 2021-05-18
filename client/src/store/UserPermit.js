import axios from 'axios'

const state = {
  userinfo: {},
  localAxiosConfig: { headers: { 'x-access-token': '' }},
}

const getters = {
  getUserinfo: () => state.userinfo,
  getLocalAxiosConfig: () => state.localAxiosConfig,
  getToken: () => state.localAxiosConfig.headers['x-access-token'],
}

const mutations = {
  setUserinfo: (state, args) => state.userinfo = args,
  setAuthHeader: (state, token) => state.localAxiosConfig.headers['x-access-token'] = token,
}

const actions = {
  async upGetURL({ dispatch }, payload) {
    try {
      const response = await axios.get('/api/permit/' + payload.url, getters.getLocalAxiosConfig())
      return response.data
    } catch(err) {
      const msg = err.response?.data || err.response?.statusText ||
        err.message || JSON.stringify(err)
      dispatch('popup', { msg, color: 'red' })
      return null
    }
  },
  async upPayloadAction({ dispatch }, payload) {
    try {
      const url = payload.url
      delete payload.url
      const response = await axios.post('/api/permit/' + url, payload, getters.getLocalAxiosConfig())
      return response.data
    } catch(err) {
      const msg = err.response?.data || err.response?.statusText ||
        err.message || JSON.stringify(err)
      dispatch('popup', { msg, color: 'red' })
      return null
    }
  },
}

export default {
  state,
  getters,
  mutations,
  actions
}
