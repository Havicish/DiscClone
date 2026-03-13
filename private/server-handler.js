const fs = require("fs");
const path = require("path");
const { addAPIListener } = require("./server");
const findAccountByUsername = require("./account-handler").findAccountByUsername;
const globalServersJSONPath = require("./server").globalServersJSONPath;
const globalServersDirPath = require("./server").globalServersDirPath;

if (!fs.existsSync(globalServersDirPath)) {
  fs.mkdirSync(globalServersDirPath);
}

class Server {
  constructor() {
    this.name = "";
    this.id = null;
    this.messages = [];
    this.whitelist = [];
    this.owner = null;
  }

  loadMessages() {
    if (!fs.existsSync(globalServersJSONPath))
      return;

    const serversData = JSON.parse(fs.readFileSync(globalServersJSONPath));
    const serverData = serversData[this.id];
    if (serverData)
      this.messages = serverData.messages || [];
  }

  save() {
    const localPath = path.join(globalServersDirPath, `${this.id}.json`);
    const data = {
      name: this.name,
      id: this.id,
      messages: this.messages,
      whitelist: this.whitelist,
      owner: this.owner
    };
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
  }
}

function findServerById(id) {
  const localPath = path.join(globalServersDirPath, `${id}.json`);

  if (!fs.existsSync(localPath))
    return null;

  const file = fs.readFileSync(localPath, "utf8");

  const data = JSON.parse(file);
  const server = new Server();
  for (const key in data) {
    server[key] = data[key];
  }
  return server;
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

addAPIListener("/getServerName", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const serverId = data.serverId;
    const server = findServerById(serverId);
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    if (!server) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Server not found" }));
      return;
    }
    if (!server.whitelist.includes(data.username)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const name = server.name;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(name));
  });
});

addAPIListener("/getServers", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const serverList = account.servers.map(serverId => {
      const server = findServerById(serverId);
      return { id: serverId, name: server ? server.name : "Unknown Server", owner: server ? server.owner : "Unknown" };
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(serverList));
    return;
  });
});

addAPIListener("/createServer", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const serverName = data.name;
    if (typeof serverName !== "string" || serverName.trim() === "" || serverName.length > 60) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid server name" }));
      return;
    }
    const serverId = crypto.randomUUID();
    const newServer = new Server();
    newServer.id = serverId;
    newServer.name = serverName;
    newServer.owner = account.username;
    newServer.whitelist.push(account.username);
    fs.writeFileSync(path.join(globalServersDirPath, `${serverId}.json`), JSON.stringify(newServer, null, 2));
    account.servers.push(serverId);
    account.save();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", serverId, success: true }));
  });
});

addAPIListener("/editServer", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const serverId = data.serverId;
    const server = findServerById(serverId);
    if (!server) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Server not found" }));
      return;
    }
    if (server.owner !== account.username) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    server.name = data.name;
    server.save();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", serverId, success: true }));
    return;
  });
});

addAPIListener("/addServerWhitelist", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const serverId = data.serverId;
    const server = findServerById(serverId);
    if (!server) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Server not found" }));
      return;
    }
    if (server.owner !== account.username) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const accountToAdd = findAccountByUsername(data.usernameToAdd);
    if (!accountToAdd) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "User not found" }));
      return;
    }
    if (server.whitelist.includes(accountToAdd.username)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", message: "Already whitelisted", success: false }));  
      return;
    }
    server.whitelist.push(accountToAdd.username);
    accountToAdd.servers.push(server.id);
    server.save();
    accountToAdd.save();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", serverId, success: true }));
  });
});

addAPIListener("/removeServerWhitelist", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const serverId = data.serverId;
    const server = findServerById(serverId);
    if (!server) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Server not found" }));
      return;
    }
    if (server.owner !== account.username) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const accountToRemove = findAccountByUsername(data.usernameToRemove);
    if (!accountToRemove) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "User not found" }));
      return;
    }
    if (accountToRemove.username == account.username) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", message: "Nono, you can't remove yourself from the whitelist", success: false }));
      return;
    }
    if (!server.whitelist.includes(accountToRemove.username)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", message: "Not in whitelist to begin with :middle_finger:", success: false }));  
      return;
    }
    server.whitelist.splice(server.whitelist.indexOf(accountToRemove.username), 1);
    accountToRemove.servers.splice(accountToRemove.servers.indexOf(server.id));
    server.save();
    accountToRemove.save();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", serverId, success: true }));
  });
});

addAPIListener("/deleteServer", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
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
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const serverId = data.serverId;
    const server = findServerById(serverId);
    if (!server) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Server not found" }));
      return;
    }
    if (server.owner !== account.username) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    for (const username of server.whitelist) {
      const acc = findAccountByUsername(username);
      if (acc) {
        acc.servers.splice(acc.servers.indexOf(server.id), 1);
        acc.save();
      }
    }
    fs.unlinkSync(path.join(globalServersDirPath, `${serverId}.json`));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", success: true }));
  });
});

module.exports = {
  Server,
  findServerById
};
