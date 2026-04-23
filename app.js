const DEFAULTS = {
  buyPrice: 360,
  incomingBoard: 295,
  outgoingBoard: 305,
  totalHead: 100,
  ownershipPct: 100,
  interestRate: 7.25,
  deathLoss: 1,
  commissionPct: 2,
  equityBase: 30,
  riskFloorAdj: -15,
  conservativeAdj: -8,
  bullishAdj: 8,
  steerOutWt: 675,
  heiferOutWt: 650,
  steerCog: 0.8,
  heiferCog: 0.85,
  steerAdg: 2.8,
  heiferAdg: 2.78,
};

const FALLBACK_BASIS = {
  1: { steers: 39.46, heifers: 18.88 },
  2: { steers: 42.10, heifers: 39.16 },
  3: { steers: 68.41, heifers: 40.95 },
  4: { steers: 47.80, heifers: 37.36 },
  5: { steers: null, heifers: null },
  6: { steers: null, heifers: null },
  7: { steers: 28.76, heifers: 12.76 },
  8: { steers: 24.22, heifers: 10.65 },
  9: { steers: 27.64, heifers: 13.92 },
  10: { steers: 30.82, heifers: 9.26 },
  11: { steers: 23.38, heifers: 10.64 },
  12: { steers: 57.77, heifers: 37.84 },
};

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let activeTab = 'steer';
let loadedBasis = structuredClone(FALLBACK_BASIS);
let basisSourceLabel = 'Embedded fallback';

function byId(id) { return document.getElementById(id); }
function num(id) { return Number(byId(id).value || 0); }
function money(v) { return `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`; }
function pct(v) { return `${v.toFixed(2)}%`; }
function cwtd(v) { return v.toFixed(2); }
function fmtDate(d) { return d.toLocaleDateString(); }

function setDefaultDate() {
  const input = byId('deliveryDate');
  if (!input.value) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    input.value = d.toISOString().slice(0,10);
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV has no data rows.');
  const headers = lines[0].split(',').map(s => s.trim().toLowerCase());
  const monthIdx = headers.indexOf('month');
  const steerIdx = headers.indexOf('steers');
  const heiferIdx = headers.indexOf('heifers');
  if (monthIdx === -1 || steerIdx === -1 || heiferIdx === -1) {
    throw new Error('CSV must contain Month, Steers, Heifers headers.');
  }
  const parsed = {};
  for (let m = 1; m <= 12; m++) parsed[m] = { steers: null, heifers: null };
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(s => s.trim());
    const month = Number(cols[monthIdx]);
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    parsed[month] = {
      steers: cols[steerIdx] === '' ? null : Number(cols[steerIdx]),
      heifers: cols[heiferIdx] === '' ? null : Number(cols[heiferIdx]),
    };
  }
  return parsed;
}

