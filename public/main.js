window.addEventListener("error", (err) => {
  alert(err.error);
});

let backendURL = "http://localhost:3000";

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
    console.log("Removed child");
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

function getNewMessages(timeAfter) {
  fetch(backendURL + "/getMessages" + "?after=" + timeAfter)
    .then((response) => response.json())
    .then((data) => {
      clearAllRenderedMessages(document.getElementById("Messages"));
      clearAllMessages();
      data.forEach((msg) => {
        createMessage(msg.username, msg.message, msg.timeCreated);
      });
      renderAllMessages(document.getElementById("Messages"));
    });
}

function sendMessage(username, message) {
  fetch(backendURL + "/sendMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, message }),
  }).then((response) => response.json())
    .then((data) => {
      if (data.status === "ok") {
        getNewMessages(0);
      }
    });
}

getNewMessages(0);

document.getElementById("SendButton").addEventListener("click", (e) => {
  const messageInput = document.getElementById("MessageInput");

  sendMessage("User", messageInput.value);
  messageInput.value = "";
});