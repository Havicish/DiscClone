import { mainContextMenu } from "./index-context-main.js";
import { getMessageById } from "./main.js";

export let currentUsername = localStorage.getItem("username");
export let currentLoginToken = localStorage.getItem("loginToken");
export let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

function appendFormattedMessageText(parentElement, messageText) {
  if (messageText.startsWith("# ")) {
    const headerElement = document.createElement("span");
    headerElement.className = "BigMessage";
    headerElement.textContent = messageText.slice(2);
    parentElement.appendChild(headerElement);
    return;
  }

  // Supports: *italic text*, **bold text**, _underline text_, ***bold italic text***
  const formatPattern = /\*\*\*([^*\n]+)\*\*\*|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let lastIndex = 0;
  let match;

  while ((match = formatPattern.exec(messageText)) !== null) {
    // console.log(match);

    if (match.index > lastIndex) {
      parentElement.appendChild(document.createTextNode(messageText.slice(lastIndex, match.index)));
    }

    if (match[2] !== undefined) {
      const boldElement = document.createElement("b");
      boldElement.textContent = match[2];
      parentElement.appendChild(boldElement);
    } else if (match[3] !== undefined) {
      const italicElement = document.createElement("i");
      italicElement.textContent = match[3];
      parentElement.appendChild(italicElement);
    } else if (match[4] !== undefined) {
      const underlineElement = document.createElement("u");
      underlineElement.textContent = match[4];
      parentElement.appendChild(underlineElement);
    } else if (match[1] !== undefined) {
      const boldElement = document.createElement("b");
      const italicElement = document.createElement("i");
      italicElement.textContent = match[1];
      boldElement.appendChild(italicElement);
      parentElement.appendChild(boldElement);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < messageText.length) {
    parentElement.appendChild(document.createTextNode(messageText.slice(lastIndex)));
  }
}

export class Message {
  constructor(username, message, timeCreated, id, usernameColor, replyTo = null) {
    this.username = username;
    this.message = message;
    this.timeCreated = timeCreated;
    this.id = id;
    this.usernameColor = usernameColor;
    this.repliedTo = replyTo;
  }

  render(messagesDiv, isHeader = false, isTrailing = false, isFirstMessage = false) {
    const date = new Date(this.timeCreated);
    const timeString = date.toLocaleString();

    if (isHeader && !isFirstMessage)
      messagesDiv.appendChild(document.createElement("br"));

    const messageDiv = document.createElement("div");
    messageDiv.className = "Message";
    messageDiv.dataset.id = this.id;

    if (this.repliedTo) {
      const repliedToMessage = getMessageById(this.repliedTo);
      const replyDiv = document.createElement("div");
      replyDiv.className = "Reply";
      messageDiv.appendChild(replyDiv);
      if (repliedToMessage) {
        replyDiv.addEventListener("click", () => {
          const originalMessageElement = document.querySelector(`[data-id="${repliedToMessage.id}"]`);
          if (originalMessageElement) {
            const timeMessageElement = originalMessageElement.querySelector(".Time");
            timeMessageElement.style.color = "#333333";
            originalMessageElement.scrollIntoView({ behavior: "smooth", block: "center" });
            originalMessageElement.style.backgroundColor = "#333333";
            setTimeout(() => {
              originalMessageElement.style.backgroundColor = "";
              timeMessageElement.style.color = "";
            }, 2000);
          }
        });
        replyDiv.innerText = `Replying to ${repliedToMessage.username}: ${repliedToMessage.message}`;
        if (repliedToMessage.message.length > 50) {
          replyDiv.innerText = `Replying to ${repliedToMessage.username}: ${repliedToMessage.message.substring(0, 50)}...`;
        }
        if (repliedToMessage.username == currentUsername) {
          replyDiv.dataset.isToThis = "true";
        }
      } else {
        replyDiv.innerText = "Replying to (message not found)";
      }
    }

    const usernameElement = document.createElement("b");
    usernameElement.className = "Username";
    usernameElement.style.color = this.usernameColor;
    usernameElement.innerText = this.username + ": ";

    const textElement = document.createElement("span");
    textElement.className = "Text";
    appendFormattedMessageText(textElement, this.message);
    textElement.appendChild(document.createTextNode(" "));

    const timeElement = document.createElement("span");
    timeElement.className = "Time";
    timeElement.innerText = `(${timeString})`;

    if (isHeader) {
      messageDiv.appendChild(usernameElement);
      messageDiv.appendChild(document.createElement("br"));
    }
    messageDiv.appendChild(textElement);
    messageDiv.appendChild(timeElement);
    if (!isTrailing) {
      messageDiv.style.marginBottom = "5px";
    }
    messagesDiv.appendChild(messageDiv);

    mainContextMenu.addMessageEvent(messageDiv);
  }
}