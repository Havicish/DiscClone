const addAPIListener = require("./server").addAPIListener;
const findAccountByLoginToken = require("./account-handler").findAccountByLoginToken;
const fs = require("fs");
const path = require("path");
const Server = require("./server-handler").Server;
const loadServers = require("./server-handler").loadServers;
const saveServers = require("./server-handler").saveServers;
const addMessageToServer = require("./server-handler").addMessageToServer;
const servers = require("./server-handler").servers;

loadServers();

class Message {
  constructor(username, message) {
    this.username = username;
    this.message = message;
    this.timeCreated = Date.now();
    this.id = crypto.randomUUID();
  }
}

const messages = [];
messages.push();

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

addAPIListener("/getMessages", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const after = parseInt(data.after) || 0;
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
    const newMessages = server.messages.filter((msg) => msg.timeCreated > after);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(newMessages));
  });
});

addAPIListener("/deleteMessage", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const after = parseInt(data.after) || 0;
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
    const newMessages = server.messages.filter((msg) => msg.timeCreated > after);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(newMessages));
  });
});

function createMessage(username, message) {
  let msg = new Message(username, message);
  messages.push(msg);
  return msg;
}

addAPIListener("/sendMessage", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const account = findOrAddAccount(data.loginToken);
    if (!account) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid token" }));
      return;
    }
    let msg = createMessage(account.username, data.message);
    const server = servers[data.serverId];
    if (server) {
      addMessageToServer(data.serverId, msg);
      server.saveMessages();
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  });
});