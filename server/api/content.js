const express = require("express");
const router = express.Router();
const permit = require("./permit");
const db = permit.getDB();
const axios = require("axios");
const log = (msg) =>
  console.log(new Date().toISOString(), msg.toString().substring(0, 100));
const trader = require("./trader");
const MAX_TRADES = 16;
const userSocketSpam = [];

const pick = (subsObject, props) => {
  for (const k in subsObject) if (!props.includes(k)) delete subsObject[k];
};

const getPrice = async (pair) => {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price?symbol=" + pair
    );
    return response.data?.price;
  } catch (error) {
    log(error.response?.data?.msg || JSON.stringify(error));
    return null;
  }
};

// create creation date, check validity
const validateNewTrade = async (trade) => {
  if (!trade) return "Trade not specified!";
  if (!trade.created) trade.created = Date.now();
  const baseKeys = ["finished", "created", "type", "pair", "volume", "sell"];
  trade.pair = trade.pair.trim().toUpperCase();
  const price = await getPrice(trade.pair);
  if (!price) return "Pair not found: '" + trade.pair.substring(0, 10) + "'";
  trade.volume = parseFloat(trade.volume);
  switch (trade.type) {
    case "mkt":
      pick(trade, baseKeys);
      break;
    case "mit":
      pick(trade, baseKeys.concat(["enterPrice"]));
      trade.enterPrice = parseFloat(trade.enterPrice);
      if (!trade.sell && trade.enterPrice <= price)
        return "Buy would trigger instantly, use 'mkt'";
      if (trade.sell && price <= trade.enterPrice)
        return "Sell would trigger instantly, use 'mkt'";
      break;
    case "tmkt":
      pick(trade, baseKeys.concat(["percent"]));
      trade.percent = parseFloat(trade.percent);
      trade.active = true;
      trade.enterPrice = price;
      trade.peekPrice = price;
      break;
    case "tmit":
      pick(trade, baseKeys.concat(["active", "enterPrice", "percent"]));
      trade.enterPrice = parseFloat(trade.enterPrice);
      trade.percent = parseFloat(trade.percent);
      if (!trade.sell && trade.enterPrice <= price)
        return "Buy would trigger instantly, use 'mkt'";
      if (trade.sell && price <= trade.enterPrice)
        return "Sell would trigger instantly, use 'mkt'";
      trade.peekPrice = price;
      break;
  }
};

const tradeMessageReceived = async (msg, uid) => {
  let body;
  try {
    body = JSON.parse(msg);
  } catch (e) {
    log("bad command from " + uid);
    return "bad command";
  }
  const userTradeContents = (await db.asyncFindOne({ trader_uid: uid })) || {
    trades: [],
    keys: {},
  };
  if (body.action === "delete") {
    const index = userTradeContents.trades.findIndex(
      (t) => t.created === body.created
    );
    if (index === -1) return "Not found, failed to delete";
    userTradeContents.trades.splice(index, 1);
    //
  } else if (body.action === "deleteFinished") {
    userTradeContents.trades = userTradeContents.trades.filter(
      (t) => !t.finished
    );
    //
  } else if (body.action === "edit") {
    const index = userTradeContents.trades.findIndex(
      (t) => t.created === body.trade.created
    );
    if (index === -1) return "Not found, failed to edit";
    const oldTrade = userTradeContents.trades[index];
    if (oldTrade.finished) return "Trade already finished";
    if (oldTrade.type !== body.trade.type) return "Cannot change trade type";
    if (oldTrade.sell !== body.trade.sell)
      return "Cannot change trade buy/sell";
    if (oldTrade.pair !== body.trade.pair) return "Cannot change trade pair";
    // Update most new values
    for (const key in oldTrade) {
      if (key !== "active" && !isNaN(body.trade[key]))
        oldTrade[key] = body.trade[key];
    }
    //
  } else if (body.action === "add") {
    if (userTradeContents.trades.length >= MAX_TRADES)
      return "Too many trades, please delete some";
    const errMsg = await validateNewTrade(body.trade);
    if (errMsg) return errMsg;
    if (body.trade.type === "mkt") {
      body.trade.finished = true;
      const tradeResponse = await trader.executeTrade(
        body.trade.sell,
        body.trade.pair,
        body.trade.volume,
        userTradeContents.keys
      );
      if (tradeResponse.err) return tradeResponse.err;
    } else {
      body.trade.finished = false;
    }
    userTradeContents.trades.push(body.trade);
    //
  } else if (body.action === "pushKeys") {
    if (!body.keys) return "Key update failed";
    userTradeContents.keys = {
      APIkey1: body.keys.APIkey1,
      APIkey2: body.keys.APIkey2,
    };
    await db.asyncUpdate(
      { trader_uid: uid },
      { $set: userTradeContents },
      { upsert: true }
    );
    log("ws action '" + body.action + "' for uid: " + uid);
    return { keyUpdate: true };
    //
  } else if (body.action === "getWallet") {
    if (!userTradeContents.keys) return "Please set your API keys first";
    log("wallet request from uid: " + uid);
    return await trader.pullAccountInfo(userTradeContents.keys);
    //
  } else {
    return "Invalid action received";
  }
  await db.asyncUpdate(
    { trader_uid: uid },
    { $set: userTradeContents },
    { upsert: true }
  );
  log("ws action '" + body.action + "' for uid: " + uid);
  return { trades: userTradeContents.trades }; // verification response unlocks the UI
};

const isSpamming = (uid, window) => {
  userSpamFound = userSocketSpam.find((e) => e.uid === uid);
  if (!userSpamFound) userSocketSpam.push({ uid, time: Date.now() });
  else {
    if (Date.now() - userSpamFound.time < window) {
      userSpamFound.time = Date.now();
      return "Spam ignored";
    }
    userSpamFound.time = Date.now();
  }
};

const receiver = async (msg, ws, user) => {
  const spamResponse = isSpamming(user._id, 750);
  if (spamResponse) return ws.send(spamResponse);
  const tradeMessage = await tradeMessageReceived(msg, user._id);
  //console.log(tradeMessage) //DEBUG
  if (typeof tradeMessage === "string" || tradeMessage instanceof String)
    ws.send(tradeMessage);
  else ws.send(JSON.stringify(tradeMessage));
};

router.ws("/trade", permit.WSAuthMiddleware, async (ws, req) => {
  const { user } = req;
  // start sending price updates to this user
  trader.pushConnection({ ws, uid: user._id });
  // send trade info
  const tradeContent = await db.asyncFindOne({ trader_uid: user._id });
  ws.send(JSON.stringify({ trades: tradeContent?.trades }));
  // listen for updates from client
  ws.on("message", (msg) => receiver(msg, ws, user));
  //ws.on('message', async msg => ws.send(JSON.stringify(await tradeMessageReceived(msg, user._id))))
});

router.post("/store", permit.authMiddleware, async (req, res) => {
  const { body, user } = req;
  const storageAction = getStorageType(body);
  if (!storageAction) return res.sendStatus(417);
  await db.asyncUpdate({ _id: user._id }, { $set: body });
  log(storageAction + " updated for uid: " + user._id);
  res.sendStatus(201);
});

const getStorageType = (body) => {
  if (
    Object.keys(body).length === 2 &&
    typeof body.currentPortfolioIndex === "number" &&
    Array.isArray(body.portfolios)
  ) {
    return "lists";
  }
  if (Object.keys(body).length === 1 && Array.isArray(body.trades)) {
    return "trades";
  }
  return null;
};

module.exports = { router };
