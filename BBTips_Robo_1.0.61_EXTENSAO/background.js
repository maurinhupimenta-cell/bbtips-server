const GRAPH_DATA_URLS = {
  1: "https://www.caramelotips.com.br/final/copa.json",
  2: "https://www.caramelotips.com.br/final/euro.json",
  3: "https://www.caramelotips.com.br/final/super.json",
  4: "https://www.caramelotips.com.br/final/premier.json",
  5: "https://www.caramelotips.com.br/final/split.json"
};

const graphDataCache = new Map();

async function fetchGraphData(liga) {
  const url = GRAPH_DATA_URLS[liga];
  if (!url) throw new Error("Liga invalida");
  const cached = graphDataCache.get(liga);
  if (cached && Date.now() - cached.ts < 15000) return cached.json;
  const response = await fetch(url, { cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  if (!Array.isArray(json?.table?.rows)) throw new Error("JSON sem linhas");
  graphDataCache.set(liga, { ts: Date.now(), json });
  return json;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "BBTIPS_FETCH_GRAPH_DATA") return false;
  const liga = Number(message.liga);
  fetchGraphData(liga)
    .then((json) => sendResponse({ ok: true, json }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true;
});
