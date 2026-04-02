/* DOM 렌더링 전담 — 계산/이벤트/taxCalculator 호출 금지 */

/* ── DOM 캐싱 객체 (유일한 DOM 접근 경로) ── */
const DOM = {};
const _cgRows = [];

/* ── 카드 설정 (type → DOM 매핑) ── */
const CG_CARD_CONFIG = {
  profit:  { dom: 'cgProfit',  domSub: 'cgProfitSub' },
  taxable: { dom: 'cgTaxbase', domSub: 'cgTaxbaseSub' },
  rate:    { dom: 'cgRate',    domSub: 'cgRateSub' },
  final:   { dom: 'cgTax',     domSub: 'cgTaxSub', highlight: true }
};

const DV_CARD_CONFIG = {
  final:   { dom: 'dvTax',     domSub: 'dvTaxSub', highlight: true },
  net:     { dom: 'dvNet' },
  gross:   { dom: 'dvGross' },
  effRate: { dom: 'dvEffRate' }
};

const CG_SUMMARY_MAP = {
  loss: '손실은 향후 양도차익과 상계 가능합니다',
  exempt: '현재 조건에서는 세금이 발생하지 않습니다 (기본공제 범위 내)',
  taxable: '공제 적용 후 과세 대상 금액 기준으로 계산됩니다'
};

