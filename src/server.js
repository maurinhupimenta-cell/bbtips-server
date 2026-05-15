import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || "troque-essa-chave";
const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASS || "admin123";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL nao definido. No Railway, adicione um Postgres ao projeto.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : undefined
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function tokenFor(payload) {
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", jwtSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", jwtSecret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp < Date.now()) return null;
  return payload;
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = readToken(token);
  if (!payload || payload.type !== "admin") {
    return res.status(401).json({ ok: false, error: "admin nao autorizado" });
  }
  next();
}

function endOfBrazilDay(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(value);
  const [, y, m, d] = match;
  return new Date(`${y}-${m}-${d}T23:59:59-03:00`);
}

async function initDb() {
  await pool.query(`
    create table if not exists admins (
      id serial primary key,
      username text unique not null,
      password_hash text not null,
      created_at timestamptz default now()
    );
  `);

  await pool.query(`
    create table if not exists users (
      id serial primary key,
      username text unique not null,
      password_hash text not null,
      active boolean not null default true,
      expires_at timestamptz,
      note text default '',
      created_at timestamptz default now()
    );
  `);

  const hash = await bcrypt.hash(adminPass, 10);
  await pool.query(`
    insert into admins (username, password_hash)
    values ($1, $2)
    on conflict (username) do update set password_hash = excluded.password_hash
  `, [adminUser, hash]);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "bbtips-server" });
});

app.get("/api/robo.js", async (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = readToken(String(token || ""));
  if (!payload || !["user", "admin"].includes(payload.type)) {
    return res
      .status(401)
      .type("application/javascript")
      .send("console.error('BBTips: login nao autorizado para carregar o robo.');");
  }
  try {
    const file = await fs.readFile(path.join(process.cwd(), "robo.js"), "utf8");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.type("application/javascript").send(file);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .type("application/javascript")
      .send("console.error('BBTips: robo.js nao encontrado no servidor.');");
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  const found = await pool.query("select * from admins where username=$1", [username]);
  const admin = found.rows[0];
  if (!admin || !(await bcrypt.compare(password || "", admin.password_hash))) {
    return res.status(401).json({ ok: false, error: "login invalido" });
  }
  res.json({ ok: true, token: tokenFor({ type: "admin", username }) });
});

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  const rows = await pool.query(`
    select id, username, active, expires_at, note, created_at
    from users
    order by id desc
  `);
  res.json({ ok: true, users: rows.rows });
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const { username, password, active = true, expiresAt = null, note = "" } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "usuario e senha obrigatorios" });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(`
    insert into users (username, password_hash, active, expires_at, note)
    values ($1, $2, $3, $4, $5)
    on conflict (username) do update set
      password_hash = excluded.password_hash,
      active = excluded.active,
      expires_at = excluded.expires_at,
      note = excluded.note
    returning id, username, active, expires_at, note, created_at
  `, [username, hash, Boolean(active), endOfBrazilDay(expiresAt), note]);
  res.json({ ok: true, user: result.rows[0] });
});

app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const { active, expiresAt, note } = req.body || {};
  const result = await pool.query(`
    update users
    set active = coalesce($1, active),
        expires_at = $2,
        note = coalesce($3, note)
    where id = $4
    returning id, username, active, expires_at, note, created_at
  `, [active === undefined ? null : Boolean(active), endOfBrazilDay(expiresAt), note ?? null, req.params.id]);
  res.json({ ok: true, user: result.rows[0] });
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  await pool.query("delete from users where id=$1", [req.params.id]);
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  const found = await pool.query("select * from users where username=$1", [username]);
  const user = found.rows[0];
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    return res.status(401).json({ ok: false, error: "login invalido" });
  }
  if (!user.active) {
    return res.status(403).json({ ok: false, error: "usuario bloqueado" });
  }
  if (user.expires_at && endOfBrazilDay(user.expires_at).getTime() < Date.now()) {
    return res.status(403).json({ ok: false, error: "acesso vencido" });
  }
  res.json({
    ok: true,
    token: tokenFor({ type: "user", username }),
    user: { username: user.username, expiresAt: user.expires_at }
  });
});

initDb()
  .then(() => app.listen(port, () => console.log(`BBTips server on ${port}`)))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
