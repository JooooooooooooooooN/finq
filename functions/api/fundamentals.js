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

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,financialData,summaryDetail,price`;
    const res = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('Yahoo Finance 응답 오류');

    const data   = await res.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) throw new Error('종목을 찾을 수 없습니다');

    const { defaultKeyStatistics: stats, financialData: fin, summaryDetail: sum, price } = result;
    const f = (v) => v?.fmt ?? '-';

    return new Response(JSON.stringify({
      symbol:         price?.symbol          || symbol,
      name:           price?.shortName       || price?.longName || symbol,
      currency:       price?.currency        || 'USD',
      exchange:       price?.exchangeName    || '',
      marketCap:      f(price?.marketCap),
      // 밸류에이션
      per:            f(sum?.trailingPE),
      forwardPer:     f(sum?.forwardPE),
      pbr:            f(stats?.priceToBook),
      eps:            f(stats?.trailingEps),
      // 수익성
      roe:            f(fin?.returnOnEquity),
      roa:            f(fin?.returnOnAssets),
      operatingMargin:f(fin?.operatingMargins),
      profitMargin:   f(fin?.profitMargins),
      grossMargin:    f(fin?.grossMargins),
      // 성장성
      revenueGrowth:  f(fin?.revenueGrowth),
      earningsGrowth: f(fin?.earningsGrowth),
      // 재무건전성
      debtToEquity:   f(fin?.debtToEquity),
      currentRatio:   f(fin?.currentRatio),
      // 배당
      dividendYield:  f(sum?.dividendYield),
      payoutRatio:    f(sum?.payoutRatio),
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
