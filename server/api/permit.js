const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { AsyncNedb } = require("nedb-async");
const fs = require("fs");
const pbkdf2 = require("crypto-js/pbkdf2");
const jsonWebToken = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET || "tacySecret";
const jwtExpire = process.env.JWT_EXPIRE || "125h";
const pwSalt = process.env.USER_PW_SALT || "tacySalt";
const hash = (email, pass) => pbkdf2(email + pass, pwSalt).toString();
const log = (msg) =>
  console.log(new Date().toISOString(), msg.toString().substring(0, 100));
const validProfileStrings = ["name"];
const roles = ["user", "", "", "", "owner"];
const roleEqualHigher = (user, testRole) =>
  roles.indexOf(user.role) >= roles.indexOf(testRole);
const databaseFileName = "db/accounts.nedb";
const MIN_EMAIL_LENGTH = 5;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PROFILE_LENGTH = 66;
let db, addApprovedAdminOnce;

const WSAuthMiddleware = (ws, req, next) => {
  const token = req?.query?.token;
  if (!token) return;
  jsonWebToken.verify(token, jwtSecret, async (err, jwt) => {
    if (err) return;
    const user = await db.asyncFindOne({ _id: jwt.uid });
    if (!user) return log("WS rejected unknown uid: " + jwt.uid);
    if (!user.approved)
      return log("WS rejected unapproved user: " + user.email);
    req.jwt = jwt;
    req.user = user;
    next();
  });
};

const authMiddleware = (req, res, next) => {
  const token = req?.headers?.["x-access-token"];
  if (!token) return res.sendStatus(401);
  jsonWebToken.verify(token, jwtSecret, async (err, jwt) => {
    if (err)
      return res.status(403).send("Browser token expired, please log in again");
    const user = await db.asyncFindOne({ _id: jwt.uid });
    if (!user) {
      log("rejected unknown uid: " + jwt.uid);
      return res.sendStatus(403);
    }
    if (!user.approved) {
      log("rejected unapproved user: " + user.email);
      return res.sendStatus(403);
    }
    req.jwt = jwt;
    req.user = user;
    next();
  });
};

router.get("/", authMiddleware, (req, res) => {
  log("GET all from: " + req.jwt.uid);
  delete req.user.password;
  delete req.user.approved;
  res.json(req.user);
});

const createUserLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 2 });
router.post("/createUser", createUserLimiter, async (req, res) => {
  //if(spamProtect(req)) return res.sendStatus(429)
  const { body } = req;
  if (badField(body.email, MIN_EMAIL_LENGTH)) return res.sendStatus(417);
  if (badField(body.password, MIN_PASSWORD_LENGTH)) return res.sendStatus(417);
  const newUser = {
    email: body.email.trim().toLowerCase(),
    password: body.password,
  };
  if (!parseProfileStrings(body, newUser)) return res.sendStatus(417);
  const existingEmail = await db.asyncFindOne({ email: newUser.email });
  if (existingEmail) {
    if (existingEmail.approved) {
      log("account exists, already approved: " + newUser.email);
      return res.send(
        "Your account already exists and is approved! Please log in."
      );
    }
    log(
      "account exists, ignored: " + newUser.email + " uid: " + existingEmail._id
    );
    return res.send(
      "Account is waiting for approval. The server admin will contact you."
    );
  }
  newUser.password = hash(newUser.email, newUser.password);
  if (addApprovedAdminOnce) {
    addApprovedAdminOnce = false;
    newUser.approved = true;
    newUser.role = "owner";
  } else {
    newUser.approved = false;
    newUser.role = "user";
  }
  newUser.created = Date.now();
  const { _id: uid } = await db.asyncInsert(newUser);
  log(newUser.role + " added: " + newUser.email + " uid: " + uid);
  if (newUser.approved) {
    res.send("Account created and verified! Please log in.");
  } else {
    res.send(
      "Thanks for your registration. The server admin will contact you."
    );
  }
});

router.post("/login", async (req, res) => {
  //if(spamProtect(req)) return res.sendStatus(429)
  const { body } = req;
  if (badField(body.email, MIN_EMAIL_LENGTH)) return res.sendStatus(417);
  if (badField(body.password, MIN_PASSWORD_LENGTH)) return res.sendStatus(417);
  const logUser = {
    email: body.email.trim().toLowerCase(),
    password: body.password,
  };
  const existingUser = await db.asyncFindOne({ email: logUser.email });
  if (!existingUser) {
    log("unknown e-mail: " + logUser.email);
    return res.status(401).send("Unknown combination of e-mail and password");
  }
  const passHash = hash(logUser.email, logUser.password);
  if (existingUser.password !== passHash) {
    log("bad password from: " + logUser.email);
    return res.status(401).send("Unknown combination of e-mail and password");
  }
  if (!existingUser.approved) {
    log("account not approved: " + logUser.email);
    return res.status(401).send("Your account was not yet approved");
  }
  log("login success: " + logUser.email + " uid: " + existingUser._id);
  const token = jsonWebToken.sign({ uid: existingUser._id }, jwtSecret, {
    expiresIn: jwtExpire,
  });
  delete existingUser.password;
  delete existingUser.approved;
  res.json({ token, ...existingUser });
});

