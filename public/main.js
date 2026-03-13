import { Message } from "./index-message-class.js";

window.addEventListener("error", (err) => {
  alert(err.error);
});

export let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
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

export let currentUsername = localStorage.getItem("username");
export let currentLoginToken = localStorage.getItem("loginToken");
export let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

let isShiftDown = false;
let isCtrlDown = false;
let isCmdDown = false;

export const messages = [];

const contextMenu = document.getElementById("ContextMenu");
let messageReplyToId = null;

let isFocused = true;
window.addEventListener("focus", () => {
  isFocused = true;
});

window.addEventListener("blur", () => {
  isFocused = false;
});


export function setReplyId(id) {
  messageReplyToId = id;
}

export function getMessageById(id) {
  return messages.find((msg) => msg.id === id);
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

function createMessage(username, message, timeCreated, id, usernameColor, replyTo = null) {
  const newMessage = new Message(username, message, timeCreated, id, usernameColor, replyTo);
  messages.push(newMessage);
}

function renderAllMessages(messagesDiv) {
  if (messages.length === 0) {
    return;
  }

  let messageClumps = [[]];
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
      message.render(messagesDiv, clump[0] === message, clump[clump.length - 1] === message, clump[0] === messages[0]);
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

  if (renderedMessages.length != messages.length)
    return true;

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].id != renderedMessages[i])
      return true;
  }

  return false;
}

export function getNewMessages(timeAfter, serverId) {
  sendToServer("/getMessages", { after: timeAfter, serverId: serverId, loginToken: currentLoginToken, username: currentUsername }, (data) => {
    const messagesDiv = document.getElementById("Messages");
    const scrollDistFromBottom = messagesDiv.scrollHeight - messagesDiv.clientHeight - messagesDiv.scrollTop;
    const wasAtBottom = scrollDistFromBottom < 50;

    clearAllMessages();
    if (Array.isArray(data.messages) && data.messages.length > 0) {
      data.messages.forEach((msg) => {
        createMessage(msg.username, msg.message, msg.timeCreated, msg.id, msg.usernameColor, msg.replyTo);
      });
    }

    if (isThereUnrenderedMessages(messagesDiv)) {
      clearAllRenderedMessages(messagesDiv);
      renderAllMessages(messagesDiv);
      if (wasAtBottom) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }
  });
}

function dontRenderNewMessages(timeAfter, serverId, callback) {
  sendToServer("/getMessages", { after: timeAfter, serverId: serverId, loginToken: currentLoginToken, username: currentUsername }, (data) => {
    let messages2 = [];

    if (Array.isArray(data.messages) && data.messages.length > 0) {
      data.messages.forEach((msg) => {
        messages2.push(new Message(msg.username, msg.message, msg.timeCreated, msg.id, msg.usernameColor, msg.replyTo));
      });
    }

    callback(messages2);
  });
}

function sendMessage(username, message, loginToken, serverId) {
  const replyTo = messageReplyToId;
  messageReplyToId = null;
  document.getElementById("ReplyingTo").style.display = "none";
  document.documentElement.style.setProperty("--messages-height", "calc(100vh - 170px)");

  sendToServer("/sendMessage", { username, message, loginToken, serverId, replyTo }, (data) => {
    if (data.code == 200) {
      getNewMessages(0, serverId);
    } else {
      alert("Failed to send message: " + data.message);
    }
  });
}

function getServerName(loginToken, serverId) {
  sendToServer("/getServerName", { loginToken, serverId, username: currentUsername }, (data) => {
    if (typeof data.name == "string") {
      document.getElementById("ServerName").innerText = data.name;
      document.title = data.name + " - Symphony";
    } else {
      document.getElementById("ServerName").innerText = "Access denied";
      document.title = "Access denied - Symphony";
    }
  });
}

function updateServerList(loginToken, callback) {
  sendToServer("/getServers", { loginToken, username: currentUsername }, (data) => {
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

  if (event.key.length == 1 && document.activeElement.id != "MessageInput" && !isCtrlDown && !isCmdDown)
    document.getElementById("MessageInput").focus();

  if (event.key == "Shift")
    isShiftDown = true;
  if (event.key == "Control")
    isCtrlDown = true;
  if (event.key == "Meta")
    isCmdDown = true;

  function EscapeFunc() {
    if (contextMenu.style.display == "flex") {
      contextMenu.style.display = "none";
      return;
    }
    if (messageReplyToId) {
      messageReplyToId = null;
      document.getElementById("ReplyingTo").style.display = "none";
      document.documentElement.style.setProperty("--messages-height", "calc(100vh - 170px)");
      return;
    }
  }

  if (event.key == "Escape") {
    EscapeFunc();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key == "Shift")
    isShiftDown = false;
  if (event.key == "Control")
    isCtrlDown = false;
  if (event.key == "Meta")
    isCmdDown = false;
});

document.addEventListener("click", (event) => {
  if (event.target.id != "ContextMenu" && !contextMenu.contains(event.target)) {
    contextMenu.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  currentLoginToken = loginToken;

  const messagesDiv = document.getElementById("Messages");
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

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

  document.getElementById("ReplyingToCancelButton").addEventListener("click", () => {
    messageReplyToId = null;
    document.getElementById("MessageInput").value = "";
    document.getElementById("ReplyingTo").style.display = "none";
    document.documentElement.style.setProperty("--messages-height", "calc(100vh - 170px)");
  });

  sendToServer("/validateToken", { loginToken: currentLoginToken, username: currentUsername }, (data) => {
    if (data.code == 200) {
      currentUsername = data.username;
      getNewMessages(0, currentServerId);
      getServerName(currentLoginToken, currentServerId);
    } else {
      localStorage.removeItem("loginToken");
      window.location.href = "/sign-in";
    }
  });
});

let lastCheckMessages = [];
setInterval(() => {
  for (let i = 0; i < lastCheckMessages.length; i++) {
    let msg = lastCheckMessages[i];
    if (!messages.find((m) => m.id === msg.id)) {
      if (!isFocused) {
        const messageSound = document.getElementById("MessageSound");
        messageSound.volume = 0.3;
        // messageSound.play();
      }
      getNewMessages(0, currentServerId);
      break;
    }
  }
  dontRenderNewMessages(Date.now() - 10000, currentServerId, (messages2) => {
    lastCheckMessages = messages2;
  });
}, 2000);