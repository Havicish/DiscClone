import { messages, setReplyId, backendURL, currentUsername, currentLoginToken, currentServerId, getNewMessages } from "./main.js";

const messagesDiv = document.getElementById("Messages");

let isShiftDown = false;

document.addEventListener("keydown", (event) => {
  if (event.key === "Shift")
    isShiftDown = true;
});

document.addEventListener("keyup", (event) => {
  if (event.key === "Shift")
    isShiftDown = false;
});

document.getElementById("DeleteMessageButton").addEventListener("click", () => {
  if (mainContextMenu.messageId) {
    fetch(backendURL + "/deleteMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messageId: mainContextMenu.messageId, loginToken: currentLoginToken, username: currentUsername, serverId: currentServerId }),
    }).then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          getNewMessages(0, currentServerId);
        }
      });
  }
  mainContextMenu.hide();
});

document.getElementById("CopyMessageIdButton").addEventListener("click", () => {
  if (mainContextMenu.messageId) {
    navigator.clipboard.writeText(mainContextMenu.messageId).then(() => {
      alert("Message ID copied to clipboard!");
    }).catch((err) => {
      console.error("Failed to copy message ID: ", err);
    });
  }
  mainContextMenu.hide();
});

document.getElementById("CopyMessageButton").addEventListener("click", () => {
  if (mainContextMenu.messageId) {
    const message = messages.find(msg => msg.id === mainContextMenu.messageId);
    if (message) {
      navigator.clipboard.writeText(message.message).then(() => {
        alert("Message text copied to clipboard!");
      }).catch((err) => {
        console.error("Failed to copy message text: ", err);
      });
    }
  }
  mainContextMenu.hide();
});

document.getElementById("ReplyMessageButton").addEventListener("click", () => {
  if (mainContextMenu.messageId) {
    const message = messages.find(msg => msg.id === mainContextMenu.messageId);
    if (message) {
      const messageInput = document.getElementById("MessageInput");
      messageInput.focus();
      setReplyId(mainContextMenu.messageId);
      document.getElementById("ReplyingTo").style.display = "flex";
      document.getElementById("ReplyingToText").innerText = `Replying to: ${message.username}`;
      document.documentElement.style.setProperty("--messages-height", "calc(100vh - 200px)");
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }
  mainContextMenu.hide();
});

document.addEventListener("DOMContentLoaded", () => {
  mainContextMenu.element = document.getElementById("ContextMenu");
  mainContextMenu.shiftElements = [document.getElementById("CopyMessageIdButton")];
});

class ContextMenu {
  constructor() {
    this.element;
    this.shiftElements = [];
    this.messageId;
  }

  setPos(x, y) {
    this.element.style.left = x + "px";
    this.element.style.top = y + "px";
  }

  show() {
    this.element.style.display = "flex";

    if (isShiftDown) {
      this.shiftElements.forEach((element) => {
        element.style.display = "block";
      });
    } else {
      this.shiftElements.forEach((element) => {
        element.style.display = "none";
      });
    }
  }

  hide() {
    this.element.style.display = "none";
  }

  addMessageEvent(element) {
    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.show();
      this.setPos(event.pageX, event.pageY);
      this.messageId = element.dataset.id;
    });
  }
}

export const mainContextMenu = new ContextMenu();