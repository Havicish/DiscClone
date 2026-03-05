const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { addAPIListener } = require("./server");

const accountsFilePath = path.join(__dirname, "accounts.json");

process.on("SIGINT", () => {
  saveAccounts();
  process.exit(0);
});

class Account {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.currentLoginToken = null;
    this.loginTokenExpirationDate = 0;
    this.failedLogins = 0;
    this.maxFailedLoginAttempts = 5;
    this.lockedUntil = null;
    this.servers = [];
  }

  generateNewLoginToken() {
    const daysUntilExpiration = 14;

    this.currentLoginToken = crypto.randomUUID();
    this.loginTokenExpirationDate =
      Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000;

    return this.currentLoginToken;
  }

  getLoginToken() {
    if (this.currentLoginToken && Date.now() < this.loginTokenExpirationDate)
      return this.currentLoginToken;

    return this.generateNewLoginToken();
  }

  attemptLogin(password) {
    if (this.lockedUntil && Date.now() < this.lockedUntil)
      return false;

    if (password == this.password) {
      this.failedLogins = 0;
      this.locked = false;
      this.lockedUntil = null;
      return true;
    }

    this.failedLogins++;

    if (this.failedLogins >= this.maxFailedLoginAttempts) {
      const hoursUntilUnlock = 1;
      this.lockedUntil = Date.now() + hoursUntilUnlock * 60 * 60 * 1000;
    }

    return false;
  }

  isLocked() {
    if (this.lockedUntil && Date.now() < this.lockedUntil)
      return true;
    else {
      this.failedLogins = 0;
      this.locked = false;
      this.lockedUntil = null;
    }
  }
}

let accounts = loadAccounts();

function loadAccounts() {
  if (!fs.existsSync(accountsFilePath))
    return {};

  const data = fs.readFileSync(accountsFilePath, "utf8");
  let parsedAccounts = JSON.parse(data);

  // Support older format where file could be an array
  if (Array.isArray(parsedAccounts)) {
    const obj = {};
    for (const a of parsedAccounts) {
      if (a && a.username) obj[a.username] = a;
    }
    parsedAccounts = obj;
  }

  const result = {};
  for (let username in parsedAccounts) {
    const accData = parsedAccounts[username];
    const newAccount = new Account(accData.username, accData.password);
    for (let key in accData) {
      if (key in newAccount)
        newAccount[key] = accData[key];
    }
    result[newAccount.username] = newAccount;
  }

  return result;
}

function saveAccounts() {
  fs.writeFileSync(
    accountsFilePath,
    JSON.stringify(accounts, null, 2)
  );
}

function findAccountByUsername(username) {
  return accounts[username] || null;
}

function findAccountByLoginToken(token) {
  for (const username in accounts) {
    const account = accounts[username];
    if (account.currentLoginToken === token)
      return account;
  }

  return null;
}

function sendJson(res, obj) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

addAPIListener("/createAccount", (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    const data = JSON.parse(body);
    const username = data.username;
    const password = data.password;

    if (!username || !password)
      return sendJson(res, { success: false, message: "Missing fields" });

    if (findAccountByUsername(username))
      return sendJson(res, { success: false, message: "Username already exists" });

    const newAccount = new Account(username, password);
    accounts[username] = newAccount;
    saveAccounts();

    return sendJson(res, { success: true, loginToken: newAccount.getLoginToken() });
  });
});

addAPIListener("/login", (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    const data = JSON.parse(body);
    const username = data.username;
    const password = data.password;

    if (!username || !password)
      return sendJson(res, { success: false, message: "Missing fields" });

    const account = findAccountByUsername(username);

    if (!account)
      return sendJson(res, { success: false, message: "Invalid username or password" });

    if (!account.attemptLogin(password)) {
      saveAccounts();
      if (!account.isLocked())
        return sendJson(res, { success: false, message: "Invalid username or password" });
      else {
        const dateObj = new Date(account.lockedUntil);
        return sendJson(res, { success: false, message: `Account locked until: ${dateObj.toLocaleString()}` });
      }
    }

    const token = account.getLoginToken();
    saveAccounts();

    return sendJson(res, { success: true, loginToken: token });
  });
});

addAPIListener("/getAccountInfo", (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    const data = JSON.parse(body);
    const token = data.loginToken;

    if (!token)
      return sendJson(res, { success: false, message: "Missing login token" });

    const account = findAccountByLoginToken(token);

    if (!account)
      return sendJson(res, { success: false, message: "Invalid login token" });

    return sendJson(res, { success: true, username: account.username });
  });
});

module.exports = {
  findAccountByLoginToken,
  findAccountByUsername,
  saveAccounts
};
