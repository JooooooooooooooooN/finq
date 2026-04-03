const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const KO_NAMES = {
  'ISM Manufacturing PMI': 'ISM 제조업 PMI',
  'Nonfarm Payrolls': '비농업고용지표 (NFP)',
  'Consumer Price Index (CPI) YoY': '소비자물가지수 (CPI) YoY',
  'Consumer Price Index (CPI) MoM': '소비자물가지수 (CPI) MoM',
  'Core Consumer Price Index (CPI) YoY': '근원 CPI YoY',
  'Core Consumer Price Index (CPI) MoM': '근원 CPI MoM',
  'Producer Price Index (PPI) MoM': '생산자물가지수 (PPI)',
  'Producer Price Index (PPI) YoY': '생산자물가지수 (PPI) YoY',
  'Retail Sales MoM': '소매판매 MoM',
  'Retail Sales YoY': '소매판매 YoY',
  'GDP Growth Rate QoQ': 'GDP 성장률 (QoQ)',
  'GDP Growth Rate YoY': 'GDP 성장률 (YoY)',
  'GDP Growth Rate QoQ Adv': 'GDP 성장률 속보치',
  'Unemployment Rate': '실업률',
  'Fed Interest Rate Decision': '연준 금리 결정',
  'FOMC Economic Projections': 'FOMC 경제 전망',
  'FOMC Meeting Minutes': 'FOMC 의사록',
  'Initial Jobless Claims': '신규실업급여 청구건수',
  'Continuing Jobless Claims': '연속실업급여 청구건수',
  'Consumer Confidence': '소비자신뢰지수',
  'ISM Services PMI': 'ISM 서비스업 PMI',
  'ADP Nonfarm Employment Change': 'ADP 비농업고용',
  'PCE Price Index YoY': '개인소비지출 (PCE) YoY',
  'PCE Price Index MoM': '개인소비지출 (PCE) MoM',
  'Core PCE Price Index YoY': '근원 PCE YoY',
  'Core PCE Price Index MoM': '근원 PCE MoM',
  'Durable Goods Orders MoM': '내구재 주문',
  'Building Permits': '건축허가',
  'Housing Starts': '주택착공',
  'Existing Home Sales': '기존주택판매',
  'New Home Sales': '신규주택판매',
  'Pending Home Sales MoM': '잠정주택판매',
  'Trade Balance': '무역수지',
  'Industrial Production MoM': '산업생산',
  'Philadelphia Fed Manufacturing Index': '필라델피아 연은 제조업',
  'Empire State Manufacturing Index': '엠파이어 스테이트 제조업',
  'S&P Global Manufacturing PMI': 'S&P 글로벌 제조업 PMI',
  'S&P Global Services PMI': 'S&P 글로벌 서비스업 PMI',
  'S&P Global Composite PMI': 'S&P 글로벌 종합 PMI',
  'Michigan Consumer Sentiment': '미시간 소비자심리지수',
  'Job Openings (JOLTS)': '구인건수 (JOLTS)',
  'JOLTs Job Openings': '구인건수 (JOLTS)',
  'Dallas Fed Manufacturing Business Index': '댈러스 연은 제조업',
  'Chicago PMI': '시카고 PMI',
  'Factory Orders MoM': '공장수주',
  'Wholesale Inventories MoM': '도매재고',
  'CB Consumer Confidence': 'CB 소비자신뢰지수',
};

const KO_COUNTRIES = {
  'US': '미국', 'KR': '한국', 'JP': '일본', 'CN': '중국',
  'EU': '유럽', 'GB': '영국', 'DE': '독일', 'FR': '프랑스',
  'CA': '캐나다', 'AU': '호주', 'IT': '이탈리아', 'ES': '스페인',
};

// FMP impact 기준 (estimate 있으면 medium, 주요 이벤트는 high)
const HIGH_KEYWORDS = [
  'Nonfarm Payrolls', 'Fed Interest Rate', 'FOMC', 'Consumer Price Index',
  'CPI', 'PCE', 'GDP', 'Unemployment Rate', 'ISM Manufacturing',
];

function getImpact(event) {
  for (const kw of HIGH_KEYWORDS) {
    if (event.includes(kw)) return 'high';
  }
  return 'medium';
}

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
  const { request: req, env } = context;
  try {
    const url = new URL(req.url);
    const weekOffset = parseInt(url.searchParams.get('week') || '0');
    const limitParam = url.searchParams.get('limit');

    const { from, to } = getWeekRange(weekOffset);
    const apiKey = env.FMP_API_KEY;
    if (!apiKey) throw new Error('API 키 없음: FMP_API_KEY 미설정');

    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FMP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();

    let events = (Array.isArray(data) ? data : [])
      .filter(e => e.date && e.country && KO_COUNTRIES[e.country])
      .map(e => {
        const impactRaw = getImpact(e.event || '');
        return {
          date: e.date.split(' ')[0],
          time: e.date.split(' ')[1]?.slice(0, 5) || '',
          event: KO_NAMES[e.event] || e.event,
          eventEn: e.event,
          country: KO_COUNTRIES[e.country] || e.country,
          countryCode: e.country,
          impact: impactRaw === 'high' ? '중요' : '보통',
          impactRaw,
          estimate: e.estimate ?? null,
          prev: e.previous ?? null,
          actual: e.actual ?? null,
          unit: e.unit || '',
        };
      })
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

    return new Response(JSON.stringify({ events, from, to }), { headers: HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: HEADERS
    });
  }
}
