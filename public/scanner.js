const API_BASE = location.origin;
const MIN_SAMPLE = 30;
const MIN_EV = 3;
const MIN_PROB = 52;
const MIN_ODD_PCT = 45;

const LIGAS = [
  [6, "Express"],
  [1, "Copa"],
  [2, "Euro"],
  [3, "Super"],
  [4, "Premier"],
  [5, "Split"]
];

const MARKETS = {
  over25: {
    name: "Over 2.5",
    aliases: ["o25", "over25", "over_25", "odd_over_2.5"],
    patterns: [/o25@?(\d+[,.]\d+)/ig, /over\s*2[,.]?5@?(\d+[,.]\d+)/ig],
    pays: score => score.t >= 3
  },
  ambas_sim: {
    name: "Ambas Sim",
    aliases: ["ambs", "ambas_sim", "odd_ambas_sim"],
    patterns: [/ambs@?(\d+[,.]\d+)/ig, /ambas\s*sim@?(\d+[,.]\d+)/ig],
    pays: score => score.a > 0 && score.b > 0
  },
  over35: {
    name: "Over 3.5",
    aliases: ["o35", "over35", "over_35", "odd_over_3.5"],
    patterns: [/o35@?(\d+[,.]\d+)/ig, /over\s*3[,.]?5@?(\d+[,.]\d+)/ig],
    pays: score => score.t >= 4
  }
};

const els = {
  market: document.getElementById("market"),
  refresh: document.getElementById("refresh"),
  all: document.getElementById("all"),
  user: document.getElementById("user"),
  pass: document.getElementById("pass"),
  login: document.getElementById("login"),
  logout: document.getElementById("logout"),
  session: document.getElementById("session"),
  last: document.getElementById("last"),
  count: document.getElementById("count"),
  leagues: document.getElementById("leagues"),
  games: document.getElementById("games")
};

