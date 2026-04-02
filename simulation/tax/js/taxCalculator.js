/* 세금 계산 순수 로직 — input 외 접근 금지, DOM/외부 상태 금지 */

const TAX_RATE = 0.22;
const DEDUCTION = 250;
const MAN_WON = 10000;
const DV_KOREA_RATE = 0.154;
const DV_FIN_THRESHOLD = 2000;
const DV_LOCAL_TAX_MULT = 1.1;

const taxCalculator = {

  calculate(input) {
    return input.taxType === 'capital'
      ? this._calcCapital(input)
      : this._calcDividend(input);
  },

  _calcCapital(input) {
    const { trades, exchangeRate, otherProfit = 0 } = input;

    // 1) 총 손익 계산
    const { totalForeign, rowResults } = trades.reduce((acc, r) => {
      const pl = (r.sell - r.buy) * r.qty;
      acc.totalForeign += pl;
      acc.rowResults.push({ ...r, pl, plKRW: pl * exchangeRate / MAN_WON });
      return acc;
    }, { totalForeign: 0, rowResults: [] });

    const profitKRW = totalForeign * exchangeRate / MAN_WON;
    const totalProfit = profitKRW + otherProfit;

    // 2) 과세표준 계산
    const taxableAmount = Math.max(totalProfit - DEDUCTION, 0);

    // 3) 세율 적용 → 4) 최종 세금 계산
    const finalTax = taxableAmount * TAX_RATE;
    const effRate = totalProfit > 0 ? finalTax / totalProfit * 100 : 0;
    const status = totalProfit <= 0 ? 'loss' : totalProfit <= DEDUCTION ? 'exempt' : 'taxable';

    return {
      taxType: 'capital', totalProfit, taxableAmount, taxRate: TAX_RATE, finalTax,
      rowResults, profitKRW, deduction: DEDUCTION,
      netProfit: totalProfit - finalTax, effRate, otherProfit, status
    };
  },

  _calcDividend(input) {
    const { trades, exchangeRate, withholdRate, finIncome = 0, marginalRate, currUnit = '' } = input;
    const amountLocal = trades[0]?.amount || 0;

    // 1) 총 손익 계산
    const grossKRW = amountLocal * exchangeRate;
    const grossMan = grossKRW / MAN_WON;
    const withholdTax = grossKRW * withholdRate;
    const totalFinIncome = finIncome + grossMan;

    // 2) 과세표준 계산 → 3) 세율 적용
    const isSeparate = totalFinIncome <= DV_FIN_THRESHOLD;
    const appliedRate = isSeparate ? DV_KOREA_RATE : marginalRate * DV_LOCAL_TAX_MULT;
    const domesticTax = Math.max(grossKRW * appliedRate - withholdTax, 0);

    // 4) 최종 세금 계산
    const totalTax = withholdTax + domesticTax;
    const effectiveRate = grossKRW > 0 ? withholdRate + domesticTax / grossKRW : 0;

    return {
      taxType: 'dividend', totalProfit: grossMan, taxableAmount: grossMan,
      taxRate: effectiveRate, finalTax: totalTax / MAN_WON,
      grossKRW, grossMan, withholdTax, withholdMan: withholdTax / MAN_WON,
      domesticTax, domesticTaxMan: domesticTax / MAN_WON,
      totalTaxMan: totalTax / MAN_WON, netMan: (grossKRW - totalTax) / MAN_WON,
      effectiveRate, totalFinIncome, marginalRate, withholdRate,
      amountLocal, currUnit,
      taxType_label: isSeparate
        ? '분리과세 (' + (DV_KOREA_RATE * 100) + '%)'
        : '종합과세 (' + (marginalRate * 100).toFixed(0) + '% + 지방세)',
      status: isSeparate ? 'separate' : 'comprehensive'
    };
  }
};
