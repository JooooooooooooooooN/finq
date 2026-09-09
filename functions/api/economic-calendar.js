/**
 * 경제 일정 캘린더 API
 *
 * Finnhub 무료 플랜은 economic calendar 엔드포인트를 지원하지 않아(403) 정적 일정으로 전환.
 * FOMC·CPI·고용지표 등 주요 지표는 발표일이 1년 단위로 미리 공개되므로
 * 외부 API보다 정적 데이터가 더 안정적이다.
 *
 * 출처 (모두 공식 발표 일정)
 *  - FOMC        : federalreserve.gov/monetarypolicy/fomccalendars.htm
 *  - CPI / 고용   : bls.gov/schedule/news_release/
 *  - PCE / GDP   : bea.gov/news/schedule
 *  - 한은 금통위  : bok.or.kr
 *
 * 날짜·시간은 모두 한국 시각(KST) 기준으로 변환해 저장했다.
 *  - 미국 지표 08:30 ET  -> 서머타임 21:30 / 표준시 22:30 (같은 날)
 *  - FOMC       14:00 ET -> 서머타임 익일 03:00 / 표준시 익일 04:00
 *  (미국 서머타임: 2026-03-08~11-01, 2027-03-14~11-07)
 *
 * ⚠️ 갱신 규칙: 2027년 CPI·고용·PCE·GDP 일정은 아직 미공개다.
 *    BLS/BEA가 다음 해 일정을 발표하면 아래 EVENTS에 추가할 것.
 */

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=3600'
};

// date: KST 기준 발표일 / time: KST 기준 발표 시각
const EVENTS = [
  // ── 2026 ──────────────────────────────────────────────
  { date: '2026-09-11', time: '21:30', event: '소비자물가지수 (CPI) — 8월', eventEn: 'Consumer Price Index (CPI)', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-09-17', time: '03:00', event: '연준 금리 결정 + 경제 전망(SEP)', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-09-30', time: '21:30', event: '개인소비지출 (PCE) — 8월', eventEn: 'PCE Price Index', country: '미국', countryCode: 'US', impactRaw: 'high' },

  { date: '2026-10-02', time: '21:30', event: '비농업고용지표 (NFP) — 9월', eventEn: 'Nonfarm Payrolls', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-10-08', time: '03:00', event: 'FOMC 의사록 공개', eventEn: 'FOMC Meeting Minutes', country: '미국', countryCode: 'US', impactRaw: 'medium' },
  { date: '2026-10-14', time: '21:30', event: '소비자물가지수 (CPI) — 9월', eventEn: 'Consumer Price Index (CPI)', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-10-22', time: '10:00', event: '한국은행 기준금리 결정', eventEn: 'BOK Interest Rate Decision', country: '한국', countryCode: 'KR', impactRaw: 'high' },
  { date: '2026-10-29', time: '03:00', event: '연준 금리 결정', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-10-29', time: '21:30', event: 'GDP 성장률 3분기 (속보치)', eventEn: 'GDP Growth Rate QoQ Adv', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-10-29', time: '21:30', event: '개인소비지출 (PCE) — 9월', eventEn: 'PCE Price Index', country: '미국', countryCode: 'US', impactRaw: 'high' },

  { date: '2026-11-06', time: '22:30', event: '비농업고용지표 (NFP) — 10월', eventEn: 'Nonfarm Payrolls', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-11-10', time: '22:30', event: '소비자물가지수 (CPI) — 10월', eventEn: 'Consumer Price Index (CPI)', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-11-19', time: '04:00', event: 'FOMC 의사록 공개', eventEn: 'FOMC Meeting Minutes', country: '미국', countryCode: 'US', impactRaw: 'medium' },
  { date: '2026-11-25', time: '22:30', event: '개인소비지출 (PCE) — 10월', eventEn: 'PCE Price Index', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-11-25', time: '22:30', event: 'GDP 성장률 3분기 (잠정치)', eventEn: 'GDP Growth Rate QoQ', country: '미국', countryCode: 'US', impactRaw: 'medium' },
  { date: '2026-11-26', time: '10:00', event: '한국은행 기준금리 결정', eventEn: 'BOK Interest Rate Decision', country: '한국', countryCode: 'KR', impactRaw: 'high' },

  { date: '2026-12-04', time: '22:30', event: '비농업고용지표 (NFP) — 11월', eventEn: 'Nonfarm Payrolls', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-12-10', time: '04:00', event: '연준 금리 결정 + 경제 전망(SEP)', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-12-10', time: '22:30', event: '소비자물가지수 (CPI) — 11월', eventEn: 'Consumer Price Index (CPI)', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-12-23', time: '22:30', event: '개인소비지출 (PCE) — 11월', eventEn: 'PCE Price Index', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2026-12-23', time: '22:30', event: 'GDP 성장률 3분기 (확정치)', eventEn: 'GDP Growth Rate QoQ', country: '미국', countryCode: 'US', impactRaw: 'medium' },
  { date: '2026-12-31', time: '04:00', event: 'FOMC 의사록 공개', eventEn: 'FOMC Meeting Minutes', country: '미국', countryCode: 'US', impactRaw: 'medium' },

  // ── 2027 (FOMC만 공개됨) ───────────────────────────────
  { date: '2027-01-28', time: '04:00', event: '연준 금리 결정', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-03-18', time: '03:00', event: '연준 금리 결정 + 경제 전망(SEP)', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-04-29', time: '03:00', event: '연준 금리 결정', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-06-10', time: '03:00', event: '연준 금리 결정 + 경제 전망(SEP)', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-07-29', time: '03:00', event: '연준 금리 결정', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-09-16', time: '03:00', event: '연준 금리 결정 + 경제 전망(SEP)', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-10-28', time: '03:00', event: '연준 금리 결정', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
  { date: '2027-12-09', time: '04:00', event: '연준 금리 결정 + 경제 전망(SEP)', eventEn: 'Fed Interest Rate Decision', country: '미국', countryCode: 'US', impactRaw: 'high' },
];

const IMPACT_KO = { high: '중요', medium: '보통', low: '낮음' };
const IMPACT_ORDER = { high: 0, medium: 1, low: 2 };

// KST 기준 이번 주(월~일) 범위
function getWeekRange(offsetWeeks = 0) {
  const nowUtc = new Date();
  const kst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(kst);
  mon.setUTCDate(kst.getUTCDate() + diffToMon + offsetWeeks * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const fmt = d => d.toISOString().split('T')[0];
  return { from: fmt(mon), to: fmt(sun) };
}

export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const weekOffset = parseInt(url.searchParams.get('week') || '0', 10) || 0;
    const { from, to } = getWeekRange(weekOffset);

    const events = EVENTS
      .filter(e => e.date >= from && e.date <= to)
      .map(e => ({
        date: e.date,
        time: e.time,
        event: e.event,
        eventEn: e.eventEn,
        country: e.country,
        countryCode: e.countryCode,
        impact: IMPACT_KO[e.impactRaw] || e.impactRaw,
        impactRaw: e.impactRaw,
        estimate: null,
        prev: null,
        actual: null,
        unit: '',
      }))
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        const t = a.time.localeCompare(b.time);
        if (t !== 0) return t;
        return (IMPACT_ORDER[a.impactRaw] ?? 9) - (IMPACT_ORDER[b.impactRaw] ?? 9);
      });

    // 정적 데이터가 어디까지 채워져 있는지 프론트가 알 수 있게 함께 반환
    const coverageEnd = EVENTS[EVENTS.length - 1].date;

    return new Response(JSON.stringify({ events, from, to, coverageEnd }), { headers: HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: HEADERS
    });
  }
}
