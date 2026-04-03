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
  const type = url.searchParams.get('type') || ''; // 빈값=전체, B=주요사항보고, A=정기공시

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  let dartUrl = `https://opendart.fss.or.kr/api/list.json`
    + `?crtfc_key=${apiKey}`
    + `&bgn_de=${fmt(start)}`
    + `&end_de=${fmt(end)}`
    + `&page_no=1&page_count=50`
    + `&sort=date&sort_mth=desc`;
  if (type) dartUrl += `&pblntf_ty=${type}`;

  try {
    const res  = await fetch(dartUrl);
    if (!res.ok) throw new Error('DART 서버 응답 오류');
    const data = await res.json();

    if (data.status !== '000') {
      throw new Error(data.message || `DART 오류 (status: ${data.status})`);
    }

    // 핵심 공시 여부 판별 키워드
    const KEY_KW = ['자기주식','유상증자','무상증자','분기보고서','반기보고서','사업보고서','공급계약','주요사항','합병','분할','전환사채','신주인수권'];

    const items = (data.list || []).map(item => {
      const isKey = KEY_KW.some(k => item.report_nm.includes(k));
      // 공시 유형 분류
      let typeLabel = '기타';
      if (item.report_nm.includes('자기주식'))          typeLabel = '자사주';
      else if (item.report_nm.includes('유상증자') || item.report_nm.includes('무상증자')) typeLabel = '증자';
      else if (item.report_nm.includes('보고서'))       typeLabel = '실적';
      else if (item.report_nm.includes('공급계약'))      typeLabel = '공급계약';
      else if (item.report_nm.includes('합병') || item.report_nm.includes('분할')) typeLabel = 'M&A';
      else if (item.report_nm.includes('전환사채') || item.report_nm.includes('신주인수권')) typeLabel = '사채·CB';
      else if (item.pblntf_ty === 'B')                  typeLabel = '주요사항';

      return {
        rcept_no:   item.rcept_no,
        corp_name:  item.corp_name,
        report_nm:  item.report_nm,
        rcept_dt:   item.rcept_dt,   // YYYYMMDD
        rcept_time: item.rm || '',
        typeLabel,
        isKey,
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