router.post("/changeUserinfo", authMiddleware, async (req, res) => {
  const { body, user } = req;
  if (badField(body.password, MIN_PASSWORD_LENGTH)) return res.sendStatus(417);
  const passHash = hash(user.email, body.password);
  if (user.password !== passHash) {
    log("changeinfo: bad old password from: " + user.email);
    return res
      .status(401)
      .send("Incorrect old password for user: " + user.email);
  }
  const modUser = {};
  if (!parseProfileStrings(body, modUser)) return res.sendStatus(417);
  if ("email" in body) {
    if (badField(body.email, MIN_EMAIL_LENGTH)) return res.sendStatus(417);
    modUser.email = body.email.trim().toLowerCase();
    const existingEmail = await db.asyncFindOne({ email: modUser.email });
    if (existingEmail && existingEmail._id !== user._id) {
      log("changeinfo: new e-mail already exists");
      return res
        .status(401)
        .send("New email already exists, please choose another.");
    }
    if (!("newPassword" in body)) {
      log("changeinfo: tried to change email without password");
      return res
        .status(401)
        .send("Please provide any new password when changing your e-mail");
    }
  }
  if ("newPassword" in body) {
    if (badField(body.newPassword, MIN_PASSWORD_LENGTH))
      return res.sendStatus(417);
    const email = modUser.email ? modUser.email : user.email;
    modUser.password = hash(email, body.newPassword);
  }
  if (Object.keys(modUser).length === 0) {
    log("changed nothing for: " + user.email);
    return res.status(401).send("User info unchanged!");
  }
  await db.asyncUpdate({ _id: user._id }, { $set: modUser });
  log("changed user fields: " + Object.keys(modUser) + " for uid: " + user._id);
  res.send("Your user information was changed successfully.");
});

router.get("/wipeDB", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  formatDB();
  res.send("Database wiped!");
});

router.get("/dumpDB", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  log("dumped db to: " + req.user.email);
  res.json(await db.asyncFind({}));
});

router.get("/listUsers", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  log("listUsers requested by: " + req.user.email);
  res.json(await db.asyncFind({ email: { $exists: true } }));
});

router.get("/backupDB", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  const backupFileName =
    new Date().toISOString().substring(0, 10) + "_" + databaseFileName;
  try {
    await compactDB();
    fs.copyFileSync(databaseFileName, backupFileName);
  } catch (err) {
    return res.sendStatus(400).send("Failed to backup database!");
  }
  log("database backup executed for: " + req.user.email);
  res.send("Database backup saved as: " + backupFileName);
});

router.post("/resetPass", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  if (badField(req.body.password, MIN_PASSWORD_LENGTH))
    return res.sendStatus(417);
  const target = await getTargetUser(req, res);
  if (!target) return;
  newPassHash = hash(target.email, req.body.password);
  await db.asyncUpdate(
    { _id: target._id },
    { $set: { password: newPassHash } }
  );
  log("reset password for: " + target.email);
  res.send("Password was reset for: " + target.email);
});

router.post("/toggleApproved", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  const target = await getTargetUser(req, res);
  if (!target) return;
  const newStatus = !target.approved;
  await db.asyncUpdate({ _id: target._id }, { $set: { approved: newStatus } });
  log(
    "approved status set to " +
      newStatus +
      " for user: " +
      target.email +
      " by: " +
      req.user.email
  );
  res.send("User approved status set to: " + newStatus);
});

router.post("/deleteUser", authMiddleware, async (req, res) => {
  if (!roleEqualHigher(req.user, "owner")) return res.sendStatus(403);
  const target = await getTargetUser(req, res);
  if (!target) return;
  await db.asyncRemove({ _id: target._id });
  log("user " + target.email + " was deleted by: " + req.user.email);
  res.send("User " + target.email + " was deleted");
});

//
// Helpers
//

const getDB = () => db;

const openDB = () => {
  db = new AsyncNedb({ filename: databaseFileName });
  db.loadDatabase();
  db.persistence.setAutocompactionInterval(5000);
  log("nedb opened");
  checkAdminNeeded();
};

const closeDB = async () => {
  db.persistence.stopAutocompaction();
  await compactDB().catch(() => {});
};

const checkAdminNeeded = async () => {
  const count = await db.asyncCount({ email: { $exists: true } });
  if (count < 1) {
    log("WARNING: will add first user as an approved admin!");
    addApprovedAdminOnce = true;
  } else {
    addApprovedAdminOnce = false;
  }
};

const compactDB = async () => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      log("nedb timeout error!");
      reject("nedbTimeout");
    }, 8000);
    let runOnce = true;
    db.on("compaction.done", () => {
      if (!runOnce) return;
      runOnce = false;
      clearTimeout(timer);
      log("nedb compaction.done");
      resolve();
    });
    db.persistence.compactDatafile();
  });
};

const formatDB = async () => {
  await db.asyncRemove({}, { multi: true });
  log("database wiped !!!");
  checkAdminNeeded();
};

const badField = (field, min = 0) => {
  if (typeof field !== "string") return true;
  if (field.length < min) return true;
  if (field.length > MAX_PROFILE_LENGTH) return true;
  return false;
};

const parseProfileStrings = (body, user) => {
  for (const key of validProfileStrings) {
    if (key in body) {
      if (badField(body[key])) return false;
      user[key] = body[key].trim();
    }
  }
  return true;
};

const getTargetUser = async (req, res) => {
  let target = null;
  if ("uid" in req.body) {
    target = await db.asyncFindOne({ _id: req.body.uid });
  } else if ("email" in req.body) {
    target = await db.asyncFindOne({ email: req.body.email });
  }
  if (!target) {
    res.status(404).send("Target user not found");
    return null;
  }
  if (roleEqualHigher(target, req.user.role)) {
    log(
      "denied " +
        req.url.substring(1) +
        " for: " +
        target.email +
        " by: " +
        req.user.email
    );
    res.status(403).send("Refused to modify role: " + target.role);
    return null;
  }
  return target;
};

module.exports = {
  router,
  openDB,
  getDB,
  closeDB,
  authMiddleware,
  WSAuthMiddleware,
};
