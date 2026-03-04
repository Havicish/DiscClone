window.addEventListener("error", (event) => {
  console.error("Error occurred:", event.error);
  alert("An error occurred: " + event.error.message);
});

document.addEventListener("DOMContentLoaded", () => {
  const loginToken = localStorage.getItem("loginToken");
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  if (window.location.href.includes("edit-server/new")) {
    document.getElementById("Create").style.display = "block";
    document.getElementById("Edit").style.display = "none";

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
          username: usernameToAdd,
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
          username: usernameToRemove,
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

    document.getElementById("CancelChangesButton").addEventListener("click", () => {
      window.location.href = "/";
    });
  }
});