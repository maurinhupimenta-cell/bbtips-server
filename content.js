const SCRIPT_ID = "bbtips-robo-injected-script";
const API_BASE = "https://bbtips-server-production.up.railway.app";
let CHECK_TIMER = null;
let LAST_BRIDGE_SEND = 0;

function injectRemoteConfig(apiBase, token, username) {
  const cfg = document.createElement("script");
  cfg.textContent = `window.__BBTIPS_REMOTE_CONFIG=${JSON.stringify({
    apiBase,
    token: String(token || ""),
    username: username || ""
  })};`;
  (document.head || document.documentElement).appendChild(cfg);
  cfg.remove();
}

async function sendCollectorRows(rows, sentAt) {
  const now = Date.now();
  if (!Array.isArray(rows) || !rows.length || now - LAST_BRIDGE_SEND < 35000) return;
  LAST_BRIDGE_SEND = now;
  const res = await chrome.storage.local.get(["bbtips_token", "bbtips_api_base"]);
  const token = res.bbtips_token || "";
  if (!token) return;
  const apiBase = res.bbtips_api_base || API_BASE;
  await fetch(`${apiBase}/api/telemetry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      kind: "collector_rows",
      sentAt: sentAt ? new Date(sentAt).toISOString() : new Date().toISOString(),
      url: location.href,
      source: "content_bridge",
      rows
    })
  }).catch(() => {});
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data || {};
  if (msg.type !== "BBTIPS_AGENT_ROWS" || msg.source !== "bbtips_extension") return;
  sendCollectorRows(msg.rows, msg.sentAt);
});

async function injectRobot() {
  if (document.getElementById(SCRIPT_ID)) return;
  const res = await chrome.storage.local.get(["bbtips_token", "bbtips_api_base", "bbtips_user"]);
  const apiBase = res.bbtips_api_base || API_BASE;
  const token = res.bbtips_token || "";
  injectRemoteConfig(apiBase, token, res.bbtips_user || "");
  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = `${apiBase}/api/robo.js?token=${encodeURIComponent(token)}&v=${Date.now()}`;
  s.onload = () => s.remove();
  s.onerror = () => {
    s.remove();
    const fallback = document.createElement("script");
    fallback.id = SCRIPT_ID;
    fallback.src = chrome.runtime.getURL("robot.js") + "?v=" + Date.now();
    fallback.onload = () => fallback.remove();
    (document.head || document.documentElement).appendChild(fallback);
  };
  (document.head || document.documentElement).appendChild(s);
}

function removeRobotPanel() {
  const cleanup = document.createElement("script");
  cleanup.textContent = `
    try {
      clearInterval(window.BBTIPS_FINAL_ROBO_TIMER);
      clearInterval(window.BBTIPS_API_ALERTAS_TIMER);
      clearInterval(window.BBTIPS_INTERCEPTA_API_TIMER);
      clearInterval(window.BBTIPS_PRO_TRADER_TIMER);
      clearInterval(window.HB_MULTI_TIMER);
      document.getElementById('bbtips-final-robo')?.remove();
      document.getElementById('bbtips-final-robo-style')?.remove();
      document.getElementById('bbtips-api-alertas')?.remove();
      document.getElementById('bbtips-intercepta-api')?.remove();
      document.getElementById('hb-multi')?.remove();
      document.getElementById('hb-tips-scanner')?.remove();
      document.getElementById('bbtips-robo-root')?.remove();
      document.getElementById('bbtips-robo-canvas')?.remove();
      document.getElementById('bbtips-robo-desenho')?.remove();
      document.getElementById('bbtips-marker-handle')?.remove();
    } catch(e) {}
  `;
  (document.head || document.documentElement).appendChild(cleanup);
  cleanup.remove();
}

async function checkLicenseOnce() {
  const res = await chrome.storage.local.get(["bbtips_active", "bbtips_user", "bbtips_token"]);
  if (!res.bbtips_active || !res.bbtips_user || !res.bbtips_token) return false;

  try {
    const response = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: res.bbtips_user, token: res.bbtips_token })
    });

    const data = await response.json();

    if (!data.ok || !data.active) {
      await chrome.storage.local.set({ bbtips_active: false, bbtips_token: "" });
      removeRobotPanel();
      alert("Seu acesso foi encerrado pelo administrador.");
      return false;
    }

    return true;
  } catch (e) {
    // Se internet/servidor falhar, não derruba imediatamente para evitar falso bloqueio.
    return true;
  }
}

function startRemoteCheck() {
  if (CHECK_TIMER) clearInterval(CHECK_TIMER);
  CHECK_TIMER = setInterval(async () => {
    await checkLicenseOnce();
  }, 3000);
}

chrome.storage.local.get(["bbtips_active"], async (res) => {
  if (res.bbtips_active) {
    const ok = await checkLicenseOnce();
    if (ok) await injectRobot();
  }
  startRemoteCheck();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "BBTIPS_INJECT") {
    checkLicenseOnce().then(async (ok) => {
      if (ok) await injectRobot();
      sendResponse({ ok });
    });
    return true;
  }

  if (msg?.type === "BBTIPS_REMOVE") {
    removeRobotPanel();
    sendResponse({ ok: true });
  }
});
