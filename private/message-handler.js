const addAPIListener = require("./server").addAPIListener;

class Message {
  constructor(username, message) {
    this.username = username;
    this.message = message;
    this.timeCreated = Date.now();
  }
}

const messages = [];
messages.push(new Message("System", "Welcome to the chat!"));

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
    createMessage(data.username, data.message);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  });
});