const state = {
  token: localStorage.getItem("scanner_token") || "",
  username: localStorage.getItem("scanner_user") || "",
  rows: [],
  selectedLiga: null
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function normalizeKey(key) {
  return String(key).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

function parseTime(value) {
  const match = String(value || "").match(/^(\d{1,2})[.:](\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : null;
}

function resultAge(row) {
  const minute = parseTime(row.time);
  if (minute === null) return 99999 + Number(row.idx || 0) / 1000;
  const nowDate = new Date();
  const now = nowDate.getHours() * 60 + nowDate.getMinutes();
  let age = now - minute;
  if (age < 0) age += 1440;
  return age;
}

function futureDistance(row) {
  const minute = parseTime(row.time);
  if (minute === null) return 99999 + Number(row.idx || 0) / 1000;
  const nowDate = new Date();
  const now = nowDate.getHours() * 60 + nowDate.getMinutes();
  let diff = minute - now;
  if (diff < -720) diff += 1440;
  if (diff < 0) diff += 1440;
  return diff;
}

function scoreText(score) {
  return score ? `${score.a}-${score.b}` : "-";
}

function oddFromObj(odds, market) {
  if (!odds || typeof odds !== "object") return null;
  const map = {};
  Object.keys(odds).forEach(key => {
    const value = Number(String(odds[key]).replace(",", "."));
    if (Number.isFinite(value) && value > 1) map[normalizeKey(key)] = value;
  });
  for (const alias of market.aliases) {
    const value = map[normalizeKey(alias)];
    if (Number.isFinite(value) && value > 1) return value;
  }
  return null;
}

function oddsForMarket(row, market) {
  const fromObj = oddFromObj(row.odds, market);
  if (fromObj) return [fromObj];
  const out = [];
  const text = String(row.txt || "");
  market.patterns.forEach(re => {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text))) {
      const value = Number(String(match[1]).replace(",", "."));
      if (Number.isFinite(value) && value > 1) out.push(value);
    }
  });
  return out;
}

function teamNames(name) {
  return String(name || "").split(/\s+x\s+/i).map(x => x.toLowerCase().trim()).filter(Boolean);
}

function uniqueRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = String(row.key || [row.liga ?? "", row.time ?? "", row.name ?? "", scoreText(row.score), row.future ? "f" : "r"].join("|"));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function historyRows(liga, market) {
  return uniqueRows(state.rows)
    .filter(row => Number(row.liga) === Number(liga) && row.score && market.pays(row.score) !== null && !row.future)
    .sort((a, b) => resultAge(a) - resultAge(b));
}

function upcomingRows(liga, market) {
  return uniqueRows(state.rows)
    .filter(row => Number(row.liga) === Number(liga) && row.future && !row.score && oddsForMarket(row, market).length)
    .sort((a, b) => futureDistance(a) - futureDistance(b))
    .slice(0, 12);
}

function pct(rows, market) {
  if (!rows.length) return null;
  const wins = rows.filter(row => market.pays(row.score)).length;
  return wins / rows.length * 100;
}

function calcLine(history, market) {
  const windows = [120, 240, 480, 960];
  return windows.map(w => {
    const arr = history.slice(0, w);
    const p = pct(arr, market);
    let min = null;
    if (history.length >= w) {
      const vals = [];
      for (let i = 0; i <= history.length - w; i += 1) {
        vals.push(pct(history.slice(i, i + w), market));
      }
      min = Math.min(...vals.filter(Number.isFinite));
    }
    return { w, j: arr.length, g: arr.filter(row => market.pays(row.score)).length, p, min };
  });
}

function teamPayPct(game, history, market) {
  const names = teamNames(game.name);
  if (!names.length) return null;
  const rows = history.filter(row => {
    const text = String(row.name || row.txt || "").toLowerCase();
    return names.some(name => text.includes(name));
  });
  if (rows.length < MIN_SAMPLE) return null;
  return { g: rows.filter(row => market.pays(row.score)).length, j: rows.length, p: pct(rows, market) };
}

function oddPayPct(odd, history, market) {
  const rows = history.filter(row => oddsForMarket(row, market).some(value => Math.abs(value - odd) <= 0.05));
  if (rows.length < MIN_SAMPLE) return null;
  return { g: rows.filter(row => market.pays(row.score)).length, j: rows.length, p: pct(rows, market) };
}

function weightedProb(lineP, team, odd) {
  const hasSpecific = (team && Number.isFinite(team.p)) || (odd && Number.isFinite(odd.p));
  if (!hasSpecific) return null;
  const parts = [];
  if (Number.isFinite(lineP)) parts.push({ v: lineP, w: 2 });
  if (team && Number.isFinite(team.p)) parts.push({ v: team.p, w: 5 });
  if (odd && Number.isFinite(odd.p)) parts.push({ v: odd.p, w: 5 });
  const sw = parts.reduce((sum, part) => sum + part.w, 0);
  return parts.reduce((sum, part) => sum + part.v * part.w, 0) / sw;
}

function analyzeGame(row, history, line, market) {
  const oddValue = oddsForMarket(row, market)[0];
  const line480 = line.find(item => item.w === 480) || line.find(item => item.p !== null) || {};
  const team = teamPayPct(row, history, market);
  const odd = oddPayPct(oddValue, history, market);
  const prob = weightedProb(line480.p, team, odd);
  const fairOdd = prob ? 100 / prob : null;
  const breakEven = oddValue ? 100 / oddValue : null;
  const edge = prob !== null && breakEven !== null ? prob - breakEven : null;
  const ev = prob !== null && oddValue ? (prob / 100 * oddValue - 1) * 100 : null;
  const coldOdd = odd && odd.j >= MIN_SAMPLE && odd.p < MIN_ODD_PCT;
  let status = "SEM BASE";
  let rank = 0;
  if (coldOdd) {
    status = "ODD FRIA";
    rank = 1;
  } else if (ev !== null && ev < 0) {
    status = "EV NEGATIVO";
    rank = 1;
  } else if (ev !== null && (ev < MIN_EV || edge < 3 || prob < MIN_PROB)) {
    status = "EDGE BAIXO";
    rank = 1;
  } else if (ev !== null && ev >= 8 && edge >= 5) {
    status = "ENTRAR";
    rank = 3;
  } else if (ev !== null) {
    status = "OBSERVAR";
    rank = 2;
  }
  return { row, oddValue, line480, team, odd, prob, fairOdd, edge, ev, coldOdd, status, rank };
}

function clsFor(status) {
  if (status === "ENTRAR") return "ok";
  if (status === "OBSERVAR" || status === "EDGE BAIXO") return "warn";
  return "bad";
}

function leagueClass(status) {
  if (status === "ENTRAR") return "enter";
  if (status === "OBSERVAR") return "watch";
  if (status === "SEM DADOS") return "empty";
  return "block";
}

function fmtPct(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "-";
}

function fmtNum(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "-";
}

function summarize() {
  const market = MARKETS[els.market.value] || MARKETS.over25;
  return LIGAS.map(([liga, name]) => {
    const history = historyRows(liga, market);
    const line = calcLine(history, market);
    const upcoming = upcomingRows(liga, market).map(row => analyzeGame(row, history, line, market));
    upcoming.sort((a, b) => b.rank - a.rank || (b.ev ?? -999) - (a.ev ?? -999) || futureDistance(a.row) - futureDistance(b.row));
    const best = upcoming[0] || null;
    const last8 = history.slice(0, 8);
    const status = best ? best.status : "SEM DADOS";
    return { liga, name, history, line, upcoming, best, last8, status };
  });
}

function render() {
  const summaries = summarize();
  els.leagues.innerHTML = summaries.map(item => {
    const best = item.best;
    const last8Wins = item.last8.filter(row => MARKETS[els.market.value].pays(row.score)).length;
    const line480 = item.line.find(row => row.w === 480) || {};
    return `
      <article class="league ${leagueClass(item.status)} ${state.selectedLiga === item.liga ? "active" : ""}" data-liga="${item.liga}">
        <h2>${esc(item.name)} <span class="tag ${leagueClass(item.status)}">${esc(item.status)}</span></h2>
        <div class="small">Historico: <span class="strong">${item.history.length}</span> resultados</div>
        <div class="small">Ultimos 8: <span class="strong">${last8Wins}/${item.last8.length}</span></div>
        <div class="small">Linha 480: <span class="strong">${fmtPct(line480.p)}</span></div>
        <div class="small">Melhor: <span class="strong">${best ? `${esc(best.row.time)} ${esc(best.row.name)}` : "--"}</span></div>
        <div class="small">EV: <span class="${best && best.ev >= 0 ? "ok" : "bad"}">${best ? fmtNum(best.ev) + "%" : "--"}</span></div>
      </article>
    `;
  }).join("");

  els.leagues.querySelectorAll(".league").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedLiga = Number(card.dataset.liga);
      render();
    });
  });

  const games = summaries
    .filter(item => !state.selectedLiga || item.liga === state.selectedLiga)
    .flatMap(item => item.upcoming.map(game => ({ ...game, liga: item.liga, ligaName: item.name, history: item.history })))
    .sort((a, b) => b.rank - a.rank || (b.ev ?? -999) - (a.ev ?? -999) || futureDistance(a.row) - futureDistance(b.row))
    .slice(0, 80);

  els.games.innerHTML = games.length ? games.map(game => {
    const lineText = game.line480.j ? `480: ${game.line480.g}/${game.line480.j} ${fmtPct(game.line480.p)} min ${fmtPct(game.line480.min)}` : "sem linha";
    const teamText = game.team ? `${game.team.g}/${game.team.j} ${fmtPct(game.team.p)}` : "sem base";
    const oddText = game.odd ? `${game.odd.g}/${game.odd.j} ${fmtPct(game.odd.p)}${game.coldOdd ? " ODD FRIA" : ""}` : "sem base";
    return `
      <tr>
        <td>${esc(game.ligaName)}</td>
        <td>${esc(game.row.time || "-")}</td>
        <td>${esc(game.row.name || "-")}</td>
        <td class="num">${game.oddValue ? game.oddValue.toFixed(2) : "-"}</td>
        <td class="${clsFor(game.status)}">${esc(game.status)}</td>
        <td>
          Prob ${fmtPct(game.prob)}<br>
          Odd justa ${game.fairOdd ? game.fairOdd.toFixed(2) : "-"}<br>
          Edge ${fmtPct(game.edge)}<br>
          EV real <span class="${game.ev >= 0 ? "ok" : "bad"}">${fmtNum(game.ev)}%</span>
        </td>
        <td>
          Times: ${teamText}<br>
          Odd: ${oddText}
        </td>
        <td>${lineText}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="8" class="muted">Sem jogos coletados ainda. Deixe uma aba do BBTips aberta com a extensao ativa e clique Atualizar.</td></tr>`;
}

async function login() {
  const username = els.user.value.trim();
  const password = els.pass.value.trim();
  if (!username || !password) return;
  els.session.textContent = "entrando...";
  let response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  let data = await response.json().catch(() => ({}));
  if (!data.ok) {
    response = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    data = await response.json().catch(() => ({}));
  }
  if (!data.ok || !data.token) {
    els.session.textContent = data.error || "login invalido";
    return;
  }
  state.token = data.token;
  state.username = username;
  localStorage.setItem("scanner_token", state.token);
  localStorage.setItem("scanner_user", state.username);
  els.pass.value = "";
  await loadData();
}

async function loadData() {
  if (!state.token) {
    els.session.textContent = "deslogado";
    return;
  }
  els.session.textContent = `logado: ${state.username || "usuario"}`;
  const response = await fetch(`${API_BASE}/api/scanner-data?limit=80`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!data.ok) {
    els.session.textContent = data.error || "sem acesso";
    return;
  }
  state.rows = Array.isArray(data.rows) ? data.rows : [];
  els.count.textContent = `${data.count || state.rows.length} linhas`;
  els.last.textContent = data.lastEventAt ? `ultimo envio: ${new Date(data.lastEventAt).toLocaleTimeString()}` : "sem envio";
  render();
}

els.login.addEventListener("click", login);
els.logout.addEventListener("click", () => {
  state.token = "";
  state.username = "";
  state.rows = [];
  localStorage.removeItem("scanner_token");
  localStorage.removeItem("scanner_user");
  els.session.textContent = "deslogado";
  render();
});
els.refresh.addEventListener("click", loadData);
els.all.addEventListener("click", () => {
  state.selectedLiga = null;
  render();
});
els.market.addEventListener("change", render);

els.user.value = state.username;
render();
if (state.token) loadData();
setInterval(loadData, 30000);
