// TODO: Rework login tokens, and add session tokens.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { addAPIListener } = require("./server");
const globalAccountsDirPath = require("./server").globalAccountsDirPath;

if (!fs.existsSync(globalAccountsDirPath)) {
  fs.mkdirSync(globalAccountsDirPath);
}

// for (let accountFile of fs.readdirSync(globalAccountsDirPath)) {
//   if (accountFile.endsWith(".json")) {
//     const filePath = path.join(globalAccountsDirPath, accountFile);
//     const newPath = path.join(globalAccountsDirPath, accountFile.toLowerCase());

//     fs.renameSync(filePath, newPath);
//   }
// }

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
    this.usernameColor = "#fff";
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
    const localPath = path.join(globalAccountsDirPath, `${this.username.toLowerCase()}.json`);
    if (!localPath.startsWith(globalAccountsDirPath)) {
      console.error("Something has bypassed the username sanitization! Account not saved.");
      console.error(`Username: ${this.username}`);
      return;
    }
    fs.writeFileSync(localPath, JSON.stringify(this, null, 2));
  }
}

function findAccountByUsername(username) {
  username = username.toLowerCase();
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

function getAndValidateAccount(username, loginToken, res) {
  const account = findAccountByUsername(username);
  if (!account) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: "Account not found" }));
    return null;
  }

  if (!account.isLoginTokenValid(loginToken)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: "Invalid token" }));
    return null;
  }

  return account;
}

addAPIListener("/createAccount", false, (data, _) => {
  const username = data.username;
  const password = data.password;

  if (!username || !password) {
    return { code: 400, message: "Missing fields" };
  }

  if (username.length > 30) {
    return { code: 400, message: "Invalid username; Username cannot be more than 30 characters" };
  }

  const regex0 = /[^a-z0-9]/ig;
  if (username.match(regex0)) {
    return { code: 400, message: "Invalid username; Username must be alphanumeric" };
  }

  // Sanatise username and password.
  // If the username escapes the accounts directory, return an error.
  const tempLocalPath = path.join(globalAccountsDirPath, `${username.toLowerCase()}.json`);
  if (!tempLocalPath.startsWith(globalAccountsDirPath)) {
    return { code: 400, message: "Invalid username" };
  }

  if (findAccountByUsername(username)) {
    return { code: 400, message: "Username already taken" };
  }

  const newAccount = new Account(username, password);
  const loginToken = newAccount.getLoginToken();
  newAccount.save();

  return { code: 200, message: "Account created successfully", body: { loginToken } };
});

addAPIListener("/login", false, (data, _) => {
  const username = data.username;
  const password = data.password;

  if (!username || !password) {
    return { code: 400, message: "Missing fields" };
  }

  const account = findAccountByUsername(username);

  if (!account) {
    return { code: 401, message: "Invalid username or password" };
  }

  if (!account.attemptLogin(password)) {
    account.save();
    if (!account.isLocked()) {
      return { code: 401, message: "Invalid username or password" };
    } else {
      const dateObj = new Date(account.lockedUntil);
      return { code: 403, message: `Account locked until: ${dateObj.toLocaleString()}` };
    }
  }

  const token = account.getLoginToken();
  account.save();

  return { code: 200, message: "Login successful", body: { loginToken: token } };
});

addAPIListener("/validateToken", true, (data, account) => {
  return { code: 200, message: "Account found", body: { username: account.username } };
});

addAPIListener("/getAccountInfo", false, (data, _) => {
  const username = data.username;

  const account = findAccountByUsername(username);

  if (!account) {
    return { code: 404, message: "Account not found" };
  }

  return { code: 200, message: "Account found", body: { username: account.username } };
});

addAPIListener("/saveAccountChanges", true, (data, account) => {
  account.usernameColor = data.usernameColor;
  account.save();

  return { code: 200, message: "Account changes saved" };
});

module.exports = {
  findAccountByUsername,
  getAndValidateAccount
};
