export async function onRequest(context) {
  const { request } = context;
  const url  = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '7'), 30);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const UA = 'Mozilla/5.0 (compatible; FinQ/1.0; +https://finq.kr)';

  // display_names 항목에서 이름만 추출 ("NAME (CIK 0001234567)" → "NAME")
  function parseName(str) {
    if (!str) return '';
    return str.replace(/\s*\(CIK\s*\d+\)/i, '').trim();
  }

  // adsh + companyCik → EDGAR filing index URL
  function makeUrl(adsh, cik) {
    const c = parseInt(cik || '0').toString();
    const nodash = adsh.replace(/-/g, '');
    return `https://www.sec.gov/Archives/edgar/data/${c}/${nodash}/${adsh}-index.htm`;
  }

  try {
    const searchUrl =
      `https://efts.sec.gov/LATEST/search-index?forms=4` +
      `&dateRange=custom&startdt=${fmt(start)}&enddt=${fmt(end)}` +
      `&hits.hits._source=display_names,ciks,file_date,period_ending,adsh,form` +
      `&hits.hits.total.value=true`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`EDGAR 응답 오류 (${res.status})`);

    const data = await res.json();
    const hits  = data?.hits?.hits || [];

    const items = hits.slice(0, 50).map(h => {
      const s    = h._source || {};
      const dns  = s.display_names || [];
      const ciks = s.ciks || [];

      // display_names[0]=내부자, [1]=회사 (SEC 관례)
      const insiderName  = parseName(dns[0] || '');
      const companyName  = parseName(dns[1] || dns[0] || '');
      const insiderCik   = ciks[0] || '';
      const companyCik   = ciks[1] || ciks[0] || '';
      const adsh         = s.adsh || h._id?.split(':')[0] || '';

      const fd = s.file_date || '';
      const pd = s.period_ending || '';

      return {
        company:    companyName,
        insider:    insiderName,
        fileDate:   fd,
        periodDate: pd,
        fileDateStr:   fd ? `${fd.slice(0,4)}.${fd.slice(5,7)}.${fd.slice(8,10)}` : '',
        periodDateStr: pd ? `${pd.slice(0,4)}.${pd.slice(5,7)}.${pd.slice(8,10)}` : '',
        url: adsh && companyCik ? makeUrl(adsh, companyCik) : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${companyCik}&type=4&dateb=&owner=include&count=5`,
      };
    }).filter(d => d.company);

    return new Response(JSON.stringify({
      total: data?.hits?.total?.value || 0,
      days,
      items,
      updatedAt: new Date().toISOString(),
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
