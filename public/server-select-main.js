window.addEventListener("error", (err) => {
  alert(err.error);
});

let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
backendURL = location.origin;

function sendToServer(endpoint, sendData, callback) {
  return fetch(backendURL + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(sendData)
  })
  .then(response => response.json())
  .then(data => callback(data));
}

let currentUsername = localStorage.getItem("username");
let currentLoginToken = localStorage.getItem("loginToken");
let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

let lastServerNames = [];

function updateServerList() {
  sendToServer("/getServers", { loginToken: currentLoginToken, username: currentUsername }, (data) => {
    let shouldResetServerList = false;

    data.servers.forEach((server) => {
      if (!lastServerNames.includes(server.name)) {
        shouldResetServerList = true;
      }
    });

    if (!shouldResetServerList && lastServerNames.length > 0)
      return;

    lastServerNames = [];

    const serverListDiv = document.getElementById("ServerList");
    const createServerDiv = document.getElementById("CreateServer");
    createServerDiv.style.display = "block";

    Array.from(serverListDiv.children).forEach((child) => {
      child.remove();
    });

    data.servers.forEach((server) => {
      lastServerNames.push(server.name);

      const serverDiv = document.createElement("div");
      serverDiv.className = "ServerListServer";

      const nameSpan = document.createElement("span");
      nameSpan.innerText = server.name;

      const openButton = document.createElement("button");
      openButton.className = "OpenServer";
      openButton.dataset.serverId = server.id;
      openButton.innerText = "Open";
      openButton.addEventListener("click", () => {
        window.location.href = "/server/" + server.id;
      });

      serverDiv.appendChild(nameSpan);
      serverDiv.appendChild(openButton);
      serverListDiv.appendChild(serverDiv);

      if (server.owner == currentUsername) {
        const editButton = document.createElement("button");
        editButton.className = "EditServer";
        editButton.dataset.serverId = server.id;
        editButton.innerText = "Edit";
        editButton.addEventListener("click", () => {
          window.location.href = "/edit-server/" + server.id;
        });
        serverDiv.appendChild(editButton);
      }

      const breakline = document.createElement("br");
      serverListDiv.appendChild(breakline);
    });

    if (data.servers.length == 0) {
      const msg = document.createElement("span");
      msg.innerHTML = "No one's added you to any servers yet :(";
      serverListDiv.appendChild(msg);
      serverListDiv.appendChild(document.createElement("br"));
      serverListDiv.appendChild(document.createElement("br"));
    }

    serverListDiv.appendChild(createServerDiv);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  currentLoginToken = loginToken;
  currentUsername = localStorage.getItem("username");

  const createServerButton = document.getElementById("CreateServerButton");

  createServerButton.addEventListener("click", (e) => {
    window.location.href = "/edit-server/new";
  });

  sendToServer("/validateToken", { username: currentUsername, loginToken: currentLoginToken }, (data) => {
    if (data.code == 200) {
      currentUsername = data.username;
      updateServerList();
    } else {
      localStorage.removeItem("loginToken");
      window.location.href = "/sign-in";
    }
  });
});

setInterval(() => {
  updateServerList();
}, 2000);