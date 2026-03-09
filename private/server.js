const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const port = 3000;

const domain = process.env.SSL_DOMAIN;
const certPath = domain ? `/etc/letsencrypt/live/${domain}` : null;
let sslOptions = null;
if (certPath) {
  try {
    sslOptions = {
      key: fs.readFileSync(`${certPath}/privkey.pem`),
      cert: fs.readFileSync(`${certPath}/fullchain.pem`),
    };
  } catch (e) {
    console.log("SSL certs not found, falling back to HTTP");
  }
}

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

const requestHandler = (req, res) => {
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
    // If filepath isn't in the public folder, return 404
    if (!filePath.startsWith(path.join(__dirname, "../public"))) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
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
};

const server = sslOptions
  ? https.createServer(sslOptions, requestHandler)
  : http.createServer(requestHandler);

const globalDataDirPath = path.join(__dirname, "../data");
const globalServersDirPath = path.join(__dirname, "../data", "servers");
const globalAccountsDirPath = path.join(__dirname, "../data", "accounts");

// Only directory creation needed in this file.
// Other creations are handled by other scripts.
if (!fs.existsSync(globalDataDirPath)) {
  fs.mkdirSync(globalDataDirPath);
}

server.listen(port, () => {
  const protocol = sslOptions ? "https" : "http";
  console.log(`Server is running on ${protocol}://localhost:${port}`);
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