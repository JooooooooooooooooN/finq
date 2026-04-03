export async function onRequest(context) {
  const WATCHLIST = [
    { symbol: 'AAPL',  sector: '빅테크'    },
    { symbol: 'MSFT',  sector: '빅테크'    },
    { symbol: 'GOOGL', sector: '빅테크'    },
    { symbol: 'AMZN',  sector: '빅테크'    },
    { symbol: 'META',  sector: '빅테크'    },
    { symbol: 'NVDA',  sector: '반도체'    },
    { symbol: 'AMD',   sector: '반도체'    },
    { symbol: 'AVGO',  sector: '반도체'    },
    { symbol: 'QCOM',  sector: '반도체'    },
    { symbol: 'MU',    sector: '반도체'    },
    { symbol: 'INTC',  sector: '반도체'    },
    { symbol: 'TSLA',  sector: '자동차'    },
    { symbol: 'JPM',   sector: '금융'      },
    { symbol: 'BAC',   sector: '금융'      },
    { symbol: 'GS',    sector: '금융'      },
    { symbol: 'MS',    sector: '금융'      },
    { symbol: 'V',     sector: '금융'      },
    { symbol: 'NFLX',  sector: '미디어'    },
    { symbol: 'COST',  sector: '소비재'    },
    { symbol: 'WMT',   sector: '소비재'    },
    { symbol: 'ORCL',  sector: '소프트웨어'},
    { symbol: 'CRM',   sector: '소프트웨어'},
  ];

  const HIGH = new Set(['AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA']);

  const nowSec   = Date.now() / 1000;
  const pastCut  = nowSec - 86400;          // 1일 전까지 허용
  const futureCut = nowSec + 90 * 86400;    // 90일 후까지

  const settled = await Promise.allSettled(
    WATCHLIST.map(async ({ symbol, sector }) => {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=calendarEvents,price`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      const r = data.quoteSummary?.result?.[0];
      if (!r) return null;

      const e   = r.calendarEvents?.earnings;
      const raw = e?.earningsDate?.[0]?.raw;
      if (!raw || raw < pastCut || raw > futureCut) return null;

      return {
        symbol,
        name: r.price?.shortName || symbol,
        sector,
        dateRaw:  raw,
        dateFmt:  e.earningsDate[0].fmt,
        callTime: e.earningsCallTime?.s || '',
        epsEst:   e.epsEstimate?.fmt    || '-',
        revEst:   e.revenueEstimate?.fmt || '-',
        importance: HIGH.has(symbol) ? 'high' : 'mid',
      };
    })
  );

  const items = settled
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
    .sort((a, b) => a.dateRaw - b.dateRaw);

  return new Response(JSON.stringify({ items, updatedAt: new Date().toISOString() }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
