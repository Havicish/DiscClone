const http = require("http");
const fs = require("fs");
const path = require("path");
const port = 3000;

class APIListener {
  constructor(path, callback) {
    this.path = path;
    this.callback = callback;
  }
}
function addAPIListener(path, callback) {
  apiListeners.push(new APIListener(path, callback));
}
const apiListeners = [];

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    case "":
      return "text/plain";
  }
}

const server = http.createServer((req, res) => {
  const requestedPath = req.url.split("?")[0];
  const apiListener = apiListeners.find(listener => listener.path === requestedPath);
  //const servers = require("./server-handler").servers;
  if (apiListener) {
    apiListener.callback(req, res);
  } else {
    let filePath = path.join(__dirname, "../public", req.url === "/" ? "index.html" : req.url);
    if (req.url.includes("server/")) {
      filePath = path.join(__dirname, "../public", req.url.length == 44 ? "index.html" : req.url.substring(8));
    }
    if (req.url === "/") {
      filePath = path.join(__dirname, "../public", "server-select.html");
    }
    if (req.url.split("/")[1] === "edit-server") {
      if (req.url.split("/")[2] !== "get") {
        filePath = path.join(__dirname, "../public", "edit-server.html");
      } else {
        filePath = path.join(__dirname, "../public", `${req.url.split("/")[3]}`);
      }
    }
    if (req.url === "/sign-in") {
      filePath = path.join(__dirname, "../public", "sign-in.html");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      } else {
        res.writeHead(200, { "Content-Type": getContentType(filePath) });
        res.end(data);
      }
    });
  }
});

const globalServersDirPath = path.join(__dirname, "../data", "servers");
const globalAccountsDirPath = path.join(__dirname, "../data", "accounts");

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = {
  addAPIListener,
  globalAccountsDirPath,
  globalServersDirPath
};

setImmediate(() => {
  require("./message-handler");
  require("./account-handler");
});