const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { addAPIListener } = require("./server");

const accountsFilePath = path.join(__dirname, "accounts.json");

class Account {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.currentLoginToken = null;
    this.loginTokenExpirationDate = 0;
    this.failedLogins = 0;
    this.maxFailedLoginAttempts = 5;
    this.lockedUntil = null;
  }

  generateNewLoginToken() {
    const daysUntilExpiration = 14;

    this.currentLoginToken = crypto.randomUUID();
    this.loginTokenExpirationDate =
      Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000;

    return this.currentLoginToken;
  }

  attemptLogin(password) {
    if (this.lockedUntil && Date.now() < this.lockedUntil)
      return false;

    if (password == this.password) {
      this.failedLogins = 0;
      return true;
    }

    this.failedLogins++;

    if (this.failedLogins >= this.maxFailedLoginAttempts) {
      const hoursUntilUnlock = 1;
      this.lockedUntil = Date.now() + hoursUntilUnlock * 60 * 60 * 1000;
    }

    return false;
  }
}

let accounts = loadAccounts();

function loadAccounts() {
  if (!fs.existsSync(accountsFilePath))
    return [];

  const data = fs.readFileSync(accountsFilePath, "utf8");
  return JSON.parse(data);
}

function saveAccounts() {
  fs.writeFileSync(
    accountsFilePath,
    JSON.stringify(accounts, null, 2)
  );
}

function findAccountByUsername(username) {
  for (const key in accounts) {
    const acc = accounts[key];

    if (acc.username == username) {
      return acc;
    }
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

    return sendJson(res, { success: true });
  });
});