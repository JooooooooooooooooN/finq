const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// 2026년 주요 경제 일정 (하드코딩)
// 출처: Fed, BLS 공식 발표 일정 기준 / 분기 1회 업데이트 권장
const EVENTS_2026 = [
  // ── 1월 ──
  { date: '2026-01-09', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-01-14', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-01-14', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-01-16', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-01-29', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 2월 ──
  { date: '2026-02-06', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-02-11', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-02-11', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-02-13', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-02-18', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-02-19', time: '22:15', event: '산업생산', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-02-26', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 3월 ──
  { date: '2026-03-06', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-03-11', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-03-11', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-03-13', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-03-17', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-03-19', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-03-19', time: '03:00', event: 'FOMC 경제 전망', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '' },
  { date: '2026-03-26', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-03-26', time: '21:30', event: 'GDP 성장률 (QoQ)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 4월 ──
  { date: '2026-04-03', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-04-10', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-04-10', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-04-11', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-04-15', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-04-16', time: '22:15', event: '산업생산', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-04-23', time: '21:30', event: 'GDP 성장률 속보치', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-04-30', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 5월 ──
  { date: '2026-05-07', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-05-08', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-05-13', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-05-13', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-05-15', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-05-15', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-05-28', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-05-28', time: '21:30', event: 'GDP 성장률 (QoQ)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 6월 ──
  { date: '2026-06-05', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-06-10', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-06-10', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-06-11', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-06-17', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-06-18', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-06-18', time: '03:00', event: 'FOMC 경제 전망', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '' },
  { date: '2026-06-26', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 7월 ──
  { date: '2026-07-02', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-07-15', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-07-15', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-07-16', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-07-16', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-07-30', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-07-30', time: '21:30', event: 'GDP 성장률 속보치', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-07-31', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 8월 ──
  { date: '2026-08-07', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-08-12', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-08-12', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-08-13', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-08-14', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-08-27', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 9월 ──
  { date: '2026-09-04', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-09-11', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-09-11', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-09-11', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-09-15', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-09-17', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-09-17', time: '03:00', event: 'FOMC 경제 전망', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '' },
  { date: '2026-09-25', time: '21:30', event: 'GDP 성장률 (QoQ)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-09-25', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 10월 ──
  { date: '2026-10-02', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-10-14', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-10-14', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-10-15', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-10-15', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-10-29', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-10-29', time: '21:30', event: 'GDP 성장률 속보치', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-10-30', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 11월 ──
  { date: '2026-11-06', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-11-12', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-11-12', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-11-13', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-11-17', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-11-25', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-11-25', time: '21:30', event: 'GDP 성장률 (QoQ)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },

  // ── 12월 ──
  { date: '2026-12-04', time: '21:30', event: '비농업고용지표 (NFP)', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '천명' },
  { date: '2026-12-10', time: '21:30', event: '소비자물가지수 (CPI) MoM', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-12-10', time: '21:30', event: '소비자물가지수 (CPI) YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-12-10', time: '03:00', event: '연준 금리 결정', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-12-10', time: '03:00', event: 'FOMC 경제 전망', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '' },
  { date: '2026-12-11', time: '21:30', event: '생산자물가지수 (PPI)', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-12-15', time: '21:30', event: '소매판매 MoM', country: '미국', countryCode: 'US', impactRaw: 'medium', unit: '%' },
  { date: '2026-12-22', time: '21:30', event: 'GDP 성장률 속보치', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
  { date: '2026-12-24', time: '22:00', event: '근원 PCE YoY', country: '미국', countryCode: 'US', impactRaw: 'high', unit: '%' },
];

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offsetWeeks * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toISOString().split('T')[0];
  return { from: fmt(mon), to: fmt(sun) };
}

export async function onRequest(context) {
  const { request: req } = context;
  try {
    const url = new URL(req.url);
    const weekOffset = parseInt(url.searchParams.get('week') || '0');
    const limitParam = url.searchParams.get('limit');

    const { from, to } = getWeekRange(weekOffset);

    let events = EVENTS_2026
      .filter(e => e.date >= from && e.date <= to)
      .map(e => ({
        ...e,
        impact: e.impactRaw === 'high' ? '중요' : '보통',
        estimate: null,
        prev: null,
        actual: null,
      }))
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.impactRaw === 'high' ? -1 : 1;
      });

    if (limitParam) {
      const limit = parseInt(limitParam);
      const high = events.filter(e => e.impactRaw === 'high');
      const rest = events.filter(e => e.impactRaw !== 'high');
      events = [...high, ...rest].slice(0, limit);
    }

    return new Response(
      JSON.stringify({ events, from, to }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
