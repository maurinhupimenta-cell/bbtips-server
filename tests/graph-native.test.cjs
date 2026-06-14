const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("robo.js", "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `funcao ${name} nao encontrada`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`funcao ${name} incompleta`);
}

const functions = [
  "isCarameloGraphPage",
  "desiredNativeMarket",
  "nativeMarketKey",
  "nativeMarketValue",
  "marketCandidate",
  "selectedControlMarket",
  "activeChipMarket",
  "storedNativeMarket",
  "resolveNativeMarket",
  "nativeMarketPays",
  "internalResultsFromLoadedJson",
  "calculateNativeSeries",
  "readNativeGraphData"
];

const runtimeCode = [
  "let internalResultsCacheSource = null;",
  "let internalResultsCache = [];",
  ...functions.map(extractFunction),
  "function nativeMacdHistogram(values) { return values.map(() => 0); }",
  "result = readNativeGraphData();"
].join("\n");

function resultCell(home, away, htHome = 0, htAway = 0) {
  return { v: `Casa x Fora${home}-${away}\n${htHome}-${htAway} o25@2.20 ambs@2.00\n01` };
}

function rowsFromScores(scores) {
  const rows = [];
  for (let offset = 0; offset < scores.length; offset += 20) {
    const cells = scores.slice(offset, offset + 20).map((score) => resultCell(...score));
    rows.push({ c: [{ v: String(rows.length) }, ...cells.reverse()] });
  }
  return rows;
}

function run({ cfg, points = [], rows = null, selectedMarket = "", scannerMarket = "over25" }) {
  const elements = {
    graficoPrincipalNovoPanel: { querySelectorAll: () => [] },
    grafico: { closest: () => null },
    linhaFT: { value: selectedMarket },
    qtd: { value: "120" }
  };
  const context = {
    window: {
      __gpLastCfg: cfg,
      __ultimoPontosSelecionado: points,
      LOADED_JSON: rows ? { table: { rows } } : null,
      BBTipsRobo: { config: { market: scannerMarket } }
    },
    document: {
      getElementById: (id) => elements[id] || null,
      querySelector: () => null,
      querySelectorAll: () => []
    },
    location: { hostname: "www.caramelotips.com.br" },
    localStorage: { getItem: () => null },
    Array,
    Boolean,
    JSON,
    Map,
    Math,
    Number,
    Set,
    String,
    result: null
  };
  vm.createContext(context);
  vm.runInContext(runtimeCode, context);
  return context.result;
}

const scores = Array.from({ length: 60 }, (_, index) => {
  if (index < 20) return [3, 1, 0, 0];
  if (index < 40) return [0, 1, 0, 0];
  return index % 2 ? [2, 1, 0, 0] : [0, 0, 0, 0];
});
const rows = rowsFromScores(scores);
const directPoints = Array.from({ length: 120 }, (_, index) => 20 + index % 10);

const direct = run({
  cfg: { tipoLinha: "over25", pontosSelecionado: directPoints },
  selectedMarket: "over25",
  rows
});
assert.equal(direct.points.length, 120);
assert.match(direct.sourcePath, /__gpLastCfg/);

const recalculated = run({
  cfg: { pontosSelecionado: directPoints },
  points: directPoints,
  rows,
  scannerMarket: "over25"
});
assert.equal(recalculated.points.length, 41);
assert.match(recalculated.sourcePath, /CONTAGEM EXATA/);
assert.notEqual(recalculated.points.at(-1).v, 99);

const waiting = run({
  cfg: { pontosSelecionado: directPoints },
  points: directPoints,
  scannerMarket: "over25"
});
assert.equal(waiting.waiting, true);

const parsedFt = recalculated.points.map((point) => point.v);
assert.ok(Math.max(...parsedFt) > Math.min(...parsedFt), "a serie FT nao pode ficar plana pelo HT 0-0");

console.log("graph-native: ok");
