const createAccountButton = document.getElementById("CreateAccountButton");

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
      alert("Account created successfully!");
    } else {
      alert("Error creating account: " + data.message);
    }
  });
});