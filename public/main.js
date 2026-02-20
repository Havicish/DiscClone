window.addEventListener("error", (err) => {
  alert(err.error);
});

let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
backendURL = location.origin;

let currentUsername = null;
let currentLoginToken = null;
let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

const messages = [];

class Message {
  constructor(username, message, timeCreated) {
    this.username = username;
    this.message = message;
    this.timeCreated = timeCreated;
  }

  render(messagesDiv) {
    const date = new Date(this.timeCreated);
    const timeString = date.toLocaleString();

    const messageDiv = document.createElement("div");
    messageDiv.className = "Message";

    const usernameElement = document.createElement("b");
    usernameElement.className = "Username";
    usernameElement.innerText = this.username + ": ";

    const textElement = document.createElement("span");
    textElement.className = "Text";
    textElement.innerText = this.message + " ";

    const timeElement = document.createElement("span");
    timeElement.className = "Time";
    timeElement.innerText = `(${timeString})`;

    messageDiv.appendChild(usernameElement);
    messageDiv.appendChild(textElement);
    messageDiv.appendChild(timeElement);
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

function createMessage(username, message, timeCreated) {
  const newMessage = new Message(username, message, timeCreated);
  messages.push(newMessage);
}

function renderAllMessages(messagesDiv) {
  for (const message of messages) {
    message.render(messagesDiv);
  }
}

function getNewMessages(timeAfter, serverId) {
  // fetch(backendURL + "/getMessages" + "?after=" + timeAfter + "?server")
  //   .then((response) => response.json())
  //   .then((data) => {
  //     if (data.length > 0) {
  //       clearAllMessages();
  //       data.forEach((msg) => {
  //         createMessage(msg.username, msg.message, msg.timeCreated);
  //       });
  //       const messagesDiv = document.getElementById("Messages");
  //       clearAllRenderedMessages(messagesDiv);
  //       renderAllMessages(messagesDiv);
  //     }
  //   });

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
          createMessage(msg.username, msg.message, msg.timeCreated);
        });
        const messagesDiv = document.getElementById("Messages");
        clearAllRenderedMessages(messagesDiv);
        renderAllMessages(messagesDiv);
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

document.getElementById("SendButton").addEventListener("click", (e) => {
  const messageInput = document.getElementById("MessageInput");

  sendMessage(currentUsername, messageInput.value, currentLoginToken, currentServerId);
  messageInput.value = "";
});

document.addEventListener("keydown", (event) => {
  if (event.key == "Enter")
    document.getElementById("SendButton").click();
});

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in.html";
    return;
  }

  currentLoginToken = loginToken;

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
        window.location.href = "/sign-in.html";
      }
    });
});

setInterval(() => {
  getNewMessages(0, currentServerId);
}, 2000);