const WATCHLIST = [
  // 빅테크 (5)
  { symbol: 'AAPL',  name: 'Apple',            sector: '빅테크',     importance: 'high' },
  { symbol: 'MSFT',  name: 'Microsoft',         sector: '빅테크',     importance: 'high' },
  { symbol: 'GOOGL', name: 'Alphabet',          sector: '빅테크',     importance: 'high' },
  { symbol: 'AMZN',  name: 'Amazon',            sector: '빅테크',     importance: 'high' },
  { symbol: 'META',  name: 'Meta',              sector: '빅테크',     importance: 'high' },
  // 반도체 (5)
  { symbol: 'NVDA',  name: 'NVIDIA',            sector: '반도체',     importance: 'high' },
  { symbol: 'AMD',   name: 'AMD',               sector: '반도체',     importance: 'mid'  },
  { symbol: 'AVGO',  name: 'Broadcom',          sector: '반도체',     importance: 'mid'  },
  { symbol: 'QCOM',  name: 'Qualcomm',          sector: '반도체',     importance: 'mid'  },
  { symbol: 'INTC',  name: 'Intel',             sector: '반도체',     importance: 'mid'  },
  // 소프트웨어 (3)
  { symbol: 'ORCL',  name: 'Oracle',            sector: '소프트웨어', importance: 'mid'  },
  { symbol: 'ADBE',  name: 'Adobe',             sector: '소프트웨어', importance: 'mid'  },
  { symbol: 'NOW',   name: 'ServiceNow',        sector: '소프트웨어', importance: 'mid'  },
  // 자동차 (1)
  { symbol: 'TSLA',  name: 'Tesla',             sector: '자동차',     importance: 'high' },
  // 금융 (6)
  { symbol: 'JPM',   name: 'JPMorgan',          sector: '금융',       importance: 'high' },
  { symbol: 'GS',    name: 'Goldman Sachs',     sector: '금융',       importance: 'mid'  },
  { symbol: 'BAC',   name: 'Bank of America',   sector: '금융',       importance: 'mid'  },
  { symbol: 'V',     name: 'Visa',              sector: '금융',       importance: 'mid'  },
  { symbol: 'MA',    name: 'Mastercard',        sector: '금융',       importance: 'mid'  },
  { symbol: 'PYPL',  name: 'PayPal',            sector: '금융',       importance: 'mid'  },
  // 미디어 (2)
  { symbol: 'NFLX',  name: 'Netflix',           sector: '미디어',     importance: 'mid'  },
  { symbol: 'DIS',   name: 'Disney',            sector: '미디어',     importance: 'mid'  },
  // 소비재 (6)
  { symbol: 'COST',  name: 'Costco',            sector: '소비재',     importance: 'mid'  },
  { symbol: 'WMT',   name: 'Walmart',           sector: '소비재',     importance: 'mid'  },
  { symbol: 'MCD',   name: "McDonald's",        sector: '소비재',     importance: 'mid'  },
  { symbol: 'NKE',   name: 'Nike',              sector: '소비재',     importance: 'mid'  },
  { symbol: 'SBUX',  name: 'Starbucks',         sector: '소비재',     importance: 'mid'  },
  { symbol: 'KO',    name: 'Coca-Cola',         sector: '소비재',     importance: 'mid'  },
  // 헬스케어 (4)
  { symbol: 'LLY',   name: 'Eli Lilly',         sector: '헬스케어',   importance: 'mid'  },
  { symbol: 'JNJ',   name: 'Johnson & Johnson', sector: '헬스케어',   importance: 'mid'  },
  { symbol: 'UNH',   name: 'UnitedHealth',      sector: '헬스케어',   importance: 'mid'  },
  { symbol: 'PFE',   name: 'Pfizer',            sector: '헬스케어',   importance: 'mid'  },
  // 에너지 (2)
  { symbol: 'XOM',   name: 'ExxonMobil',        sector: '에너지',     importance: 'mid'  },
  { symbol: 'CVX',   name: 'Chevron',           sector: '에너지',     importance: 'mid'  },
  // 항공우주/산업 (3)
  { symbol: 'BA',    name: 'Boeing',            sector: '항공우주',   importance: 'mid'  },
  { symbol: 'CAT',   name: 'Caterpillar',       sector: '산업재',     importance: 'mid'  },
  { symbol: 'GE',    name: 'GE Aerospace',      sector: '항공우주',   importance: 'mid'  },
  // 여행/기타 (3)
  { symbol: 'BKNG',  name: 'Booking Holdings',  sector: '여행',       importance: 'mid'  },
  { symbol: 'UBER',  name: 'Uber',              sector: '여행',       importance: 'mid'  },
  { symbol: 'COIN',  name: 'Coinbase',          sector: '크립토',     importance: 'mid'  },
];

export async function onRequest(context) {
  try {
    const apiKey = context.env.FINNHUB_API_KEY;
    if (!apiKey) throw new Error('FINNHUB_API_KEY 없음');

    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const to = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`
    );
    if (!res.ok) throw new Error('Finnhub API 오류: ' + res.status);
    const data = await res.json();

    const watchlistMap = Object.fromEntries(WATCHLIST.map(w => [w.symbol, w]));

    const items = (data.earningsCalendar || [])
      .filter(e => watchlistMap[e.symbol])
      .map(e => {
        const w = watchlistMap[e.symbol];
        const dateRaw = Math.floor(new Date(e.date + 'T00:00:00').getTime() / 1000);

        const epsEst = e.epsEstimate.toFixed(2);
        let revEst = '-';
        if (e.revenueEstimate != null) {
          const b = e.revenueEstimate / 1e9;
          revEst = b >= 1 ? `$${b.toFixed(1)}B` : `$${(e.revenueEstimate / 1e6).toFixed(0)}M`;
        }

        let callTime = '';
        if (e.hour === 'bmo') callTime = 'before market open';
        else if (e.hour === 'amc') callTime = 'after market close';

        return {
          symbol: e.symbol,
          name: w?.name || e.symbol,
          sector: w?.sector || '기타',
          dateRaw,
          dateFmt: e.date,
          callTime,
          epsEst,
          revEst,
          importance: w?.importance || 'mid',
        };
      })
      .sort((a, b) => a.dateRaw - b.dateRaw);

    return new Response(JSON.stringify({ items, updatedAt: new Date().toISOString() }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
