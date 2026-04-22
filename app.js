const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DATA = {
  ppMonthly: {
    steers: {
      7: 28.76,
      8: 24.22,
      9: 27.64,
      10: 30.82,
      11: 23.38,
      12: 57.77,
      1: 39.46,
      2: 42.10,
      3: 68.41,
      4: 47.80,
    },
    heifers: {
      7: 12.76,
      8: 10.65,
      9: 13.92,
      10: 9.26,
      11: 10.64,
      12: 37.84,
      1: 18.88,
      2: 39.16,
      3: 40.95,
      4: 37.36,
    },
  },
  tcfaLive5Yr: {
    steers: { 1: -1.15, 2: -1.21, 3: 0.88, 4: 2.28, 5: 7.60, 6: 2.80, 7: -0.49, 8: -0.33, 9: -0.90, 10: -0.06, 11: 0.77, 12: 1.01 },
    heifers:{ 1: -1.23, 2: -1.29, 3: 0.71, 4: 2.16, 5: 8.14, 6: 2.74, 7: -0.62, 8: -0.40, 9: -1.00, 10: -0.10, 11: 0.77, 12: 1.10 }
  }
};

const DEFAULTS = {
  buyPrice: 360,
  totalHead: 100,
  ownershipPct: 100,
  feederFutures: 295,
  liveFutures: 205,
  customSalePrice: 325,
  customLiveSalePrice: 215,
  basisMode: "seasonalShift",
  blendWeight: 60,
  interestRate: 7.25,
  deathLoss: 1,
  commissionPct: 2,
  equityBase: 30,
  riskFloorAdj: -15,
  conservativeAdj: -8,
  bullishAdj: 8,
  steerInWt: 325,
  steerOutWt: 675,
  steerCog: 0.8,
  steerAdg: 2.8,
  heiferInWt: 325,
  heiferOutWt: 650,
  heiferCog: 0.85,
  heiferAdg: 2.78,
};

const APP = {
  state: {
    activeTab: "steers",
  },
  els: {},
};

function init() {
  APP.els = {
    inputs: Array.from(document.querySelectorAll("input, select")),
    basisSummary: document.getElementById("basisSummary"),
    summaryGrid: document.getElementById("summaryGrid"),
    sensitivityGrid: document.getElementById("sensitivityGrid"),
    scenarioTables: document.getElementById("scenarioTables"),
    monthLogic: document.getElementById("monthLogic"),
    premiumDiagnostics: document.getElementById("premiumDiagnostics"),
    historicalTable: document.getElementById("historicalTable"),
    blendWeightValue: document.getElementById("blendWeightValue"),
    advancedToggle: document.getElementById("advancedToggle"),
    advancedPanelWrap: document.querySelector(".collapsible-block"),
    resetBtn: document.getElementById("resetBtn"),
  };

  const today = new Date();
  const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  document.getElementById("deliveryDate").value = dt.toISOString().slice(0, 10);

  APP.els.inputs.forEach((el) => el.addEventListener("input", update));
  APP.els.resetBtn.addEventListener("click", resetDefaults);
  APP.els.advancedToggle.addEventListener("click", toggleAdvanced);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      APP.state.activeTab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      update();
    });
  });

  resetDefaults();
}

function resetDefaults() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    const el = document.getElementById(key);
    if (!el) return;
    el.value = value;
  });
  const delivery = document.getElementById("deliveryDate");
  if (!delivery.value) {
    const dt = new Date();
    dt.setDate(dt.getDate() + 7);
    delivery.value = dt.toISOString().slice(0, 10);
  }
  APP.state.activeTab = "steers";
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === APP.state.activeTab));
  update();
}

function toggleAdvanced() {
  const wrap = APP.els.advancedPanelWrap;
  const isOpen = wrap.classList.toggle("open");
  APP.els.advancedToggle.setAttribute("aria-expanded", String(isOpen));
}

function num(id) {
  const val = parseFloat(document.getElementById(id).value);
  return Number.isFinite(val) ? val : 0;
}

