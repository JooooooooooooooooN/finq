const WATCHLIST = [
  { symbol: 'AAPL',  name: 'Apple',          sector: '빅테크',     importance: 'high' },
  { symbol: 'MSFT',  name: 'Microsoft',       sector: '빅테크',     importance: 'high' },
  { symbol: 'GOOGL', name: 'Alphabet',        sector: '빅테크',     importance: 'high' },
  { symbol: 'AMZN',  name: 'Amazon',          sector: '빅테크',     importance: 'high' },
  { symbol: 'META',  name: 'Meta',            sector: '빅테크',     importance: 'high' },
  { symbol: 'NVDA',  name: 'NVIDIA',          sector: '반도체',     importance: 'high' },
  { symbol: 'AMD',   name: 'AMD',             sector: '반도체',     importance: 'mid'  },
  { symbol: 'AVGO',  name: 'Broadcom',        sector: '반도체',     importance: 'mid'  },
  { symbol: 'QCOM',  name: 'Qualcomm',        sector: '반도체',     importance: 'mid'  },
  { symbol: 'MU',    name: 'Micron',          sector: '반도체',     importance: 'mid'  },
  { symbol: 'INTC',  name: 'Intel',           sector: '반도체',     importance: 'mid'  },
  { symbol: 'TSLA',  name: 'Tesla',           sector: '자동차',     importance: 'high' },
  { symbol: 'JPM',   name: 'JPMorgan',        sector: '금융',       importance: 'high' },
  { symbol: 'BAC',   name: 'Bank of America', sector: '금융',       importance: 'mid'  },
  { symbol: 'GS',    name: 'Goldman Sachs',   sector: '금융',       importance: 'mid'  },
  { symbol: 'MS',    name: 'Morgan Stanley',  sector: '금융',       importance: 'mid'  },
  { symbol: 'V',     name: 'Visa',            sector: '금융',       importance: 'mid'  },
  { symbol: 'NFLX',  name: 'Netflix',         sector: '미디어',     importance: 'mid'  },
  { symbol: 'COST',  name: 'Costco',          sector: '소비재',     importance: 'mid'  },
  { symbol: 'WMT',   name: 'Walmart',         sector: '소비재',     importance: 'mid'  },
  { symbol: 'ORCL',  name: 'Oracle',          sector: '소프트웨어', importance: 'mid'  },
  { symbol: 'CRM',   name: 'Salesforce',      sector: '소프트웨어', importance: 'mid'  },
];

export async function onRequest(context) {
  try {
    const apiKey = context.env.FINNHUB_API_KEY;
    if (!apiKey) throw new Error('FINNHUB_API_KEY 없음');

    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const to = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];

    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`
    );
    if (!res.ok) throw new Error('Finnhub API 오류: ' + res.status);
    const data = await res.json();

    const symbolMap = Object.fromEntries(WATCHLIST.map(w => [w.symbol, w]));

    const items = (data.earningsCalendar || [])
      .filter(e => symbolMap[e.symbol])
      .map(e => {
        const w = symbolMap[e.symbol];
        const dateRaw = Math.floor(new Date(e.date + 'T00:00:00').getTime() / 1000);

        const epsEst = e.epsEstimate != null ? e.epsEstimate.toFixed(2) : '-';
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
          name: w.name,
          sector: w.sector,
          dateRaw,
          dateFmt: e.date,
          callTime,
          epsEst,
          revEst,
          importance: w.importance,
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
