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

addAPIListener("/getServerName", true, (data, account) => {
  const serverId = data.serverId;
  const server = findServerById(serverId);
  if (!server) {
    return { code: 404, message: "Server not found" };
  }
  if (!server.whitelist.includes(data.username)) {
    return { code: 403, message: "Access denied" };
  }
  const name = server.name;
  return { code: 200, message: "Server name retrieved", body: { name } };
});

addAPIListener("/getServers", true, (data, account) => {
  const serverList = account.servers.map(serverId => {
    const server = findServerById(serverId);
    return { id: serverId, name: server ? server.name : "Unknown Server", owner: server ? server.owner : "Unknown" };
  });
  return { code: 200, message: "Servers retrieved", body: { servers: serverList } };
});

addAPIListener("/createServer", true, (data, account) => {
  const serverName = data.name;
  if (typeof serverName !== "string" || serverName.trim() === "" || serverName.length > 60) {
    return { code: 400, message: "Invalid server name" };
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
  return { code: 200, message: "Server created successfully", body: { serverId } };
});

addAPIListener("/editServer", true, (data, account) => {
  const serverId = data.serverId;
  const server = findServerById(serverId);
  if (!server) {
    return { code: 404, message: "Server not found" };
  }
  if (server.owner !== account.username) {
    return { code: 403, message: "Access denied" };
  }
  server.name = data.name;
  server.save();
  return { code: 200, message: "Server edited successfully", body: { serverId } };
});

addAPIListener("/addServerWhitelist", true, (data, account) => {
  const serverId = data.serverId;
  const server = findServerById(serverId);
  if (!server) {
    return { code: 404, message: "Server not found" };
  }
  if (server.owner !== account.username) {
    return { code: 403, message: "Access denied" };
  }
  const accountToAdd = findAccountByUsername(data.usernameToAdd);
  if (!accountToAdd) {
    return { code: 404, message: "User not found" };
  }
  if (server.whitelist.includes(accountToAdd.username)) {
    return { code: 200, message: "Already whitelisted", success: false };
  }
  server.whitelist.push(accountToAdd.username);
  accountToAdd.servers.push(server.id);
  server.save();
  accountToAdd.save();
  return { code: 200, message: "User added to whitelist successfully", body: { serverId } };
});

addAPIListener("/removeServerWhitelist", true, (data, account) => {
  const serverId = data.serverId;
  const server = findServerById(serverId);
  if (!server) {
    return { code: 404, message: "Server not found" };
  }
  if (server.owner !== account.username) {
    return { code: 403, message: "Access denied" };
  }
  const accountToRemove = findAccountByUsername(data.usernameToRemove);
  if (!accountToRemove) {
    return { code: 404, message: "User not found" };
  }
  if (accountToRemove.username == account.username) {
    return { code: 400, message: "Nono, you can't remove yourself from the whitelist" };
  }
  if (!server.whitelist.includes(accountToRemove.username)) {
    return { code: 400, message: "Not in whitelist to begin with :middle_finger:"};
  }
  server.whitelist.splice(server.whitelist.indexOf(accountToRemove.username), 1);
  accountToRemove.servers.splice(accountToRemove.servers.indexOf(server.id), 1);
  server.save();
  accountToRemove.save();
  return { code: 200, message: "User removed from whitelist successfully", body: { serverId } };
});

addAPIListener("/deleteServer", true, (data, account) => {
  const serverId = data.serverId;
  const server = findServerById(serverId);
  if (!server) {
    return { code: 404, message: "Server not found" };
  }
  if (server.owner !== account.username) {
    return { code: 403, message: "Access denied" };
  }
  for (const username of server.whitelist) {
    const acc = findAccountByUsername(username);
    if (acc) {
      acc.servers.splice(acc.servers.indexOf(server.id), 1);
      acc.save();
    }
  }
  fs.unlinkSync(path.join(globalServersDirPath, `${serverId}.json`));
  return { code: 200, message: "Server deleted successfully" };
});

module.exports = {
  Server,
  findServerById
};
