const addAPIListener = require("./server").addAPIListener;
const findServerById = require("./server-handler").findServerById;
const findAccountByUsername = require("./account-handler").findAccountByUsername;

class Message {
  constructor(username, message) {
    this.username = username;
    this.message = message;
    this.timeCreated = Date.now();
    this.id = crypto.randomUUID();
  }
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

addAPIListener("/getMessages", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const after = parseInt(data.after) || 0;
    const serverId = data.serverId;
    const server = findServerById(serverId);
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    if (!server) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    if (!server.whitelist.includes(data.username)) {
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
    res.writeHead(501, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: "Not implemented" }));
    return;
    const data = JSON.parse(body);
    const after = parseInt(data.after) || 0;
    const serverId = data.serverId;
    const server = findServerById(serverId);
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

addAPIListener("/sendMessage", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    let msg = new Message(account.username, data.message);
    const server = findServerById(data.serverId);
    if (server) {
      server.messages.push(msg);
      server.save();
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  });
});