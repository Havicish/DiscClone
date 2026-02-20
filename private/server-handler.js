const fs = require("fs");
const path = require("path");

class Server {
  constructor() {
    this.name = "";
    this.id = null;
    this.messages = [];
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

module.exports = {
  Server,
  servers,
  addMessageToServer,
  loadServers,
  saveServers,
};