const inviteDiv = `
  <div id="Invite">
    <span id="InviteServerName">Test Server</span>
    <span>&nbsp;</span>
    <button class="AcceptInvite" data-server-id="83dc8539-a86d-4344-b7c2-c73858287296">Accept invite</button>
    <span>&nbsp;</span>
    <button class="DeclineInvite" data-server-id="83dc8539-a86d-4344-b7c2-c73858287296">Decline invite</button>
  </div>
`;

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

const loginToken = localStorage.getItem("loginToken");
const username = localStorage.getItem("username");

function refreshInvites() {
  const invitesDiv = document.getElementById("Invites");
  sendToServer("/getServerInvites", { loginToken, username }, (data) => {
    invitesDiv.innerHTML = "";
    data.invites.forEach((invite) => {
      const inviteElement = document.createElement("div");
      inviteElement.innerHTML = inviteDiv;
      inviteElement.querySelector("#InviteServerName").innerText = invite.serverName;
      inviteElement.querySelector(".AcceptInvite").dataset.serverId = invite.serverId;
      inviteElement.querySelector(".DeclineInvite").dataset.serverId = invite.serverId;

      invitesDiv.appendChild(inviteElement);
    });

    if (data.invites.length === 0) {
      invitesDiv.innerHTML = "<span>No invites found</span>";
      return;
    }

    const acceptButtons = document.querySelectorAll(".AcceptInvite");
    acceptButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const serverId = button.dataset.serverId;
        sendToServer("/acceptServerInvite", { loginToken, username, serverId }, (data) => {
          if (data.code === 200) {
            alert("Invite accepted");
            window.location.href = "/server/" + serverId;
          } else {
            alert("Error accepting invite: " + data.message);
          }
        });
      });
    });

    const declineButtons = document.querySelectorAll(".DeclineInvite");
    declineButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const serverId = button.dataset.serverId;
        sendToServer("/declineServerInvite", { loginToken, username, serverId }, (data) => {
          if (data.code === 200) {
            alert("Invite declined");
            button.parentElement.remove();
          } else {
            alert("Error declining invite: " + data.message);
          }
        });
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!loginToken) {
    window.location.href = "/sign-in";
    return;
  }

  refreshInvites();

  setInterval(refreshInvites, 5000);
});