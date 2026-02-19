const addAPIListener = require("./server").addAPIListener;
const findAccountByLoginToken = require("./account-handler").findAccountByLoginToken;

class Message {
  constructor(username, message) {
    this.username = username;
    this.message = message;
    this.timeCreated = Date.now();
  }
}

const messages = [];
messages.push(new Message("System", "Welcome to the chat!"));

const validatedUsernames = {};

function findOrAddAccount(token) {
  if (validatedUsernames[token])
    return validatedUsernames[token];

  const account = findAccountByLoginToken(token);
  if (!account)
    return null;

  validatedUsernames[token] = account.username;
  return account;
}

addAPIListener("/getMessages", (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const after = parseInt(url.searchParams.get("after")) || 0;
  const newMessages = messages.filter((msg) => msg.timeCreated > after);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(newMessages));
});

function createMessage(username, message) {
  messages.push({
    username,
    message,
    timeCreated: Date.now(),
  });
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
    createMessage(account.username, data.message);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  });
});