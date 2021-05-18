const WebSocket = require('ws')
const axios = require('axios')
const permit = require('./permit')
const db = permit.getDB()
const hmac_sha256 = require('crypto-js/hmac-sha256')
const log = (msg) => console.log(new Date().toISOString(), msg.toString().substring(0, 100))
const debug = (msg) => false && log(msg)
this.connectedUsers = []
this.priceLookup = []

const executeTradeError = (message) => {
  log('executeTrade error: ' + message)
  return { err: message }
}

const executeTrade = async (sell, pair, amount, keys) => {
  const side = sell ? 'SELL' : 'BUY'
  log(`executeTrade: ${side} ${pair} ${amount}`)
  if(!keys?.APIkey1 || !keys.APIkey2) return executeTradeError('API keys are required')
  const time = Date.now()
  const msg = `symbol=${pair}&side=${side}&type=MARKET&quantity=${amount}&recvWindow=9000&timestamp=${time}`
  const signature = hmac_sha256(msg, keys.APIkey2).toString()
  const signedMsg = msg + '&signature=' + signature
  try {
    const response = await axios.post('https://api.binance.com/api/v3/order',
      signedMsg, { headers: { 'X-MBX-APIKEY': keys.APIkey1 }})
    //console.log(response.data) //DEBUG
    const volume = response.data?.executedQty
    if(!volume) return executeTradeError('No processed trade volume received!')
    return { volume }
  } catch(e) {
    return executeTradeError(e.response?.data?.msg || JSON.stringify(e))
  }
}

const trailingStage = async (trade, currentPrice, keys) => {
  if(!trade.peekPrice) {
    trade.peekPrice = currentPrice
    return true
  }
  if(trade.sell) {
    if(currentPrice < trade.peekPrice * (1 - trade.percent / 100)) {
      trade.active = false
      const useVolume = trade.type === 'tmit' ? trade.volumeReserved : trade.volume
      debug('trail: ' + currentPrice)
      const { volume, err } = await executeTrade(true, trade.pair, useVolume, keys)
      if(volume) trade.volumeFinished = volume
      if(err) trade.error = err
      trade.priceFinished = currentPrice
      trade.finished = true
      return true
    }
    // update peek value
    if(currentPrice > trade.peekPrice) {
      trade.peekPrice = currentPrice
      return true
    }
  } else {
    if(currentPrice > trade.peekPrice * (1 + trade.percent / 100)) {
      trade.active = false
      const useVolume = trade.type === 'tmit' ? trade.volumeReserved : trade.volume
      debug('trail: ' + currentPrice)
      const { volume, err } = await executeTrade(false, trade.pair, useVolume, keys)
      if(volume) trade.volumeFinished = volume
      if(err) trade.error = err
      trade.priceFinished = currentPrice
      trade.finished = true
      return true
    }
    // update peek value
    if(currentPrice < trade.peekPrice) {
      trade.peekPrice = currentPrice
      return true
    }
  }
  return false // returns dbUpdateNeeded
}

const entryStage = async (trade, currentPrice, keys) => {
  let tradeResponse = {}
  if(trade.sell && currentPrice < trade.enterPrice) {
    debug('entry: ' + currentPrice)
    tradeResponse = await executeTrade(true, trade.pair, trade.volume, keys)
  } else if (!trade.sell && currentPrice > trade.enterPrice) {
    debug('entry: ' + currentPrice)
    tradeResponse = await executeTrade(false, trade.pair, trade.volume, keys)
  } else {
    return false
  }
  if(trade.type === 'tmit') trade.sell = !trade.sell
  if(tradeResponse.err) {
    trade.error = tradeResponse.err
    trade.finished = true
    return true
  }
  if(tradeResponse.volume) {    
    trade.peekPrice = currentPrice
    if(trade.type === 'mit') {
      trade.volumeFinished = tradeResponse.volume
      trade.finished = true
    } else {
      trade.volumeReserved = tradeResponse.volume
      trade.active = true
    }
    return true
  }
  log('entryStage: unknown error')
  return false // returns dbUpdateNeeded
}

const singleTradeCheck = async (trade, keys) => {
  const currentPrice = this.priceLookup[trade.pair]
  if(isNaN(currentPrice)) return // No price data received yet
  //console.log('mainTimer:', trade.pair, currentPrice) // DEBUG Ticker mainTimer
  if(trade.active) {
    const dbUpdate = await trailingStage(trade, currentPrice, keys)
    return dbUpdate
  } else {
    const dbUpdate = await entryStage(trade, currentPrice, keys)
    return dbUpdate
  }
}

