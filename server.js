const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const USERS_FILE = "./users.json";

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

app.post("/api/login", (req, res) => {
  const { user, password } = req.body;

  const users = loadUsers();

  const found = users.find(
    u => u.user === user && u.password === password
  );

  if (!found) {
    return res.json({ ok: false });
  }

  res.json({
    ok: true,
    active: true,
    token: "bbtips_token"
  });
});

app.post("/api/check", (req, res) => {
  res.json({
    ok: true,
    active: true
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor online");
});
