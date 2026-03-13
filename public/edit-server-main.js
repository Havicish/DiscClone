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

let timesClickedDelete = 0;
let lastClickedDeleteTime = 0;

window.addEventListener("error", (event) => {
  console.error("Error occurred:", event.error);
  alert("An error occurred: " + event.error.message);
});

function getServerName(loginToken, serverId) {
  const serverNameElement = document.getElementById("ServerName");
  sendToServer("/getServerName", { loginToken, username: currentUsername, serverId }, (data) => {
    if (typeof data.name == "string") {
      serverNameElement.innerText = "Edit the " + data.name + " server";
      document.title = "Edit " + data.name + " - Symphony";
    } else {
      serverNameElement.innerText = "Access denied";
      document.title = "Access denied - Symphony";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  const cancelServerButton = document.getElementById("CancelServerButton");
  const createServerButton = document.getElementById("CreateServerButton");
  const saveChangesButton = document.getElementById("SaveChangesButton");
  const addUserButton = document.getElementById("AddUserButton");
  const removeUserButton = document.getElementById("RemoveUserButton");
  const deleteServerButton = document.getElementById("DeleteServerButton");
  const cancelChangesButton = document.getElementById("CancelChangesButton");
  const createSection = document.getElementById("Create");
  const editSection = document.getElementById("Edit");
  const editServerWhitelistInput = document.getElementById("EditServerWhitelistInput");
  const serverNameInput = document.getElementById("ServerNameInput");
  const editServerNameInput = document.getElementById("EditServerNameInput");

  if (window.location.href.includes("edit-server/new")) {
    createSection.style.display = "block";
    editSection.style.display = "none";

    document.title = "Make a server - Symphony";

    cancelServerButton.addEventListener("click", () => {
      window.location.href = "/";
    });

    createServerButton.addEventListener("click", () => {
      const serverName = serverNameInput.value;
      if (!serverName) {
        alert("Please enter a server name.");
        return;
      }

      sendToServer("/createServer", { name: serverName, loginToken: loginToken, username: currentUsername }, (data) => {
        if (data.code == 200) {
          window.location.href = "/server/" + data.serverId;
        } else {
          alert("Error creating server: " + data.message);
        }
      });
    });
  } else {
    createSection.style.display = "none";
    editSection.style.display = "block";

    getServerName(loginToken, window.location.pathname.split("/").pop());

    saveChangesButton.addEventListener("click", () => {
      sendToServer("/editServer", {
        serverId: window.location.pathname.split("/").pop(),
        name: editServerNameInput.value,
        loginToken: loginToken,
        username: currentUsername
      }, (data) => {
        if (data.code == 200) {
          alert("Server updated successfully!");
          window.location.href = "/server/" + data.serverId;
        } else {
          alert("Error editing server: " + data.message);
        }
      });
    });

    addUserButton.addEventListener("click", () => {
      const usernameToAdd = editServerWhitelistInput.value;
      if (!usernameToAdd) {
        alert("Please enter a username to add.");
        return;
      }

      sendToServer("/addServerWhitelist", {
        serverId: window.location.pathname.split("/").pop(),
        usernameToAdd: usernameToAdd,
        username: currentUsername,
        loginToken
      }, (data) => {
        if (data.code == 200) {
          alert("User added to whitelist successfully!");
        } else {
          alert("Error adding user to whitelist: " + data.message);
        }
      });

      editServerWhitelistInput.value = "";
    });

    removeUserButton.addEventListener("click", () => {
      const usernameToRemove = editServerWhitelistInput.value;
      if (!usernameToRemove) {
        alert("Please enter a username to remove.");
        return;
      }

      sendToServer("/removeServerWhitelist", {
        serverId: window.location.pathname.split("/").pop(),
        usernameToRemove: usernameToRemove,
        username: currentUsername,
        loginToken
      }, (data) => {
        if (data.code == 200) {
          alert("User removed from whitelist successfully!");
        } else {
          alert("Error removing user from whitelist: " + data.message);
        }
      });

      editServerWhitelistInput.value = "";
    });

    deleteServerButton.addEventListener("click", () => {
      timesClickedDelete++;
      lastClickedDeleteTime = 2;
      
      deleteServerButton.innerText = `DELETE SERVER (${5 - timesClickedDelete})`;

      if (timesClickedDelete >= 5) {
        sendToServer("/deleteServer", {
          serverId: window.location.pathname.split("/").pop(),
          username: currentUsername,
          loginToken
        }, (data) => {
          if (data.code == 200) {
            alert("Server deleted successfully!");
            window.location.href = "/";
          } else {
            alert("Error deleting server: " + data.message);
          }
        });
      }
    });

    cancelChangesButton.addEventListener("click", () => {
      window.location.href = "/";
    });
  }
});

let lastTime = 0;
setInterval(() => {
  let currTime = performance.now();
  let dt = (currTime - lastTime) / 1000;
  lastTime = currTime;

  lastClickedDeleteTime -= dt;

  if (lastClickedDeleteTime <= 0) {
    timesClickedDelete = 0;
    const deleteServerButton = document.getElementById("DeleteServerButton");
    deleteServerButton.innerText = "DELETE SERVER";
  }
}, 100);