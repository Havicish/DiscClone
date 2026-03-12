const addAPIListener = require("./server").addAPIListener;
const findServerById = require("./server-handler").findServerById;
const findAccountByUsername = require("./account-handler").findAccountByUsername;

class Message {
  constructor(username, message, replyTo = null) {
    this.username = username;
    this.message = message;
    this.timeCreated = Date.now();
    this.id = crypto.randomUUID();
    this.replyTo = replyTo;
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
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Invalid JSON" }));
      return;
    }
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
    const messagesToSend = [];
    const cachedAccounts = {};
    for (let msg of server.messages) {
      if (msg.timeCreated > after) {
        let user;
        if (cachedAccounts[msg.username]) {
          user = cachedAccounts[msg.username];
        } else {
          user = findAccountByUsername(msg.username);
          cachedAccounts[msg.username] = user;
        }
        msg.usernameColor = user.usernameColor;
        messagesToSend.push(msg);
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(messagesToSend));
  });
});

addAPIListener("/deleteMessage", (req, res) => {
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
    const server = findServerById(data.serverId);
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
    const messageIndex = server.messages.findIndex((msg) => msg.id === data.messageId);
    if (messageIndex === -1) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Message not found" }));
      return;
    }
    const message = server.messages[messageIndex];
    if (message.username !== data.username && server.owner !== data.username) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "You can only delete your own messages" }));
      return;
    }
    server.messages.splice(messageIndex, 1);
    server.save();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "success" }));
  });
});

addAPIListener("/sendMessage", (req, res) => {
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
    if (data.message.trim() == "") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Message cannot be empty" }));
      return;
    }
    const account = getAndValidateAccount(data.username, data.loginToken, res);
    if (!account)
      return;
    const server = findServerById(data.serverId);
    if (!server.whitelist.includes(data.username)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Access denied" }));
      return;
    }
    let msg = new Message(account.username, data.message.trimEnd(), data.replyTo);
    if (data.message.trimEnd().length > 2000) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: `Message too long: ${data.message.trimEnd().length}/2000` }));
      return;
    }
    if (server) {
      server.messages.push(msg);
      server.save();
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "success" }));
  });
});