function currentSettings() {
  return {
    buyPrice: num("buyPrice"),
    totalHead: num("totalHead"),
    ownershipPct: num("ownershipPct") / 100,
    feederFutures: num("feederFutures"),
    liveFutures: num("liveFutures"),
    customSalePrice: num("customSalePrice"),
    customLiveSalePrice: num("customLiveSalePrice"),
    basisMode: document.getElementById("basisMode").value,
    blendWeight: num("blendWeight") / 100,
    interestRate: num("interestRate") / 100,
    deathLoss: num("deathLoss") / 100,
    commissionPct: num("commissionPct") / 100,
    equityBase: num("equityBase") / 100,
    riskFloorAdj: num("riskFloorAdj"),
    conservativeAdj: num("conservativeAdj"),
    bullishAdj: num("bullishAdj"),
    steer: {
      inWt: num("steerInWt"),
      outWt: num("steerOutWt"),
      cog: num("steerCog"),
      adg: num("steerAdg"),
    },
    heifer: {
      inWt: num("heiferInWt"),
      outWt: num("heiferOutWt"),
      cog: num("heiferCog"),
      adg: num("heiferAdg"),
    },
    deliveryDate: document.getElementById("deliveryDate").value,
  };
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function seasonalShift(tcfaSeries, month) {
  const vals = Object.values(tcfaSeries);
  return (tcfaSeries[month] ?? 0) - mean(vals);
}

function ppAverage(sex) {
  return mean(Object.values(DATA.ppMonthly[sex]));
}

function ppMonthAvg(sex, month) {
  return DATA.ppMonthly[sex][month] ?? ppAverage(sex);
}

function deriveBasis(sex, month, mode, blendWeight) {
  const ppAvg = ppAverage(sex);
  const ppMonthlyValue = ppMonthAvg(sex, month);
  const shifted = ppAvg + seasonalShift(DATA.tcfaLive5Yr[sex], month);

  if (mode === "monthlyPP") return ppMonthlyValue;
  if (mode === "blended") return (ppMonthlyValue * blendWeight) + (shifted * (1 - blendWeight));
  return shifted;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

function monthNumber(dateObj) {
  return dateObj ? dateObj.getMonth() + 1 : 1;
}

function formatCurrency(value, decimals = 2) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function formatPct(value, decimals = 1) {
  return `${formatNumber(value * 100, decimals)}%`;
}

function classForPL(value) {
  return value >= 0 ? "status-positive" : "status-negative";
}

function annualizedRoe(roe, days) {
  if (!Number.isFinite(roe) || !Number.isFinite(days) || days <= 0) return 0;
  if (1 + roe <= 0) return -1;
  return Math.pow(1 + roe, 365 / days) - 1;
}

function irrFromTwoCashFlows(capitalInvested, cattleSales, days) {
  if (capitalInvested <= 0 || cattleSales <= 0 || days <= 0) return 0;
  return Math.pow(cattleSales / capitalInvested, 365 / days) - 1;
}

function calcPath(label, sexKey, assumptions, settings) {
  const buyPriceCwt = sexKey === "steers" ? settings.buyPrice : settings.buyPrice - 15;
  const inWt = assumptions.inWt;
  const outWt = assumptions.outWt;
  const gain = outWt - inWt;
  const daysOnFeed = gain / assumptions.adg;
  const outDate = addDays(settings.deliveryDate, daysOnFeed);
  const outMonth = monthNumber(outDate);
  const baseBasis = deriveBasis(sexKey, outMonth, settings.basisMode, settings.blendWeight);
  const scenarioBasis = {
    riskFloor: baseBasis + settings.riskFloorAdj,
    conservative: baseBasis + settings.conservativeAdj,
    base: baseBasis,
    bullish: baseBasis + settings.bullishAdj,
    custom: settings.customSalePrice - settings.feederFutures,
  };

  const purchaseCostHd = (inWt * buyPriceCwt) / 100;
  const costOfDeadsHd = purchaseCostHd * settings.deathLoss;
  const feedCostHd = gain * assumptions.cog;
  const calcCogDi = feedCostHd + costOfDeadsHd;
  const interestHd = ((purchaseCostHd + (0.5 * calcCogDi)) * settings.interestRate / 365) * daysOnFeed;

  const myHead = settings.totalHead * settings.ownershipPct;

  const scenarios = Object.entries(scenarioBasis).reduce((acc, [key, basis]) => {
    const salePrice = key === "custom" ? settings.customSalePrice : settings.feederFutures + basis;
    const grossSaleHd = (salePrice * outWt) / 100;
    const netSaleHd = grossSaleHd * (1 - settings.commissionPct);
    const plHd = netSaleHd - purchaseCostHd - feedCostHd - costOfDeadsHd - interestHd;
    const plCwt = (plHd / outWt) * 100;
    const capitalInvestedHd = purchaseCostHd + feedCostHd + costOfDeadsHd + interestHd;
    const equityInvestedHd = capitalInvestedHd * settings.equityBase;
    const roe = equityInvestedHd > 0 ? plHd / equityInvestedHd : 0;
    const annRoe = annualizedRoe(roe, daysOnFeed);
    const cattleSalesTotal = grossSaleHd * myHead;
    const capitalInvestedTotal = capitalInvestedHd * myHead;
    const irr = irrFromTwoCashFlows(capitalInvestedTotal, cattleSalesTotal, daysOnFeed);
    const liveBasisApprox = basis + 5;
    const liveSalePrice = key === "custom" ? settings.customLiveSalePrice : settings.liveFutures + liveBasisApprox;

    acc[key] = {
      key,
      basis,
      salePrice,
      grossSaleHd,
      netSaleHd,
      plHd,
      plCwt,
      capitalInvestedHd,
      roe,
      annRoe,
      irr,
      liveBasisApprox,
      liveSalePrice,
    };
    return acc;
  }, {});

  return {
    label,
    sexKey,
    buyPriceCwt,
    purchaseCostHd,
    costOfDeadsHd,
    feedCostHd,
    calcCogDi,
    interestHd,
    daysOnFeed,
    outDate,
    outMonth,
    myHead,
    inWt,
    outWt,
    gain,
    baseBasis,
    ppAverage: ppAverage(sexKey),
    ppMonthValue: ppMonthAvg(sexKey, outMonth),
    tcfaShift: seasonalShift(DATA.tcfaLive5Yr[sexKey], outMonth),
    scenarios,
  };
}

function blendPath(name, a, b) {
  const mixScenario = (key) => {
    const sa = a.scenarios[key];
    const sb = b.scenarios[key];
    return {
      key,
      basis: (sa.basis + sb.basis) / 2,
      salePrice: (sa.salePrice + sb.salePrice) / 2,
      grossSaleHd: (sa.grossSaleHd + sb.grossSaleHd) / 2,
      netSaleHd: (sa.netSaleHd + sb.netSaleHd) / 2,
      plHd: (sa.plHd + sb.plHd) / 2,
      plCwt: (sa.plCwt + sb.plCwt) / 2,
      capitalInvestedHd: (sa.capitalInvestedHd + sb.capitalInvestedHd) / 2,
      roe: (sa.roe + sb.roe) / 2,
      annRoe: (sa.annRoe + sb.annRoe) / 2,
      irr: (sa.irr + sb.irr) / 2,
      liveBasisApprox: (sa.liveBasisApprox + sb.liveBasisApprox) / 2,
      liveSalePrice: (sa.liveSalePrice + sb.liveSalePrice) / 2,
    };
  };

  return {
    label: name,
    sexKey: "mixed",
    buyPriceCwt: (a.buyPriceCwt + b.buyPriceCwt) / 2,
    purchaseCostHd: (a.purchaseCostHd + b.purchaseCostHd) / 2,
    costOfDeadsHd: (a.costOfDeadsHd + b.costOfDeadsHd) / 2,
    feedCostHd: (a.feedCostHd + b.feedCostHd) / 2,
    calcCogDi: (a.calcCogDi + b.calcCogDi) / 2,
    interestHd: (a.interestHd + b.interestHd) / 2,
    daysOnFeed: (a.daysOnFeed + b.daysOnFeed) / 2,
    outDate: a.outDate && b.outDate ? new Date((a.outDate.getTime() + b.outDate.getTime()) / 2) : null,
    outMonth: Math.round((a.outMonth + b.outMonth) / 2),
    myHead: (a.myHead + b.myHead) / 2,
    inWt: (a.inWt + b.inWt) / 2,
    outWt: (a.outWt + b.outWt) / 2,
    gain: (a.gain + b.gain) / 2,
    baseBasis: (a.baseBasis + b.baseBasis) / 2,
    ppAverage: (a.ppAverage + b.ppAverage) / 2,
    ppMonthValue: (a.ppMonthValue + b.ppMonthValue) / 2,
    tcfaShift: (a.tcfaShift + b.tcfaShift) / 2,
    scenarios: {
      riskFloor: mixScenario("riskFloor"),
      conservative: mixScenario("conservative"),
      base: mixScenario("base"),
      bullish: mixScenario("bullish"),
      custom: mixScenario("custom"),
    },
  };
}

function renderSummary(paths, settings) {
  const cards = [
    { title: "Steers · Base", path: paths.steers, scenario: "base" },
    { title: "Heifers · Base", path: paths.heifers, scenario: "base" },
    { title: "Mixed · Base", path: paths.mixed, scenario: "base" },
  ];

  APP.els.summaryGrid.innerHTML = cards.map(({ title, path, scenario }) => {
    const data = path.scenarios[scenario];
    return `
      <article class="metric-card">
        <h3>${title}</h3>
        <div class="big-number ${classForPL(data.plHd)}">${formatCurrency(data.plHd)}</div>
        <div class="meta">P/L per head · ${formatNumber(data.salePrice)} sale / ${formatNumber(data.basis)} basis</div>
        <div class="small-note">ROE ${formatPct(data.roe)} · Annualized ROE ${formatPct(data.annRoe)} · IRR ${formatPct(data.irr)}</div>
      </article>
    `;
  }).join("");

  APP.els.basisSummary.textContent = settings.basisMode === "seasonalShift"
    ? "Base = average PP basis + TCFA seasonal shift"
    : settings.basisMode === "monthlyPP"
      ? "Base = direct PP monthly basis"
      : `Base = ${Math.round(settings.blendWeight * 100)}% PP monthly / ${Math.round((1 - settings.blendWeight) * 100)}% seasonal-shift`;
}

function renderSensitivity(paths) {
  const base = paths[APP.state.activeTab].scenarios.base;
  const outWt = paths[APP.state.activeTab].outWt;
  const deltas = [-15, -10, -5, 5, 10, 15];
  APP.els.sensitivityGrid.innerHTML = deltas.map((d) => {
    const impact = (d * outWt / 100) * (1 - num("commissionPct") / 100);
    return `
      <div class="sensitivity-item">
        <span class="move ${impact >= 0 ? 'status-positive' : 'status-negative'}">${d > 0 ? '+' : ''}${formatNumber(d, 0)}</span>
        <strong>${impact >= 0 ? '+' : ''}${formatCurrency(impact)}</strong>
        <div class="meta">per head</div>
      </div>
    `;
  }).join("");
}

function renderScenarioTable(path) {
  const rows = [
    ["Expected basis", (s) => formatNumber(s.basis)],
    ["Sale price ($/cwt)", (s) => formatNumber(s.salePrice)],
    ["Net sale / head", (s) => formatCurrency(s.netSaleHd)],
    ["P/L / head", (s) => `<span class="${classForPL(s.plHd)}">${formatCurrency(s.plHd)}</span>`],
    ["P/L / cwt sold", (s) => `<span class="${classForPL(s.plCwt)}">${formatCurrency(s.plCwt)}</span>`],
    ["Capital invested / head", (s) => formatCurrency(s.capitalInvestedHd)],
    ["ROE", (s) => formatPct(s.roe)],
    ["Annualized ROE", (s) => formatPct(s.annRoe)],
    ["IRR", (s) => formatPct(s.irr)],
    ["Shadow live basis", (s) => formatNumber(s.liveBasisApprox)],
    ["Shadow live sale price", (s) => formatNumber(s.liveSalePrice)],
  ];
  const order = ["riskFloor", "conservative", "base", "bullish", "custom"];
  const labelMap = { riskFloor: "Risk Floor", conservative: "Conservative", base: "Base", bullish: "Bullish", custom: "Custom" };

  return `
    <div class="scenario-table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>${path.label}</th>
            ${order.map((k) => `<th>${labelMap[k]}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">Projected out month</td>
            <td colspan="5">${MONTHS[path.outMonth - 1]} · ${path.outDate ? path.outDate.toLocaleDateString() : "—"} · ${formatNumber(path.daysOnFeed, 1)} days on feed</td>
          </tr>
          <tr>
            <td class="row-label">Purchase economics</td>
            <td colspan="5">Buy ${formatNumber(path.buyPriceCwt)} /cwt · Purchase ${formatCurrency(path.purchaseCostHd)} /hd · Feed ${formatCurrency(path.feedCostHd)} /hd · Interest ${formatCurrency(path.interestHd)} /hd</td>
          </tr>
          ${rows.map(([name, formatter]) => `
            <tr>
              <td class="row-label">${name}</td>
              ${order.map((k) => `<td>${formatter(path.scenarios[k])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMonthLogic(paths) {
  const current = paths[APP.state.activeTab];
  APP.els.monthLogic.innerHTML = `
    <div class="kpi-line"><span>Delivery date</span><strong>${new Date(document.getElementById("deliveryDate").value + "T00:00:00").toLocaleDateString()}</strong></div>
    <div class="kpi-line"><span>Projected out date</span><strong>${current.outDate ? current.outDate.toLocaleDateString() : "—"}</strong></div>
    <div class="kpi-line"><span>Out month used for basis</span><strong>${MONTHS[current.outMonth - 1]}</strong></div>
    <div class="kpi-line"><span>PP average basis</span><strong>${formatNumber(current.ppAverage)}</strong></div>
    <div class="kpi-line"><span>TCFA seasonal shift</span><strong>${current.tcfaShift >= 0 ? '+' : ''}${formatNumber(current.tcfaShift)}</strong></div>
    <div class="kpi-line"><span>Base derived basis</span><strong>${formatNumber(current.baseBasis)}</strong></div>
  `;
}

function renderDiagnostics(paths) {
  const steerBase = paths.steers.scenarios.base;
  const heiferBase = paths.heifers.scenarios.base;
  APP.els.premiumDiagnostics.innerHTML = `
    <ul class="note-list">
      <li>Steer PP average basis: <strong>${formatNumber(paths.steers.ppAverage)}</strong></li>
      <li>Heifer PP average basis: <strong>${formatNumber(paths.heifers.ppAverage)}</strong></li>
      <li>Projected steer base basis: <strong>${formatNumber(steerBase.basis)}</strong></li>
      <li>Projected heifer base basis: <strong>${formatNumber(heiferBase.basis)}</strong></li>
      <li>July softening risk should show up through the TCFA shift when the out month rolls into July.</li>
      <li>The seasonal-shift mode starts from the full PP average, then moves it up or down based on the projected out month.</li>
    </ul>
  `;

  const monthRows = MONTHS.map((m, idx) => {
    const monthNum = idx + 1;
    const steerPP = DATA.ppMonthly.steers[monthNum];
    const heiferPP = DATA.ppMonthly.heifers[monthNum];
    const steerShift = ppAverage("steers") + seasonalShift(DATA.tcfaLive5Yr.steers, monthNum);
    const heiferShift = ppAverage("heifers") + seasonalShift(DATA.tcfaLive5Yr.heifers, monthNum);
    return `
      <tr>
        <td>${m}</td>
        <td>${steerPP == null ? "—" : formatNumber(steerPP)}</td>
        <td>${formatNumber(steerShift)}</td>
        <td>${heiferPP == null ? "—" : formatNumber(heiferPP)}</td>
        <td>${formatNumber(heiferShift)}</td>
      </tr>
    `;
  }).join("");

  APP.els.historicalTable.innerHTML = `
    <table class="info-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>PP steer avg</th>
          <th>Steer seasonal-shift basis</th>
          <th>PP heifer avg</th>
          <th>Heifer seasonal-shift basis</th>
        </tr>
      </thead>
      <tbody>${monthRows}</tbody>
    </table>
  `;
}

function update() {
  APP.els.blendWeightValue.textContent = `${num("blendWeight").toFixed(0)}%`;
  const settings = currentSettings();
  const steerPath = calcPath("Steers", "steers", settings.steer, settings);
  const heiferPath = calcPath("Heifers", "heifers", settings.heifer, settings);
  const mixedPath = blendPath("Mixed 50/50", steerPath, heiferPath);
  const paths = { steers: steerPath, heifers: heiferPath, mixed: mixedPath };

  renderSummary(paths, settings);
  renderSensitivity(paths);
  APP.els.scenarioTables.innerHTML = renderScenarioTable(paths[APP.state.activeTab]);
  renderMonthLogic(paths);
  renderDiagnostics(paths);
}

document.addEventListener("DOMContentLoaded", init);
