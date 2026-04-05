export async function onRequest(context) {
  const { request } = context;
  const url    = new URL(request.url);
  const symbol = url.searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'symbol 파라미터가 필요합니다' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // crumb 획득 — 최대 2회 재시도
  async function getCrumbAndCookie() {
    for (let i = 0; i < 2; i++) {
      const sessionRes = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': UA },
        redirect: 'manual',
      });
      const rawCookie = sessionRes.headers.get('set-cookie') || '';
      const cookie = rawCookie
        .split(',')
        .map(c => c.trim().split(';')[0])
        .filter(Boolean)
        .join('; ');

      const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: { 'User-Agent': UA, 'Cookie': cookie },
      });
      const crumb = (await crumbRes.text()).trim();

      if (crumb && crumb.length > 3) return { cookie, crumb };
    }
    throw new Error('Yahoo Finance 인증 실패 — 잠시 후 다시 시도해 주세요');
  }

  try {
    const { cookie, crumb } = await getCrumbAndCookie();

    const encoded = encodeURIComponent(symbol);
    const modules = 'defaultKeyStatistics,financialData,summaryDetail,price';
    const dataUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encoded}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(dataUrl, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookie,
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/',
      },
    });

    if (res.status === 401) throw new Error('Yahoo Finance 인증 오류 — 잠시 후 다시 시도해 주세요');
    if (res.status === 404) throw new Error('Yahoo Finance에 이 종목 데이터가 없습니다');
    if (!res.ok)            throw new Error(`Yahoo Finance 오류 (${res.status})`);

    const data = await res.json();

    // quoteSummary 자체 오류 확인
    const ysErr = data.quoteSummary?.error;
    if (ysErr) {
      const desc = ysErr.description || ysErr.code || '알 수 없는 오류';
      throw new Error(`종목 조회 실패: ${desc}`);
    }

    const result = data.quoteSummary?.result?.[0];
    if (!result) throw new Error('이 종목의 재무 데이터를 Yahoo Finance에서 제공하지 않습니다');

    const { defaultKeyStatistics: stats, financialData: fin, summaryDetail: sum, price } = result;
    const f = (v) => v?.fmt ?? '-';

    return new Response(JSON.stringify({
      symbol:          price?.symbol       || symbol,
      name:            price?.shortName    || price?.longName || symbol,
      currency:        price?.currency     || 'USD',
      exchange:        price?.exchangeName || '',
      marketCap:       f(price?.marketCap),
      // 밸류에이션
      per:             f(sum?.trailingPE),
      forwardPer:      f(sum?.forwardPE),
      pbr:             f(stats?.priceToBook),
      eps:             f(stats?.trailingEps),
      // 수익성
      roe:             f(fin?.returnOnEquity),
      roa:             f(fin?.returnOnAssets),
      operatingMargin: f(fin?.operatingMargins),
      profitMargin:    f(fin?.profitMargins),
      grossMargin:     f(fin?.grossMargins),
      // 성장성
      revenueGrowth:   f(fin?.revenueGrowth),
      earningsGrowth:  f(fin?.earningsGrowth),
      // 재무건전성
      debtToEquity:    f(fin?.debtToEquity),
      currentRatio:    f(fin?.currentRatio),
      // 배당
      dividendYield:   f(sum?.dividendYield),
      payoutRatio:     f(sum?.payoutRatio),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