async function loadBasisData() {
  try {
    const res = await fetch('data/pp_basis_monthly.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    loadedBasis = parseCsv(csv);
    basisSourceLabel = 'Repo CSV loaded';
  } catch (err) {
    loadedBasis = structuredClone(FALLBACK_BASIS);
    basisSourceLabel = 'Embedded fallback';
  }
  byId('basisSource').textContent = basisSourceLabel;
}

function getBasisAverages() {
  const steerVals = Object.values(loadedBasis).map(v => v.steers).filter(v => Number.isFinite(v));
  const heiferVals = Object.values(loadedBasis).map(v => v.heifers).filter(v => Number.isFinite(v));
  const steerAvg = steerVals.reduce((a,b) => a + b, 0) / steerVals.length;
  const heiferAvg = heiferVals.reduce((a,b) => a + b, 0) / heiferVals.length;
  return { steerAvg, heiferAvg };
}

function getSeasonalBasis(month, sex) {
  const { steerAvg, heiferAvg } = getBasisAverages();
  const monthValue = loadedBasis[month]?.[sex];
  const avg = sex === 'steers' ? steerAvg : heiferAvg;
  return Number.isFinite(monthValue) ? avg + (monthValue - avg) : avg;
}

function calcPath({ sex, outWt, cog, adg, buyCwt, scenarioAdj }) {
  const inWt = 325;
  const gain = outWt - inWt;
  const dof = gain / adg;
  const deliveryDate = new Date(byId('deliveryDate').value);
  const outDate = new Date(deliveryDate);
  outDate.setDate(outDate.getDate() + Math.round(dof));
  const outMonth = outDate.getMonth() + 1;

  const purchaseCost = inWt * buyCwt / 100;
  const feedCost = gain * cog;
  const deadCost = purchaseCost * (num('deathLoss') / 100);
  const rate = num('interestRate') / 100;
  const interest = (purchaseCost + 0.5 * (feedCost + deadCost)) * rate * (dof / 365);

  const baseBasis = getSeasonalBasis(outMonth, sex);
  const finalBasis = baseBasis + scenarioAdj;
  const outgoingBoard = num('outgoingBoard');
  const salePrice = outgoingBoard + finalBasis;
  const grossSale = outWt * salePrice / 100;
  const netSale = grossSale * (1 - num('commissionPct') / 100);
  const pl = netSale - purchaseCost - feedCost - deadCost - interest;

  const capital = purchaseCost + feedCost + deadCost + interest;
  const equity = capital * (num('equityBase') / 100);
  const roe = equity ? pl / equity : 0;
  const annualizedRoe = equity ? (Math.pow(1 + roe, 365 / dof) - 1) : 0;
  const irr = capital ? Math.pow(netSale / capital, 365 / dof) - 1 : 0;
  const headShare = num('totalHead') * (num('ownershipPct') / 100) * (sex === 'mixed' ? 1 : 1);

  return {
    sex,
    outWt,
    gain,
    dof,
    outDate,
    outMonth,
    purchaseCost,
    feedCost,
    deadCost,
    interest,
    baseBasis,
    finalBasis,
    salePrice,
    grossSale,
    netSale,
    pl,
    plPerCwt: (pl / outWt) * 100,
    roe: roe * 100,
    annualizedRoe: annualizedRoe * 100,
    irr: irr * 100,
    incomingBasis: buyCwt - num('incomingBoard'),
    totalPl: pl * headShare,
  };
}

function scenarioSet() {
  return [
    { key: 'risk', label: 'Risk floor', adj: num('riskFloorAdj') },
    { key: 'cons', label: 'Conservative', adj: num('conservativeAdj') },
    { key: 'base', label: 'Base', adj: 0 },
    { key: 'bull', label: 'Bullish', adj: num('bullishAdj') },
  ];
}

function buildModels() {
  const steerBuy = num('buyPrice');
  const heiferBuy = steerBuy - 15;
  const steerAss = { sex: 'steers', outWt: num('steerOutWt'), cog: num('steerCog'), adg: num('steerAdg'), buyCwt: steerBuy };
  const heiferAss = { sex: 'heifers', outWt: num('heiferOutWt'), cog: num('heiferCog'), adg: num('heiferAdg'), buyCwt: heiferBuy };
  const scenarios = scenarioSet();

  return {
    steer: scenarios.map(s => ({ ...s, model: calcPath({ ...steerAss, scenarioAdj: s.adj }) })),
    heifer: scenarios.map(s => ({ ...s, model: calcPath({ ...heiferAss, scenarioAdj: s.adj }) })),
    mixed: scenarios.map(s => {
      const steerM = calcPath({ ...steerAss, scenarioAdj: s.adj });
      const heiferM = calcPath({ ...heiferAss, scenarioAdj: s.adj });
      return {
        ...s,
        model: {
          ...steerM,
          sex: 'mixed',
          outWt: (steerM.outWt + heiferM.outWt) / 2,
          gain: (steerM.gain + heiferM.gain) / 2,
          dof: (steerM.dof + heiferM.dof) / 2,
          outDate: steerM.outDate > heiferM.outDate ? steerM.outDate : heiferM.outDate,
          outMonth: steerM.outDate > heiferM.outDate ? steerM.outMonth : heiferM.outMonth,
          purchaseCost: (steerM.purchaseCost + heiferM.purchaseCost) / 2,
          feedCost: (steerM.feedCost + heiferM.feedCost) / 2,
          deadCost: (steerM.deadCost + heiferM.deadCost) / 2,
          interest: (steerM.interest + heiferM.interest) / 2,
          baseBasis: (steerM.baseBasis + heiferM.baseBasis) / 2,
          finalBasis: (steerM.finalBasis + heiferM.finalBasis) / 2,
          salePrice: (steerM.salePrice + heiferM.salePrice) / 2,
          grossSale: (steerM.grossSale + heiferM.grossSale) / 2,
          netSale: (steerM.netSale + heiferM.netSale) / 2,
          pl: (steerM.pl + heiferM.pl) / 2,
          plPerCwt: (steerM.plPerCwt + heiferM.plPerCwt) / 2,
          roe: (steerM.roe + heiferM.roe) / 2,
          annualizedRoe: (steerM.annualizedRoe + heiferM.annualizedRoe) / 2,
          irr: (steerM.irr + heiferM.irr) / 2,
          incomingBasis: (steerM.incomingBasis + heiferM.incomingBasis) / 2,
          totalPl: ((steerM.pl + heiferM.pl) / 2) * num('totalHead') * (num('ownershipPct') / 100),
        }
      };
    })
  };
}

function pillClass(v) {
  if (v >= 150) return 'good';
  if (v >= 0) return 'warn';
  return 'bad';
}

function renderQuickView(models) {
  const baseSteer = models.steer.find(s => s.key === 'base').model;
  const baseMixed = models.mixed.find(s => s.key === 'base').model;
  byId('kpiGrid').innerHTML = `
    <div class="kpi"><h3>Base steer P/L</h3><strong>${money(baseSteer.pl)}</strong><small>${money(baseSteer.totalPl)} total at current head/ownership</small></div>
    <div class="kpi"><h3>Base mixed P/L</h3><strong>${money(baseMixed.pl)}</strong><small>${money(baseMixed.totalPl)} total at current head/ownership</small></div>
    <div class="kpi"><h3>Incoming purchase basis</h3><strong>${cwtd(baseSteer.incomingBasis)}</strong><small>Tuls cash minus incoming feeder board</small></div>
    <div class="kpi"><h3>Base outgoing basis</h3><strong>${cwtd(baseSteer.finalBasis)}</strong><small>Base PP average plus seasonal month shift</small></div>
  `;

  const { steerAvg, heiferAvg } = getBasisAverages();
  byId('monthLogic').innerHTML = `
    <p><strong>Steer out date:</strong> ${fmtDate(baseSteer.outDate)} (${monthNames[baseSteer.outMonth - 1]})</p>
    <p><strong>Heifer out date:</strong> ${fmtDate(models.heifer.find(s => s.key === 'base').model.outDate)} (${monthNames[models.heifer.find(s => s.key === 'base').model.outMonth - 1]})</p>
    <p><strong>Steer DOF:</strong> ${baseSteer.dof.toFixed(1)} days</p>
    <p><strong>Heifer DOF:</strong> ${models.heifer.find(s => s.key === 'base').model.dof.toFixed(1)} days</p>
  `;

  byId('basisDiagnostics').innerHTML = `
    <p><strong>Overall steer PP average:</strong> ${cwtd(steerAvg)}</p>
    <p><strong>Overall heifer PP average:</strong> ${cwtd(heiferAvg)}</p>
    <p><strong>Steer base month value:</strong> ${cwtd(baseSteer.baseBasis)}</p>
    <p><strong>Heifer base month value:</strong> ${cwtd(models.heifer.find(s => s.key === 'base').model.baseBasis)}</p>
  `;
}

function renderScenarioTables(models) {
  const rows = models[activeTab].map(({ label, model }) => `
    <tr>
      <td><span class="pill ${pillClass(model.pl)}">${label}</span></td>
      <td>${monthNames[model.outMonth - 1]}</td>
      <td>${cwtd(model.finalBasis)}</td>
      <td>${cwtd(model.salePrice)}</td>
      <td>${money(model.pl)}</td>
      <td>${money(model.totalPl)}</td>
      <td>${money(model.plPerCwt)}</td>
      <td>${pct(model.roe)}</td>
      <td>${pct(model.annualizedRoe)}</td>
      <td>${pct(model.irr)}</td>
    </tr>
  `).join('');

  byId('scenarioTables').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Out month</th>
            <th>Expected basis</th>
            <th>Sale price</th>
            <th>P/L per head</th>
            <th>Total P/L</th>
            <th>P/L per cwt</th>
            <th>ROE</th>
            <th>Annualized ROE</th>
            <th>IRR</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderSensitivity(models) {
  const base = models.steer.find(s => s.key === 'base').model;
  const heifer = models.heifer.find(s => s.key === 'base').model;
  const bumps = [-15, -10, -5, 5, 10, 15];
  const rows = bumps.map(b => `
    <tr>
      <td>${b > 0 ? '+' : ''}${b.toFixed(0)}</td>
      <td>${money((base.outWt / 100) * b)}</td>
      <td>${money((heifer.outWt / 100) * b)}</td>
      <td>${money((((base.outWt + heifer.outWt) / 2) / 100) * b)}</td>
    </tr>
  `).join('');
  byId('sensitivityTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Basis move ($/cwt)</th><th>Steer P/L change</th><th>Heifer P/L change</th><th>Mixed P/L change</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderBasisTable() {
  const rows = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const rec = loadedBasis[month] || { steers: null, heifers: null };
    return `
      <tr>
        <td>${month}</td>
        <td>${monthNames[idx]}</td>
        <td>${rec.steers ?? ''}</td>
        <td>${rec.heifers ?? ''}</td>
      </tr>
    `;
  }).join('');
  byId('basisTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Month #</th><th>Month</th><th>Steers</th><th>Heifers</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function recalc() {
  const models = buildModels();
  renderQuickView(models);
  renderScenarioTables(models);
  renderSensitivity(models);
  renderBasisTable();
}

function bindEvents() {
  document.querySelectorAll('input').forEach(el => el.addEventListener('input', recalc));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    recalc();
  }));
  byId('advancedToggle').addEventListener('click', () => {
    const panel = byId('advancedPanel');
    const hidden = panel.classList.toggle('hidden');
    byId('advancedToggle').textContent = hidden ? 'Show advanced settings' : 'Hide advanced settings';
    byId('advancedToggle').setAttribute('aria-expanded', String(!hidden));
  });
  byId('resetBtn').addEventListener('click', () => {
    Object.entries(DEFAULTS).forEach(([key, value]) => { if (byId(key)) byId(key).value = value; });
    setDefaultDate();
    recalc();
  });
}

async function init() {
  setDefaultDate();
  await loadBasisData();
  bindEvents();
  recalc();
}

init();
