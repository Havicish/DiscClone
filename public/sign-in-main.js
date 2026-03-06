const createAccountButton = document.getElementById("CreateAccountButton");
const loginButton = document.getElementById("SignInButton");

createAccountButton.addEventListener("click", () => {
  const username = document.getElementById("Username").value;
  const password = document.getElementById("Password").value;

  fetch("/createAccount", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
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

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status == "success") {
      alert("Login successful!");
      localStorage.setItem("loginToken", data.loginToken);
      localStorage.setItem("username", username);
      window.location.href = "/";
    } else {
      alert("Error logging in: " + data.message);
    }
  });
});