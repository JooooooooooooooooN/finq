export async function onRequest(context) {
  const { env, request } = context;
  const apiKey = env.DART_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DART API 키가 설정되지 않았습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const url  = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '3'), 30);

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const dartUrl = `https://opendart.fss.or.kr/api/list.json`
    + `?crtfc_key=${apiKey}`
    + `&bgn_de=${fmt(start)}`
    + `&end_de=${fmt(end)}`
    + `&page_no=1&page_count=50`
    + `&sort=date&sort_mth=desc`;

  try {
    const res = await fetch(dartUrl, {
      redirect: 'manual',   // 리다이렉트 자동 추적 금지
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://opendart.fss.or.kr/',
      },
    });

    // 리다이렉트 → 에러 페이지로 유도되는 패턴 감지
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') || '';
      throw new Error(`DART 접근 차단 (→ ${location || res.status}). IP 제한 가능성`);
    }
    if (!res.ok) throw new Error(`DART 응답 오류 (${res.status})`);

    const text = await res.text();
    // HTML 에러페이지 응답 감지
    if (text.trim().startsWith('<')) {
      throw new Error('DART 에러 페이지 응답 — IP 또는 API 키 문제');
    }

    const data = JSON.parse(text);
    if (data.status !== '000') throw new Error(data.message || `DART 오류 (status: ${data.status})`);

    const KEY_KW = ['자기주식','유상증자','무상증자','분기보고서','반기보고서','사업보고서','공급계약','주요사항','합병','분할','전환사채','신주인수권'];

    const items = (data.list || []).map(item => {
      const nm  = item.report_nm;
      let typeLabel = '기타';
      if (nm.includes('자기주식'))   typeLabel = '자사주';
      else if (nm.includes('유상증자') || nm.includes('무상증자')) typeLabel = '증자';
      else if (nm.includes('보고서')) typeLabel = '실적';
      else if (nm.includes('공급계약')) typeLabel = '공급계약';
      else if (nm.includes('합병') || nm.includes('분할')) typeLabel = 'M&A';
      else if (nm.includes('전환사채') || nm.includes('신주인수권')) typeLabel = '사채·CB';
      else if (item.pblntf_ty === 'B') typeLabel = '주요사항';

      return {
        rcept_no:  item.rcept_no,
        corp_name: item.corp_name,
        report_nm: item.report_nm,
        rcept_dt:  item.rcept_dt,
        typeLabel,
        isKey: KEY_KW.some(k => nm.includes(k)),
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
      };
    });

    return new Response(JSON.stringify({
      total: data.total_count,
      items,
      updatedAt: new Date().toISOString(),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
