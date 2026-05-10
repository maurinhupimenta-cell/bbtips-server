const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL =
  process.env.BASE_URL ||
  "https://bbtips-server-production.up.railway.app";

const DB_FILE = path.join(__dirname, "users.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      admin: { password: "admin123" },
      users: {
        teste: {
          password: "123456",
          active: true,
          token: "",
          createdAt: new Date().toISOString()
        }
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function safe(v) {
  return String(v ?? "").replace(/[&<>"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[c]));
}

function isAdmin(req) {
  const db = loadDB();
  return req.query.admin === db.admin.password || req.body?.admin === db.admin.password;
}

app.get("/", (req, res) => {
  res.redirect("/admin");
});

app.post("/api/login", (req, res) => {
  const { user, password } = req.body || {};
  const db = loadDB();
  const u = db.users[String(user || "")];

  if (!u || u.password !== String(password || "")) {
    return res.json({ ok: false, active: false, message: "Login ou senha inválidos." });
  }

  if (!u.active) {
    return res.json({ ok: false, active: false, message: "Usuário desativado pelo admin." });
  }

  u.token = token();
  u.lastLogin = new Date().toISOString();

  saveDB(db);

  res.json({
    ok: true,
    active: true,
    token: u.token,
    user
  });
});

app.post("/api/check", (req, res) => {
  const { user, token: userToken } = req.body || {};
  const db = loadDB();
  const u = db.users[String(user || "")];

  if (!u || !u.active || !u.token || u.token !== userToken) {
    return res.json({ ok: false, active: false });
  }

  res.json({ ok: true, active: true });
});

app.get("/admin", (req, res) => {
  const db = loadDB();
  const admin = req.query.admin || "";
  const logged = admin === db.admin.password;

  const rows = Object.entries(db.users).map(([name, u]) => `
    <tr>
      <td>${safe(name)}</td>
      <td>${u.active ? "✅ Ativo" : "❌ Desativado"}</td>
      <td>${safe(u.lastLogin || "Nunca")}</td>
      <td>
        <form method="post" action="/admin/toggle" style="display:inline">
          <input type="hidden" name="admin" value="${safe(admin)}">
          <input type="hidden" name="user" value="${safe(name)}">
          <button>${u.active ? "Desativar agora" : "Ativar"}</button>
        </form>

        <form method="post" action="/admin/delete" style="display:inline">
          <input type="hidden" name="admin" value="${safe(admin)}">
          <input type="hidden" name="user" value="${safe(name)}">
          <button class="danger">Remover</button>
        </form>
      </td>
    </tr>
  `).join("");

  res.send(`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>BBTips Admin</title>

<style>
body{
font-family:Arial;
background:#101820;
color:white;
padding:24px;
}

input,button{
padding:10px;
margin:5px;
border-radius:6px;
border:0;
}

button{
background:#0b7189;
color:white;
font-weight:bold;
cursor:pointer;
}

.danger{
background:#a62323;
}

table{
width:100%;
border-collapse:collapse;
margin-top:20px;
}

td,th{
border:1px solid #314657;
padding:10px;
}

th{
background:#162331;
}

.box{
background:#162331;
padding:16px;
border-radius:10px;
margin-bottom:16px;
}

code{
color:#40ff7b;
word-break:break-all;
}
</style>
</head>

<body>

<h1>BBTips Admin</h1>

${!logged ? `
<div class="box">
<h3>Entrar como admin</h3>

<form method="get" action="/admin">
<input name="admin" placeholder="Senha admin" type="password">
<button>Entrar</button>
</form>

<p>Senha inicial: <b>admin123</b></p>
</div>
` : `

<div class="box">
<b>Logado.</b><br><br>

Guarde este link:
<br>

<code>${BASE_URL}/admin?admin=${safe(admin)}</code>
</div>

<div class="box">
<h3>Criar usuário</h3>

<form method="post" action="/admin/create">
<input type="hidden" name="admin" value="${safe(admin)}">
<input name="user" placeholder="login">
<input name="password" placeholder="senha">
<button>Criar</button>
</form>
</div>

<table>
<tr>
<th>Usuário</th>
<th>Status</th>
<th>Último login</th>
<th>Ações</th>
</tr>

${rows}

</table>
`}

</body>
</html>
`);
});

app.post("/admin/create", (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("admin inválido");

  const db = loadDB();

  const name = String(req.body.user || "").trim();
  const password = String(req.body.password || "").trim();

  if (name && password) {
    db.users[name] = {
      password,
      active: true,
      token: "",
      createdAt: new Date().toISOString()
    };
  }

  saveDB(db);

  res.redirect(`/admin?admin=${encodeURIComponent(req.body.admin)}`);
});

app.post("/admin/toggle", (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("admin inválido");

  const db = loadDB();

  const u = db.users[String(req.body.user || "")];

  if (u) {
    u.active = !u.active;

    if (!u.active) {
      u.token = "";
    }
  }

  saveDB(db);

  res.redirect(`/admin?admin=${encodeURIComponent(req.body.admin)}`);
});

app.post("/admin/delete", (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("admin inválido");

  const db = loadDB();

  delete db.users[String(req.body.user || "")];

  saveDB(db);

  res.redirect(`/admin?admin=${encodeURIComponent(req.body.admin)}`);
});

app.listen(PORT, () => {
  console.log(`BBTips servidor rodando: ${BASE_URL}/admin`);
});
