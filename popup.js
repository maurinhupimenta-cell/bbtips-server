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

async function sendToCurrentTab(type) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return false;

  try {
    await chrome.tabs.sendMessage(tab.id, { type });
    return true;
  } catch (e) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type });
      return true;
    } catch (err) {
      return false;
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

    if (!data.ok || !data.active || !data.token) {
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

    const sent = await sendToCurrentTab("BBTIPS_INJECT");
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
