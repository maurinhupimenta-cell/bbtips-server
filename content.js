const SCRIPT_ID = "bbtips-robo-injected-script";
const API_BASE = "https://bbtips-server-production.up.railway.app";
let CHECK_TIMER = null;

function injectRobot() {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = chrome.runtime.getURL("robot.js") + "?v=" + Date.now();
  s.onload = () => s.remove();
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
    if (ok) injectRobot();
  }
  startRemoteCheck();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "BBTIPS_INJECT") {
    checkLicenseOnce().then((ok) => {
      if (ok) injectRobot();
      sendResponse({ ok });
    });
    return true;
  }

  if (msg?.type === "BBTIPS_REMOVE") {
    removeRobotPanel();
    sendResponse({ ok: true });
  }
});
