window.addEventListener("error", (err) => {
  alert(err.error);
});

let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
backendURL = location.origin;

let currentUsername = null;
let currentLoginToken = null;
let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

function updateServerList(loginToken, callback) {
  fetch(backendURL + "/getServers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginToken }),
  }).then((response) => response.json())
    .then((data) => {
      const serverListDiv = document.getElementById("ServerList");
      const createServerDiv = document.getElementById("CreateServer");
      Array.from(serverListDiv.children).forEach((child) => {
        child.remove();
      });
      data.forEach((server) => {
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
      serverListDiv.appendChild(createServerDiv);
      callback();
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  currentLoginToken = loginToken;

  document.getElementById("CreateServerButton").addEventListener("click", (e) => {
    window.location.href = "/edit-server/new";
  });

  // check if token is valid, and sign in
  fetch(backendURL + "/getAccountInfo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginToken }),
  }).then((response) => response.json())
    .then((data) => {
      if (data.success) {
        currentUsername = data.username;
        updateServerList(currentLoginToken, () => {});
      } else {
        localStorage.removeItem("loginToken");
        window.location.href = "/sign-in";
      }
    });
});

setInterval(() => {
  updateServerList(currentLoginToken, () => {});
}, 2000);