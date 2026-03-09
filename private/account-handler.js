// TODO: Rework login tokens, and add session tokens.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { addAPIListener } = require("./server");
const globalAccountsDirPath = require("./server").globalAccountsDirPath;

if (!fs.existsSync(globalAccountsDirPath)) {
  fs.mkdirSync(globalAccountsDirPath);
}

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

  isLoginTokenValid(token) {
    return token == this.currentLoginToken;
  }

  save() {
    fs.writeFileSync(path.join(globalAccountsDirPath, `${this.username}.json`), JSON.stringify(this, null, 2));
  }
}

function findAccountByUsername(username) {
  const localPath = path.join(globalAccountsDirPath, `${username}.json`);

  if (!fs.existsSync(localPath))
    return null;

  const file = fs.readFileSync(localPath, "utf8");
  const data = JSON.parse(file);
  const account = new Account(data.username, data.password);
  for (const key in data) {
    account[key] = data[key];
  }
  return account;
}

addAPIListener("/createAccount", (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid JSON" }));
      return;
    }
    const username = data.username;
    const password = data.password;

    if (!username || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Missing fields" }));
      return;
    }

    // Sanatise username and password.
    // If the username escapes the accounts directory, return an error.
    const tempLocalPath = path.join(globalAccountsDirPath, `${username}.json`);
    if (!tempLocalPath.startsWith(globalAccountsDirPath)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid username" }));
      return;
    }

    if (findAccountByUsername(username)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Username already taken" }));
      return;
    }

    const newAccount = new Account(username, password);
    const loginToken = newAccount.getLoginToken();
    newAccount.save();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, loginToken }));
    return;
  });
});

addAPIListener("/login", (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid JSON" }));
      return;
    }
    const username = data.username;
    const password = data.password;

    if (!username || !password) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }

    const account = findAccountByUsername(username);

    if (!account) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid username or password" }));
      return;
    }

    if (!account.attemptLogin(password)) {
      account.save();
      if (!account.isLocked()) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: "Invalid username or password" }));
        return;
      } else {
        const dateObj = new Date(account.lockedUntil);
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: `Account locked until: ${dateObj.toLocaleString()}` }));
        return;
      }
    }

    const token = account.getLoginToken();
    account.save();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "success", loginToken: token }));
    return;
  });
});

addAPIListener("/getAccountInfo", (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid JSON" }));
      return;
    }
    const username = data.username;

    const account = findAccountByUsername(username);

    if (!account) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Account not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "success", username: account.username }));
    return;
  });
});

module.exports = {
  findAccountByUsername
};
