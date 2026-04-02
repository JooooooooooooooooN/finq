/* 흐름 제어 전담 — 계산/DOM 직접 조작 금지 */

/* ── 참조 데이터 (입력 구성용) ── */
const COUNTRY_INFO = {
  us:   { curr:'USD', exRate:1380, withhold:15 },
  jp:   { curr:'JPY', exRate:9.2,  withhold:15.315 },
  cn:   { curr:'CNY', exRate:190,  withhold:10 },
  hk:   { curr:'HKD', exRate:177,  withhold:0 },
  other:{ curr:'통화', exRate:1,   withhold:0 }
};

async function searchStockUS(keyword) {
  try {
    const res = await fetch(`/api/stock-search?q=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    return (data.results || []).slice(0, 6).map(r => ({ ticker: r.symbol, name: r.name }));
  } catch (_) {
    return [];
  }
}

/* ── 국가 동기화 (UI 값 세팅, 계산 전 실행) ── */
function syncCountry(id) {
  const val = document.getElementById(id).value;
  const info = COUNTRY_INFO[val];
  if (id === 'cgCountry') uiHandler.updateCGCountry(info);
  else if (id === 'dvCountry') uiHandler.updateDVCountry(info);
}

/* ── 모드 판별 (DOM 기반) ── */
function _getMode() {
  return document.querySelector('.mode-tab.active')?.textContent.includes('양도') ? 'capital' : 'dividend';
}

/* ── 입력 수집 (파라미터 없음, 현재 모드 자동 판별) ── */
function getInputData() {
  const mode = _getMode();
  const raw = uiHandler.readInputs(mode);
  if (mode === 'capital') {
    return { taxType: 'capital', trades: raw.rows, exchangeRate: raw.exRate };
  }
  return {
    taxType: 'dividend', trades: [{ amount: raw.amountLocal }],
    exchangeRate: raw.exRate, withholdRate: raw.withholdRate,
    finIncome: raw.finIncome, marginalRate: raw.marginalRate,
    currUnit: COUNTRY_INFO[raw.country]?.curr || '통화'
  };
}

/* ── 단일 이벤트 핸들러 ── */
function handleInput() {
  const input = getInputData();
  const result = taxCalculator.calculate(input);
  uiHandler.renderResult(result);
}

/* ── HTML 인라인 핸들러 위임 ── */
function switchMode(mode)  { uiHandler.switchMode(mode); handleInput(); }
function addCGRow()        { uiHandler.addCGRow(); }
function delCGRow(idx)     { uiHandler.delCGRow(idx); handleInput(); }
function toggleTheme()     { uiHandler.toggleTheme(); }

async function showAC(rowIdx) {
  const raw = uiHandler.readRowName(rowIdx);
  if (!raw) { uiHandler.closeAllAC(); return; }

  const country = document.getElementById('cgCountry').value;
  if (country !== 'us') { uiHandler.closeAllAC(); return; }

  const results = await searchStockUS(raw);
  uiHandler.showAC(rowIdx, results);
}

function selectAC(rowIdx, ticker, name, price) {
  uiHandler.selectAC(rowIdx, ticker, name, price);
  handleInput();
}

/* ── 실시간 환율 로드 ── */
async function loadExchangeRates() {
  try {
    const res = await fetch('/api/exchange-rate');
    if (!res.ok) return;
    const rates = await res.json();
    if (rates.USD) COUNTRY_INFO.us.exRate = rates.USD;
    if (rates.JPY) COUNTRY_INFO.jp.exRate = rates.JPY;
    if (rates.CNY) COUNTRY_INFO.cn.exRate = rates.CNY;
    if (rates.HKD) COUNTRY_INFO.hk.exRate = rates.HKD;
  } catch (_) {}
}

/* ── 초기화 ── */
async function init() {
  uiHandler.cacheDOM();

  document.addEventListener('input', handleInput);

  document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('cg-name')) uiHandler.closeAllAC();
  });

  uiHandler.restoreTheme();
  await loadExchangeRates();
  uiHandler.addCGRow();
  syncCountry('cgCountry');
  handleInput();
}

document.addEventListener('DOMContentLoaded', init);
