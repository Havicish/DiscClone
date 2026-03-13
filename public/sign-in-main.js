const createAccountButton = document.getElementById("CreateAccountButton");
const loginButton = document.getElementById("SignInButton");

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

createAccountButton.addEventListener("click", () => {
  const username = document.getElementById("Username").value;
  const password = document.getElementById("Password").value;

  sendToServer("/create-account", { username, password }, (data) => {
    if (data.code == 200) {
      localStorage.setItem("loginToken", data.loginToken);
      localStorage.setItem("username", username);
      alert("Account created successfully!");
      window.location.href = "/";
    } else {
      alert("Error creating account: " + data.message);
    }
  });
});

loginButton.addEventListener("click", () => {
  const username = document.getElementById("Username").value;
  const password = document.getElementById("Password").value;

  sendToServer("/login", { username, password }, (data) => {
    if (data.code == 200) {
      alert("Login successful!");
      localStorage.setItem("loginToken", data.loginToken);
      localStorage.setItem("username", username);
      window.location.href = "/";
    } else {
      alert("Error logging in: " + data.message);
    }
  });
});