const uiHandler = {

  /* ── 포맷 유틸 ── */
  fmtW(n) {
    const a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a >= 10000) return sign + (a / 10000).toFixed(1) + '억원';
    if (a >= 1) return sign + a.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
    return sign + Math.round(a * 10000).toLocaleString() + '원';
  },
  fmtNum(n) { return n.toLocaleString('ko-KR'); },
  fmtPct(n) { return (n * 100).toFixed(1) + '%'; },
  fmtPctInt(n) { return (n * 100).toFixed(0) + '%'; },
  fmtSign(n, formatted) { return (n >= 0 ? '+' : '') + formatted; },

  /* ── DOM 캐싱 (1회, 유일한 querySelector 사용처) ── */
  cacheDOM() {
    const g = id => document.getElementById(id);

    DOM.cgTableBody = g('cgTableBody');
    DOM.cgProfit = g('cg_profit');       DOM.cgProfitSub = g('cg_profit_sub');
    DOM.cgTaxbase = g('cg_taxbase');     DOM.cgTaxbaseSub = g('cg_taxbase_sub');
    DOM.cgRate = g('cg_rate');           DOM.cgRateSub = g('cg_rate_sub');
    DOM.cgTax = g('cg_tax');             DOM.cgTaxSub = g('cg_tax_sub');
    DOM.cgTaxSummary = g('cg_tax_summary');
    DOM.bkProfit = g('bk_cgProfit');     DOM.bkTotal = g('bk_cgTotal');
    DOM.bkTaxBase = g('bk_cgTaxBase');   DOM.bkTaxFinal = g('bk_cgTaxFinal');
    DOM.cgInterpret = g('cgInterpret');

    DOM.dvTax = g('dv_tax');             DOM.dvTaxSub = g('dv_tax_sub');
    DOM.dvNet = g('dv_net');             DOM.dvGross = g('dv_gross');
    DOM.dvEffRate = g('dv_eff_rate');
    DOM.bkDvGrossLocal = g('bk_dvGrossLocal');  DOM.bkDvGrossKRW = g('bk_dvGrossKRW');
    DOM.bkDvWithhold = g('bk_dvWithhold');      DOM.bkDvDomestic = g('bk_dvDomestic');
    DOM.bkDvNet = g('bk_dvNet');         DOM.dvInterpret = g('dvInterpret');

    DOM.cgExRate = g('cgExRate');
    DOM.dvExRate = g('dvExRate');         DOM.dvWithhold = g('dvWithhold');
    DOM.dvAmount = g('dvAmount');         DOM.dvFinIncome = g('dvFinIncome');
    DOM.dvMarginalRate = g('dvMarginalRate');
    DOM.dvCountry = g('dvCountry');      DOM.dvCurrUnit = g('dvCurrUnit');

    DOM.capitalPanel = g('capitalPanel');   DOM.dividendPanel = g('dividendPanel');
    DOM.dividendGuide = g('dividendGuide'); DOM.cgResult = g('cgResult');
    DOM.dvResult = g('dvResult');           DOM.themeBtn = g('themeBtn');
    DOM.modeTabs = [].slice.call(document.querySelectorAll('.mode-tab'));
  },

  /* ── DOM 읽기 ── */
  readInputs(mode) {
    if (mode === 'capital') {
      const rows = _cgRows.filter(Boolean).map(r => ({
        buy: +r.buyInput.value || 0, sell: +r.sellInput.value || 0, qty: +r.qtyInput.value || 0
      }));
      return { exRate: +DOM.cgExRate.value || 0, rows };
    }
    return {
      exRate: +DOM.dvExRate.value || 0, withholdRate: +DOM.dvWithhold.value / 100,
      amountLocal: +DOM.dvAmount.value || 0, finIncome: +DOM.dvFinIncome.value || 0,
      marginalRate: +DOM.dvMarginalRate.value / 100, country: DOM.dvCountry.value
    };
  },

  /* ── 카드 렌더 (config 조회 → 값 적용 → DOM 반영) ── */
  renderCard(cfg, value, sub, colorClass) {
    const el = DOM[cfg.dom];
    el.textContent = value;
    el.classList.remove('clr-accent', 'clr-red', 'clr-green', 'clr-text', 'clr-text2', 'clr-orange');
    if (colorClass) el.classList.add(colorClass);
    if (cfg.domSub) DOM[cfg.domSub].textContent = sub || '';
  },

  renderSummary(el, html) { el.innerHTML = html; },

  /* ── 통합 렌더링 ── */
  renderResult(result) {
    if (result.taxType === 'capital') this._renderCG(result);
    else this._renderDV(result);
  },

  _renderCG(d) {
    const fw = this.fmtW, s = d.status;
    const active = _cgRows.filter(Boolean);

    // 1) 행별 손익
    d.rowResults.forEach((r, i) => {
      if (!active[i]) return;
      active[i].plCell.textContent = this.fmtSign(r.plKRW, fw(r.plKRW));
      active[i].plCell.classList.toggle('clr-green', r.plKRW >= 0);
      active[i].plCell.classList.toggle('clr-red', r.plKRW < 0);
    });

    // 2) 카드 4개 — 배열 기반 반복
    const rateStr = this.fmtPctInt(d.taxRate);
    const cardData = [
      { type: 'profit',  value: fw(d.totalProfit),     sub: '매매 손익', colorClass: d.totalProfit >= 0 ? 'clr-accent' : 'clr-red' },
      { type: 'taxable', value: fw(d.taxableAmount),   sub: { loss: '공제 범위 내', exempt: '공제 범위 내', taxable: fw(d.deduction) + ' 공제 후' }[s], colorClass: 'clr-text' },
      { type: 'rate',    value: { loss: '-', exempt: rateStr, taxable: rateStr }[s], sub: '소득세 20% + 지방세 2%', colorClass: 'clr-text' },
      { type: 'final',   value: fw(d.finalTax),        sub: { loss: '과세 대상 없음', exempt: '기본공제 이내', taxable: '세율 ' + rateStr }[s], colorClass: 'clr-red' }
    ];
    cardData.forEach(item => this.renderCard(CG_CARD_CONFIG[item.type], item.value, item.sub, item.colorClass));

    // 3) 요약
    DOM.cgTaxSummary.textContent = CG_SUMMARY_MAP[s];

    // 4) 분해 테이블
    DOM.bkProfit.textContent = fw(d.profitKRW);
    DOM.bkTotal.textContent = fw(d.totalProfit);
    DOM.bkTaxBase.textContent = d.taxableAmount > 0 ? fw(d.taxableAmount) : '0원 (공제 후)';
    DOM.bkTaxFinal.textContent = d.finalTax > 0 ? '-' + fw(d.finalTax) : '0원';

    // 5) 해석
    this.renderSummary(DOM.cgInterpret, {
      loss: `<strong>결과 해석</strong><br>양도차익이 <strong class="clr-red">손실(${fw(d.totalProfit)})</strong>이므로 납부할 세금이 없습니다.<br><br><strong>손실 활용 안내</strong><br>• 같은 해 다른 해외주식 양도차익과 <strong>상계(손익통산)</strong> 가능<br>• 국내주식 손실과는 통산 불가, 다음 해 이월 불가<br>• 연말 전 손실 확정 매도(Tax-Loss Harvesting) 고려`,
      exempt: `<strong>결과 해석</strong><br>양도차익 <strong>${fw(d.totalProfit)}</strong>이 기본공제 <strong>${fw(d.deduction)} 이내</strong>이므로 <strong class="clr-green">세금 0원</strong><br><br><strong>참고</strong><br>• 신고 의무 없지만, 손실 있는 경우 신고하면 손익통산에 유리<br>• 추가 매도 계획 시 ${fw(d.deduction)} 공제 한도 고려`,
      taxable: `<strong>결과 해석</strong><br>양도차익 <strong>${fw(d.totalProfit)}</strong> 중 ${fw(d.deduction)} 공제 후 <strong>${fw(d.taxableAmount)}</strong>에 ${rateStr} 과세<br><strong class="clr-red">최종 납부 세금: ${fw(d.finalTax)}</strong> (실효세율 ${d.effRate.toFixed(1)}%)<br><br><strong>절세 팁</strong><br>• 손실 종목 연말 전 매도로 양도차익 줄이기<br>• 매년 5월 홈택스 확정신고 (미신고 시 가산세 20%)`
    }[s]);
  },

  _renderDV(d) {
    const fw = this.fmtW, fn = this.fmtNum;
    const effPct = this.fmtPct(d.effectiveRate);

    // 1) 카드 4개 — 배열 기반 반복
    const dvCardData = [
      { type: 'final',   value: fw(d.totalTaxMan), sub: d.taxType_label, colorClass: 'clr-red' },
      { type: 'net',     value: fw(d.netMan),       sub: null, colorClass: 'clr-green' },
      { type: 'gross',   value: fw(d.grossMan),     sub: null, colorClass: 'clr-accent' },
      { type: 'effRate', value: d.grossKRW > 0 ? effPct : '0%', sub: null, colorClass: 'clr-text' }
    ];
    dvCardData.forEach(item => this.renderCard(DV_CARD_CONFIG[item.type], item.value, item.sub, item.colorClass));

    // 2) 분해 테이블
    DOM.bkDvGrossLocal.textContent = fn(d.amountLocal) + ' ' + d.currUnit;
    DOM.bkDvGrossKRW.textContent = fw(d.grossMan);
    DOM.bkDvWithhold.textContent = '-' + fw(d.withholdMan) + ' (' + this.fmtPct(d.withholdRate) + ')';
    DOM.bkDvDomestic.textContent = d.domesticTax > 0 ? '-' + fw(d.domesticTaxMan) : '0원 (외국납부세액공제)';
    DOM.bkDvNet.textContent = fw(d.netMan);
    DOM.bkDvNet.classList.toggle('clr-green', d.netMan >= 0);
    DOM.bkDvNet.classList.toggle('clr-red', d.netMan < 0);

    // 3) 해석
    const base = `배당금 <strong>${fn(d.amountLocal)} ${d.currUnit}</strong> (원화 <strong>${fw(d.grossMan)}</strong>)<br>금융소득 합계 <strong>${fw(d.totalFinIncome)}</strong>`;
    this.renderSummary(DOM.dvInterpret, {
      separate: `${base} → <strong>2,000만원 이하</strong> 분리과세<br>현지 원천징수 <strong>${this.fmtPct(d.withholdRate)}</strong>${d.domesticTax > 0 ? ' + 국내 추가 ' + fw(d.domesticTaxMan) : '(국내 추가 없음)'}<br><strong class="clr-green">실수령: ${fw(d.netMan)}</strong> (실효세율 ${effPct})`,
      comprehensive: `${base} → <strong>2,000만원 초과</strong> 종합과세<br>한계세율 <strong>${this.fmtPctInt(d.marginalRate)}</strong>(+지방세), 국내 추가 과세 <strong>${fw(d.domesticTaxMan)}</strong><br><strong class="clr-green">실수령: ${fw(d.netMan)}</strong> (실효세율 ${effPct})<br><span class="tax-explain">종합과세 시 외국납부세액공제로 이중과세 방지</span>`
    }[d.status]);
  },

  /* ── 종목 행 ── */
  addCGRow(name, sell) {
    const idx = _cgRows.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="ac-wrapper"><input type="text" placeholder="종목명 또는 티커" class="cg-name" value="${name||''}" oninput="showAC(${idx})" onfocus="showAC(${idx})" autocomplete="off"><div class="ac-list"></div></td><td><input type="number" value="" step="0.01" class="cg-buy" placeholder="매수가"></td><td><input type="number" value="${sell||''}" step="0.01" class="cg-sell" placeholder="매도가"></td><td><input type="number" value="1" min="1" class="cg-qty"></td><td class="cg-pl">-</td><td><button class="stock-del" onclick="delCGRow(${idx})">&times;</button></td>`;
    DOM.cgTableBody.appendChild(tr);
    const td0 = tr.children[0];
    _cgRows.push({ tr, nameInput: td0.children[0], acList: td0.children[1], buyInput: tr.children[1].children[0], sellInput: tr.children[2].children[0], qtyInput: tr.children[3].children[0], plCell: tr.children[4] });
  },
  delCGRow(idx) { const row = _cgRows[idx]; if (!row) return; row.tr.remove(); _cgRows[idx] = null; },

  /* ── 모드 전환 ── */
  switchMode(mode) {
    DOM.modeTabs.forEach((t, i) => t.classList.toggle('active', i === (mode === 'capital' ? 0 : 1)));
    DOM.capitalPanel.classList.toggle('active', mode === 'capital');
    DOM.dividendPanel.classList.toggle('active', mode === 'dividend');
    DOM.dividendGuide.classList.toggle('active', mode === 'dividend');
    DOM.cgResult.classList.toggle('hidden', mode !== 'capital');
    DOM.dvResult.classList.toggle('hidden', mode !== 'dividend');
  },

  /* ── 자동완성 ── */
  readRowName(rowIdx) { const r = _cgRows[rowIdx]; return r ? r.nameInput.value.trim() : ''; },
  showAC(rowIdx, matches) {
    const row = _cgRows[rowIdx];
    if (!row) return;
    if (!matches.length) { row.acList.classList.remove('open'); return; }
    row.acList.innerHTML = matches.map(s =>
      `<div class="ac-item" onmousedown="selectAC(${rowIdx},'${s.ticker}',${JSON.stringify(s.name)},${s.price||0})"><span class="ac-ticker">${s.ticker}</span><span class="ac-name">${s.name}</span></div>`
    ).join('');
    row.acList.classList.add('open');
  },
  selectAC(rowIdx, ticker, name, price) {
    const row = _cgRows[rowIdx]; if (!row) return;
    row.nameInput.value = ticker + ' ' + name;
    if (price) row.sellInput.value = price;
    row.acList.classList.remove('open');
  },
  closeAllAC() { _cgRows.forEach(r => { if (r) r.acList.classList.remove('open'); }); },

  /* ── 국가/테마 ── */
  updateCGCountry(info) { DOM.cgExRate.value = info.exRate; },
  updateDVCountry(info) { DOM.dvExRate.value = info.exRate; DOM.dvWithhold.value = info.withhold; DOM.dvCurrUnit.textContent = info.curr; },
  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    DOM.themeBtn.textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('finq-theme', isDark ? 'light' : 'dark');
  },
  restoreTheme() {
    if (localStorage.getItem('finq-theme') !== 'dark') return;
    document.documentElement.setAttribute('data-theme', 'dark');
    DOM.themeBtn.textContent = '☀️';
  }
};
