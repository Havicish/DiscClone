const fs = require("fs");
const path = require("path");
const { addAPIListener } = require("./server");
const findAccountByLoginToken = require("./account-handler").findAccountByLoginToken;

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
    console.log("Saving messages for server", this.id);
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
      return { id: serverId, name: server ? server.name : "Unknown Server" };
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
    if (!account) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    const serverName = data.serverName;
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
    res.end(JSON.stringify({ status: "ok", serverId }));
  });
});

module.exports = {
  Server,
  servers,
  addMessageToServer,
  loadServers,
  saveServers,
};