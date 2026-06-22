const API_BASE = "https://bbtips-server-production.up.railway.app";

const loginInput = document.getElementById("login");
const passwordInput = document.getElementById("password");
const statusEl = document.getElementById("status");
const activateBtn = document.getElementById("activate");
const logoutBtn = document.getElementById("logout");

function setStatus(text, cls = "info") {
  statusEl.textContent = text;
  statusEl.className = cls;
}

function isSupportedTab(tab) {
  return /^https?:\/\/([^/]+\.)?(bbtips\.com\.br|bbtips\.com|thtips\.com\.br|caramelotips\.com\.br)\//i.test(tab?.url || "");
}

async function injectDirect(tab, type, cfg = {}) {
  if (!tab?.id || !isSupportedTab(tab)) return false;

  if (type === "BBTIPS_REMOVE") {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        try {
          clearInterval(window.BBTIPS_FINAL_ROBO_TIMER);
          clearInterval(window.BBTIPS_API_ALERTAS_TIMER);
          clearInterval(window.BBTIPS_INTERCEPTA_API_TIMER);
          clearInterval(window.BBTIPS_PRO_TRADER_TIMER);
          clearInterval(window.BBTIPS_SCANNER_COLLECT_TIMER);
          clearInterval(window.BBTIPS_ROBO_ALERT_TIMER);
          clearInterval(window.__BBTIPS_GRAPH_ROBO_TIMER);
          clearInterval(window.HB_MULTI_TIMER);
          document.getElementById("bbtips-final-robo")?.remove();
          document.getElementById("bbtips-final-robo-style")?.remove();
          document.getElementById("bbtips-api-alertas")?.remove();
          document.getElementById("bbtips-intercepta-api")?.remove();
          document.getElementById("hb-multi")?.remove();
          document.getElementById("hb-tips-scanner")?.remove();
          document.getElementById("bbtips-robo-root")?.remove();
          document.getElementById("bbtips-robo-canvas")?.remove();
          document.getElementById("bbtips-robo-desenho")?.remove();
          document.getElementById("bbtips-marker-handle")?.remove();
        } catch (e) {}
      }
    });
    return true;
  }

  const robotUrl = chrome.runtime.getURL("robot.js") + "?v=" + Date.now();
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: (remoteConfig, src) => {
      window.__BBTIPS_REMOTE_CONFIG = remoteConfig;
      document.getElementById("bbtips-robo-injected-script")?.remove();
      const s = document.createElement("script");
      s.id = "bbtips-robo-injected-script";
      s.src = src;
      s.onload = () => s.remove();
      s.onerror = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    },
    args: [cfg, robotUrl]
  });
  return true;
}

async function sendToCurrentTab(type, cfg = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return false;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type });
    if (type === "BBTIPS_INJECT" && response?.ok === false) {
      return await injectDirect(tab, type, cfg);
    }
    return true;
  } catch (e) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      const response = await chrome.tabs.sendMessage(tab.id, { type });
      if (type === "BBTIPS_INJECT" && response?.ok === false) {
        return await injectDirect(tab, type, cfg);
      }
      return true;
    } catch (err) {
      try {
        return await injectDirect(tab, type, cfg);
      } catch (directErr) {
        return false;
      }
    }
  }
}

chrome.storage.local.get(["bbtips_user", "bbtips_token", "bbtips_active"], (res) => {
  if (res.bbtips_user) loginInput.value = res.bbtips_user;
  setStatus(res.bbtips_active ? "Logado e ativo." : "Faça login para ativar.", res.bbtips_active ? "ok" : "info");
});

activateBtn.addEventListener("click", async () => {
  const user = loginInput.value.trim();
  const password = passwordInput.value.trim();

  if (!user || !password) {
    setStatus("Digite login e senha.", "bad");
    return;
  }

  setStatus("Conectando ao servidor...", "info");

  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, user, password })
    });

    const data = await response.json();

    if (!data.ok || !data.token) {
      await chrome.storage.local.set({ bbtips_active: false, bbtips_user: user, bbtips_token: "" });
      await sendToCurrentTab("BBTIPS_REMOVE");
      setStatus(data.message || data.error || "Login bloqueado ou inválido.", "bad");
      return;
    }

    await chrome.storage.local.set({
      bbtips_active: true,
      bbtips_user: user,
      bbtips_token: data.token,
      bbtips_api_base: API_BASE
    });

    const injectCfg = {
      apiBase: API_BASE,
      token: String(data.token || ""),
      username: user
    };
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const sent = await injectDirect(tab, "BBTIPS_INJECT", injectCfg)
      || await sendToCurrentTab("BBTIPS_INJECT", injectCfg);
    setStatus(sent ? "Login OK. Robô ativado." : "Login OK. Abra/recarregue o site BBTips.", "ok");
  } catch (e) {
    setStatus("Servidor offline ou sem conexão.", "bad");
  }
});

logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ bbtips_active: false, bbtips_token: "" });
  await sendToCurrentTab("BBTIPS_REMOVE");
  setStatus("Desativado neste navegador.", "info");
});
