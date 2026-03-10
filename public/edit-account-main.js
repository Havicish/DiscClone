window.addEventListener("error", (err) => {
  alert(err.error);
});

let backendURL = "https://humble-potato-977rxx7grjw5fgg-3000.app.github.dev";
backendURL = location.origin;

let currentUsername = localStorage.getItem("username");
let currentLoginToken = localStorage.getItem("loginToken");
let currentServerId = location.pathname.split("/")[1] === "server" ? location.pathname.split("/")[2] : null;

function HEXtoHSL(hex) {
  // 1. Convert HEX to RGB (0-255 range)
  let r = 0, g = 0, b = 0;
  hex = hex.replace(/#/g, '');

  if (hex.length === 3) {
    r = "0x" + hex[0] + hex[0];
    g = "0x" + hex[1] + hex[1];
    b = "0x" + hex[2] + hex[2];
  } else if (hex.length === 6) {
    r = "0x" + hex.slice(0, 2);
    g = "0x" + hex.slice(2, 4);
    b = "0x" + hex.slice(4, 6);
  } else {
    return null; // Invalid hex format
  }

  // Convert to 0-1 range for HSL calculation
  r /= 255;
  g /= 255;
  b /= 255;

  // 2. Convert RGB to HSL (mathematical formulas)
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // Achromatic (gray)
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Convert HSL to the standard range (degrees for H, percentage for S and L)
  s = s * 100;
  l = l * 100;
  h = h * 360;

  return { h: Math.round(h), s: Math.round(s), l: Math.round(l) };
};

function HSLToHex(hsl) {
  h = hsl.h;
  s = hsl.s;
  l = hsl.l;

  // Convert saturation and lightness to decimals
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  // Convert RGB decimal values to 0-255 range and then to hex
  r = Math.round((r + m) * 255).toString(16);
  g = Math.round((g + m) * 255).toString(16);
  b = Math.round((b + m) * 255).toString(16);

  // Pad single-digit hex values with a leading zero
  if (r.length === 1) r = '0' + r;
  if (g.length === 1) g = '0' + g;
  if (b.length === 1) b = '0' + b;

  return '#' + r + g + b;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!currentLoginToken) {
    window.location.href = "/sign-in";
    return;
  }

  const colorEle = document.getElementById("UsernameColor");
  colorEle.addEventListener("change", () => {
    const hsl = HEXtoHSL(colorEle.value);
    hsl.l = Math.max(30, hsl.l);
    colorEle.value = HSLToHex(hsl);
  });

  document.getElementById("CancelChangesButton").addEventListener("click", () => {
    window.location = "/";
  });

  document.getElementById("SaveChangesButton").addEventListener("click", () => {
    fetch(backendURL + "/saveAccountChanges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ loginToken: currentLoginToken, username: currentUsername, usernameColor: colorEle.value }),
    }).then((response) => response.json())
      .then((data) => {
        if (data.status == "success") {
          alert("Account saved successfully");
          window.location = "/";
        } else {
          alert("Error: " + data.message);
        }
      });
  });

  // check if token is valid, and sign in
  fetch(backendURL + "/validateToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginToken: currentLoginToken, username: currentUsername }),
  }).then((response) => response.json())
    .then((data) => {
      if (data.status == "success") {
        currentUsername = data.username;
      } else {
        localStorage.removeItem("loginToken");
        window.location.href = "/sign-in";
      }
    });
});