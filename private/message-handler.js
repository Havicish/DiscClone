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

addAPIListener("/getMessages", true, (data, account) => {
  const after = parseInt(data.after) || 0;
  const serverId = data.serverId;
  const server = findServerById(serverId);
  if (!server) {
    return { code: 403, message: "Access denied" };
  }
  if (!server.whitelist.includes(account.username)) {
    return { code: 403, message: "Access denied" };
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
  return { code: 200, message: "Messages retrieved", body: { messages: messagesToSend } };
});

addAPIListener("/deleteMessage", true, (data, account) => {
  const server = findServerById(data.serverId);
  if (!server) {
    return { code: 403, message: "Access denied" };
  }
  if (!server.whitelist.includes(account.username)) {
    return { code: 403, message: "Access denied" };
  }
  const messageIndex = server.messages.findIndex((msg) => msg.id === data.messageId);
  if (messageIndex === -1) {
    return { code: 404, message: "Message not found" };
  }
  const message = server.messages[messageIndex];
  if (message.username !== account.username && server.owner !== account.username) {
    return { code: 403, message: "You can only delete your own messages" };
  }
  server.messages.splice(messageIndex, 1);
  server.save();
  return { code: 200, message: "Message deleted successfully" };
});

addAPIListener("/sendMessage", true, (data, account) => {
    if (data.message.trim() == "") {
      return { code: 400, message: "Message cannot be empty" };
    }
    const server = findServerById(data.serverId);
    if (!server.whitelist.includes(data.username)) {
      return { code: 403, message: "Access denied" };
    }
    let msg = new Message(account.username, data.message.trimEnd(), data.replyTo);
    if (data.message.trimEnd().length > 2000) {
      return { code: 400, message: `Message too long: ${data.message.trimEnd().length}/2000` };
    }
    if (server) {
      server.messages.push(msg);
      server.save();
    }
    return { code: 200, message: "Message sent successfully" };
});