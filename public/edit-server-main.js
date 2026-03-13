let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
backendURL = location.origin;

let currentUsername = localStorage.getItem("username");

let timesClickedDelete = 0;
let lastClickedDeleteTime = 0;

window.addEventListener("error", (event) => {
  console.error("Error occurred:", event.error);
  alert("An error occurred: " + event.error.message);
});

function getServerName(loginToken, serverId) {
  fetch(backendURL + "/getServerName", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginToken, username: currentUsername, serverId }),
  }).then((response) => response.json())
    .then((data) => {
      if (typeof data == "string") {
        document.getElementById("ServerName").innerText = "Edit the " + data + " server";
        document.title = "Edit " + data + " - Symphony";
      } else {
        document.getElementById("ServerName").innerText = "Access denied";
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

  if (window.location.href.includes("edit-server/new")) {
    document.getElementById("Create").style.display = "block";
    document.getElementById("Edit").style.display = "none";

    document.title = "Make a server - Symphony";

    document.getElementById("CancelServerButton").addEventListener("click", () => {
      window.location.href = "/";
    });

    document.getElementById("CreateServerButton").addEventListener("click", () => {
      
      const serverName = document.getElementById("ServerNameInput").value;
      if (!serverName) {
        alert("Please enter a server name.");
        return;
      }

      fetch("/createServer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: serverName,
          loginToken: loginToken,
          username: currentUsername
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            window.location.href = "/server/" + data.serverId;
          } else {
            alert("Error creating server: " + data.message);
          }
        })
        .catch((err) => {
          console.error("Error creating server:", err);
          alert("An error occurred while creating the server.");
        });
    });
  } else {
    document.getElementById("Create").style.display = "none";
    document.getElementById("Edit").style.display = "block";

    getServerName(loginToken, window.location.pathname.split("/").pop());

    document.getElementById("SaveChangesButton").addEventListener("click", () => {
      fetch("/editServer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId: window.location.pathname.split("/").pop(),
          name: document.getElementById("EditServerNameInput").value,
          loginToken: loginToken,
          username: currentUsername
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("Server updated successfully!");
            window.location.href = "/server/" + data.serverId;
          } else {
            alert("Error editing server: " + data.message);
          }
        })
        .catch((err) => {
          console.error("Error editing server:", err);
          alert("An error occurred while editing the server.");
        });
    });

    document.getElementById("AddUserButton").addEventListener("click", () => {
      const usernameToAdd = document.getElementById("EditServerWhitelistInput").value;
      if (!usernameToAdd) {
        alert("Please enter a username to add.");
        return;
      }

      fetch("/addServerWhitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId: window.location.pathname.split("/").pop(),
          usernameToAdd: usernameToAdd,
          username: currentUsername,
          loginToken
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("User added to whitelist successfully!");
          } else {
            alert("Error adding user to whitelist: " + data.message);
          }
        })
        .catch((err) => {
          console.error("Error adding user to whitelist:", err);
          alert("An error occurred while adding the user to the whitelist.");
        });

      document.getElementById("EditServerWhitelistInput").value = "";
    });

    document.getElementById("RemoveUserButton").addEventListener("click", () => {
      const usernameToRemove = document.getElementById("EditServerWhitelistInput").value;
      if (!usernameToRemove) {
        alert("Please enter a username to remove.");
        return;
      }

      fetch("/removeServerWhitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId: window.location.pathname.split("/").pop(),
          usernameToRemove: usernameToRemove,
          username: currentUsername,
          loginToken
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("User removed from whitelist successfully!");
          } else {
            alert("Error removing user from whitelist: " + data.message);
          }
        })
        .catch((err) => {
          console.error("Error removing user from whitelist:", err);
          alert("An error occurred while removing the user from the whitelist.");
        });

      document.getElementById("EditServerWhitelistInput").value = "";
    });

    document.getElementById("DeleteServerButton").addEventListener("click", () => {
      timesClickedDelete++;
      lastClickedDeleteTime = 2;
      
      document.getElementById("DeleteServerButton").innerText = `DELETE SERVER (${5 - timesClickedDelete})`;

      if (timesClickedDelete >= 5) {
        fetch("/deleteServer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serverId: window.location.pathname.split("/").pop(),
            username: currentUsername,
            loginToken
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              alert("Server deleted successfully!");
              window.location.href = "/";
            } else {
              alert("Error deleting server: " + data.message);
            }
          })
          .catch((err) => {
            console.error("Error deleting server:", err);
            alert("An error occurred while deleting the server.");
          });
      }
    });

    document.getElementById("CancelChangesButton").addEventListener("click", () => {
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
    document.getElementById("DeleteServerButton").innerText = "DELETE SERVER";
  }
}, 100);