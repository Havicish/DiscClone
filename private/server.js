const http = require('http');
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
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case "":
      return 'text/plain';
  }
}

const server = http.createServer((req, res) => {
  const requestedPath = req.url.split('?')[0];
  const apiListener = apiListeners.find(listener => listener.path === requestedPath);
  if (apiListener) {
    apiListener.callback(req, res);
  } else {
    const filePath = path.join(__dirname, '../public', req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        res.end(data);
      }
    });
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = {
  addAPIListener
};

setImmediate(() => {
  require("./messageHandler");
});