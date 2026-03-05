window.addEventListener("error", (err) => {
  alert(err.error);
});

let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
backendURL = location.origin;

let currentUsername = null;
let currentLoginToken = null;
let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

let isShiftDown = false;

const messages = [];

class Message {
  constructor(username, message, timeCreated, id) {
    this.username = username;
    this.message = message;
    this.timeCreated = timeCreated;
    this.id = id;
  }

  render(messagesDiv, isHeader = false, isTrailing = false) {
    const date = new Date(this.timeCreated);
    const timeString = date.toLocaleString();

    const messageDiv = document.createElement("div");
    messageDiv.className = "Message";
    messageDiv.dataset.id = this.id;

    const usernameElement = document.createElement("b");
    usernameElement.className = "Username";
    usernameElement.innerText = this.username + ": ";

    const textElement = document.createElement("span");
    textElement.className = "Text";
    textElement.innerText = this.message + " ";

    const timeElement = document.createElement("span");
    timeElement.className = "Time";
    timeElement.innerText = `(${timeString})`;

    if (isHeader) {
      messageDiv.appendChild(usernameElement);
      messageDiv.appendChild(document.createElement("br"));
    }
    messageDiv.appendChild(textElement);
    messageDiv.appendChild(timeElement);
    if (isTrailing) {
      messageDiv.appendChild(document.createElement("br"));
      messageDiv.appendChild(document.createElement("br"));
    }
    if (!isTrailing) {
      messageDiv.style.marginBottom = "10px";
    }
    messagesDiv.appendChild(messageDiv);
  }
}

function clearAllMessages() {
  const initLen = messages.length;
  for (let i = 0; i < initLen; i++) {
    messages.pop();
  }
}

function clearAllRenderedMessages(messagesDiv) {
  Array.from(messagesDiv.children).forEach((child) => {
    child.remove();
  });
}

function createMessage(username, message, timeCreated, id) {
  const newMessage = new Message(username, message, timeCreated, id);
  messages.push(newMessage);
}

function renderAllMessages(messagesDiv) {
  messageClumps = [[]];
  let currentClump = messages[0].username;

  for (const message of messages) {
    if (message.username != currentClump) {
      messageClumps.push([]);
      currentClump = message.username;
    }
    messageClumps[messageClumps.length - 1].push(message);
  }

  for (const clump of messageClumps) {
    for (const message of clump) {
      message.render(messagesDiv, clump[0] === message, clump[clump.length - 1] === message);
    }
  }
}

function isThereUnrenderedMessages(messagesDiv) {
  const renderedMessages = [];
  Array.from(messagesDiv.children).forEach((child) => {
    const id = child.dataset.id;
    if (id)
      renderedMessages.push(id);
  });

  for (const message of messages) {
    if (!renderedMessages.includes(message.id))
      return true;
  }
  return false;
}

function getNewMessages(timeAfter, serverId) {
  fetch(backendURL + "/getMessages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ after: timeAfter, serverId: serverId, loginToken: currentLoginToken }),
  }).then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        clearAllMessages();
        data.forEach((msg) => {
          createMessage(msg.username, msg.message, msg.timeCreated, msg.id);
        });
        const messagesDiv = document.getElementById("Messages");
        if (isThereUnrenderedMessages(messagesDiv)) {
          clearAllRenderedMessages(messagesDiv);
          renderAllMessages(messagesDiv);
        }
      }
    });
}

function sendMessage(username, message, loginToken, serverId) {
  fetch(backendURL + "/sendMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, message, loginToken, serverId }),
  }).then((response) => response.json())
    .then((data) => {
      if (data.status === "ok") {
        getNewMessages(0, serverId);
      }
    });
}

function getServerName(loginToken, serverId) {
  fetch(backendURL + "/getServerName", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginToken, serverId }),
  }).then((response) => response.json())
    .then((data) => {
      if (typeof data == "string")
        document.getElementById("ServerName").innerText = data;
      else
        document.getElementById("ServerName").innerText = "Access denied";
    });
}

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

        const paddingSpan = document.createElement("span");
        paddingSpan.innerHTML = "&nbsp;&nbsp;";

        serverDiv.appendChild(nameSpan);
        serverDiv.appendChild(openButton);
        serverDiv.appendChild(paddingSpan);
        serverListDiv.appendChild(serverDiv);
      });
      callback();
    });
}

document.addEventListener("keydown", (event) => {
  if (event.key == "Enter" && document.activeElement.id == "MessageInput" && document.getElementById("MessageInput").value.trim() != "" && !isShiftDown) {
    document.getElementById("SendButton").click();
    event.preventDefault();
  }

  if (event.key == "Shift")
    isShiftDown = true;
});

document.addEventListener("keyup", (event) => {
  if (event.key == "Shift")
    isShiftDown = false;
});

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  currentLoginToken = loginToken;

  document.getElementById("SendButton").addEventListener("click", (e) => {
    const messageInput = document.getElementById("MessageInput");

    sendMessage(currentUsername, messageInput.value, currentLoginToken, currentServerId);
    messageInput.value = "";
  });

  document.getElementById("OpenServersButton").addEventListener("click", (e) => {
    if (document.getElementById("OpenServersButton").innerHTML === "&nbsp;Servers &gt;&nbsp;") {
      document.getElementById("OpenServersButton").innerHTML = "...";
      updateServerList(currentLoginToken, () => {
        document.getElementById("OpenServersButton").innerHTML = "&nbsp;&lt;&nbsp;";
        document.getElementById("ServerList").style.display = "block";
      });
    } else {
      document.getElementById("OpenServersButton").innerHTML = "&nbsp;Servers &gt;&nbsp;";
      document.getElementById("ServerList").style.display = "none";
    }
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
        getNewMessages(0, currentServerId);
        getServerName(currentLoginToken, currentServerId);
      } else {
        localStorage.removeItem("loginToken");
        window.location.href = "/sign-in";
      }
    });
});

setInterval(() => {
  getNewMessages(0, currentServerId);
}, 2000);