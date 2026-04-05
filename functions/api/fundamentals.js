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

  try {
    // ── Step 1: 세션 쿠키 획득 ──────────────────────
    const sessionRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA },
      redirect: 'manual',
    });
    const rawCookie = sessionRes.headers.get('set-cookie') || '';
    // 여러 쿠키를 name=value 형태로만 추출해 합침
    const cookie = rawCookie
      .split(',')
      .map(c => c.trim().split(';')[0])
      .filter(Boolean)
      .join('; ');

    // ── Step 2: 크럼 획득 ──────────────────────────
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, 'Cookie': cookie },
    });
    const crumb = (await crumbRes.text()).trim();

    // ── Step 3: 재무 데이터 요청 ───────────────────
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

    if (!res.ok) throw new Error(`Yahoo Finance 오류 (${res.status})`);

    const data   = await res.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) throw new Error('종목을 찾을 수 없습니다');

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
