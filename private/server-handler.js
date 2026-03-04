const fs = require("fs");
const path = require("path");
const { addAPIListener } = require("./server");
const findAccountByLoginToken = require("./account-handler").findAccountByLoginToken;
const findAccountByUsername = require("./account-handler").findAccountByUsername;
const saveAccounts = require("./account-handler").saveAccounts;

class Server {
  constructor() {
    this.name = "";
    this.id = null;
    this.messages = [];
    this.whitelist = [];
    this.owner = null;
  }

  loadMessages() {
    const serversFilePath = path.join(__dirname, "servers.json");
    if (!fs.existsSync(serversFilePath))
      return;

    const serversData = JSON.parse(fs.readFileSync(serversFilePath));
    const serverData = serversData[this.id];
    if (serverData)
      this.messages = serverData.messages || [];
  }

  saveMessages() {
    const serversFilePath = path.join(__dirname, "servers.json");
    let serversData = {};
    if (fs.existsSync(serversFilePath)) {
      serversData = JSON.parse(fs.readFileSync(serversFilePath));
    }

    serversData[this.id] = {
      name: this.name,
      messages: this.messages,
      whitelist: this.whitelist,
      owner: this.owner,
    };

    fs.writeFileSync(serversFilePath, JSON.stringify(serversData, null, 2));
  }
}

let servers = {};

function addMessageToServer(id, message) {
  servers[id].messages.push(message);
}

function loadServers() {
  const serversFilePath = path.join(__dirname, "servers.json");
  if (!fs.existsSync(serversFilePath))
    return;

  const serversData = JSON.parse(fs.readFileSync(serversFilePath));
  for (const id in serversData) {
    const serverInfo = serversData[id];
    const server = new Server();
    server.id = id;
    server.name = serverInfo.name;
    server.messages = serverInfo.messages || [];
    server.whitelist = serverInfo.whitelist || [];
    server.owner = serverInfo.owner || null;
    servers[id] = server;
  }
}

function saveServers() {
  const serversFilePath = path.join(__dirname, "servers.json");
  let serversData = {};
  for (const id in servers) {
    const server = servers[id];
    serversData[id] = {
      name: server.name,
      messages: server.messages,
      owner: server.owner,
      whitelist: server.whitelist,
    };
  }
  fs.writeFileSync(serversFilePath, JSON.stringify(serversData, null, 2));
}

const validatedUsernames = {};

function findOrAddAccount(token) {
  if (validatedUsernames[token])
    return validatedUsernames[token];

  const account = findAccountByLoginToken(token);
  if (!account)
    return null;

  validatedUsernames[token] = account;
  return account;
}

addAPIListener("/getServerName", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const serverId = data.serverId;
    const server = servers[serverId];
    if (!server) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    if (!server.whitelist.includes(findOrAddAccount(data.loginToken).username)) {
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
    const data = JSON.parse(body);
    const account = findOrAddAccount(data.loginToken);
    if (!account) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const serverList = account.servers.map(serverId => {
      const server = servers[serverId];
      return { id: serverId, name: server ? server.name : "Unknown Server", owner: server ? server.owner : "Unknown" };
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(serverList));
  });
});

addAPIListener("/createServer", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const account = findOrAddAccount(data.loginToken);
    console.log("Creating server for account", account ? account.username : "null");
    if (!account) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const serverName = data.name;
    const serverId = crypto.randomUUID();
    const newServer = new Server();
    newServer.id = serverId;
    newServer.name = serverName;
    newServer.owner = account.username;
    newServer.whitelist.push(account.username);
    servers[serverId] = newServer;
    account.servers.push(serverId);
    saveServers();
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
    const data = JSON.parse(body);
    const account = findOrAddAccount(data.loginToken);
    if (!account) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const serverId = data.serverId;
    const server = servers[serverId];
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
    saveServers();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", serverId, success: true }));
  });
});

addAPIListener("/addServerWhitelist", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const account = findOrAddAccount(data.loginToken);
    if (!account) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const serverId = data.serverId;
    const server = servers[serverId];
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
    if (server.whitelist.includes(data.username)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", message: "Already whitelisted", success: false }));  
      return;
    }
    const accountToAdd = findAccountByUsername(data.username);
    console.log(accountToAdd);
    if (!accountToAdd) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "User not found" }));
      return;
    }
    server.whitelist.push(data.username);
    accountToAdd.servers.push(server.id);
    saveServers();
    saveAccounts();
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
    const data = JSON.parse(body);
    const account = findOrAddAccount(data.loginToken);
    if (!account) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const serverId = data.serverId;
    const server = servers[serverId];
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
    if (!server.whitelist.includes(data.username)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", message: "Not in whitelist to begin with :middle_finger:", success: false }));  
      return;
    }
    const accountToRemove = findAccountByUsername(data.username);
    if (!accountToRemove) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "User not found" }));
      return;
    }
    server.whitelist.splice(server.whitelist.indexOf(data.username));
    accountToRemove.servers.splice(accountToRemove.servers.indexOf(server.id));
    saveServers();
    saveAccounts();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", serverId, success: true }));
  });
});

module.exports = {
  Server,
  servers,
  addMessageToServer,
  loadServers,
  saveServers
};