const tradeContentPerUser = async (tradeContent) => {
  let dbUpdateNeeded = false
  const keys = tradeContent.keys
  // Check trades for this user and trigger buy/sell
  for(const trade of tradeContent.trades) {
    if(trade.finished) continue
    dbUpdateNeeded = await singleTradeCheck(trade, keys)
  }
  if(!dbUpdateNeeded) return
  await db.asyncUpdate({ trader_uid: tradeContent.trader_uid }, { $set: { trades: tradeContent.trades } })
  // Message users from the connectedUsers
  //console.log(this.connectedUsers) //DEBUG
  const onlineUser = this.connectedUsers.find(trader =>
    trader.uid === tradeContent.trader_uid && trader.ws.readyState === WebSocket.OPEN)
  if(onlineUser) onlineUser.ws.send(JSON.stringify({ trades: tradeContent.trades }))
}

const pullAccountInfo = async (keys) => {
  if(!keys.APIkey1 || !keys.APIkey2) return 'Binance login keys not found'
  const time = Date.now()
  const msg = `recvWindow=9000&timestamp=${time}`
  const signature = hmac_sha256(msg, keys.APIkey2).toString()
  const signedMsg = msg + '&signature=' + signature
  try {
    const response = await axios.get('https://api.binance.com/sapi/v1/capital/config/getall?' + signedMsg,
      { headers: { 'X-MBX-APIKEY': keys.APIkey1 }})
    return { wallet: response.data.filter(e => e.free > 0) }
  } catch(error) {
    return error.response?.data?.msg || JSON.stringify(error)
  }
}

const mainTimer = async () => {
  // Pool trades from all users
  const aggTradeContents = await db.asyncFind({ trader_uid: { $exists: true } })
  // Make sure prices get updated via subscriptions
  refreshSubscriptions(aggTradeContents)
  // Clean up inactive sockets
  this.connectedUsers = this.connectedUsers.filter(e => e.ws.readyState === WebSocket.OPEN)
  // For every tradeContents in the database
  for(const tradeContent of aggTradeContents) {
    await tradeContentPerUser(tradeContent)
  }
}

const pushConnection = (payload) => {
  this.connectedUsers.push(payload)
}

const bnbMessageReceived = (msg) => {
  if(!msg.data) return
  try {
    msgObject = JSON.parse(msg.data)
  } catch(error) { return }
  if(!msgObject.stream?.includes("@ticker") || !msgObject.data?.s) return
  const { s: pair, c: price } = msgObject.data
  this.priceLookup[pair] = price
  //console.log(this.priceLookup) // DEBUG Ticker
}

const getAllPairsUnique = (aggTradeContents) => {
  const stripped = aggTradeContents.flatMap(user =>
    user.trades.flatMap(trade => trade.finished ? [] : trade.pair))
  /*const stripped = [].concat(...aggTradeContents.map(user =>
    user.trades.flatMap(trade => trade.finished ? trade.pair : [])))*/
  return [...new Set(stripped)]
}

const refreshSubscriptions = (aggTradeContents) => {
  // First time
  if(!this.currentPairs) this.currentPairs = []
  // Get situation
  const neededPairs = getAllPairsUnique(aggTradeContents)
  // Build arrays
  const delPairs = this.currentPairs.filter(pair => !neededPairs.includes(pair))
  const addPairs = neededPairs.filter(pair => !this.currentPairs.includes(pair))
  // Build messages & send
  if(delPairs.length) {
    const delMessage = { method: 'UNSUBSCRIBE', params: delPairs.map(p => p.toLowerCase() + '@ticker'), id: 1 }
    this.bnbSocket.send(JSON.stringify(delMessage))
  }
  if(addPairs.length) {
    const addMessage = { method: 'SUBSCRIBE', params: addPairs.map(p => p.toLowerCase() + '@ticker'), id: 1 }
    this.bnbSocket.send(JSON.stringify(addMessage))
  }  
  // Remember for next refresh
  this.currentPairs = [ ...neededPairs ]
}

const openSocketAndSubscribe = () => {
  if(this.bnbSocket?.readyState === WebSocket.OPEN) {
    this.bnbSocket.close()
  }
  log('Opening socket to Binance')
  this.bnbSocket = new WebSocket('wss://stream.binance.com/stream')
  this.bnbSocket.onopen = async () => {
    const aggTradeContents = await db.asyncFind({ trader_uid: { $exists: true } })
    refreshSubscriptions(aggTradeContents)
  }
  this.bnbSocket.onmessage = msg => bnbMessageReceived(msg)
  this.bnbSocket.onclose = () => {
    // 'onclose' will get triggered if reconnect failed
    this.bnbSocket = null
    setTimeout(openSocketAndSubscribe, 5000)
  }
}

openSocketAndSubscribe()
//if(!this.watchdogTimer) this.watchdogTimer = setInterval(theWatchdog, 5000)
if(!this.mainTimer_instance) this.mainTimer_instance = setInterval(mainTimer, 5000)
module.exports = { pushConnection, executeTrade, pullAccountInfo }
