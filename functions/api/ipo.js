export async function onRequest(context) {
  const { env } = context;
  const apiKey = env.DART_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DART API 키가 설정되지 않았습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const fmt  = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const end  = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);

  const base = `&bgn_de=${fmt(start)}&end_de=${fmt(end)}&page_no=1&page_count=100&sort=date&sort_mth=desc`;
  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://opendart.fss.or.kr/',
  };

  // 실패 원인을 삼키지 않고 diag에 기록한다 (0건일 때 원인 추적용)
  const diag = {};
  async function dartFetch(type) {
    try {
      const res = await fetch(
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${apiKey}&pblntf_detail_ty=${type}${base}`,
        { headers: hdrs }
      );
      if (!res.ok) { diag[type] = { http: res.status }; return []; }
      const text = await res.text();
      if (text.trim().startsWith('<')) { diag[type] = { http: res.status, note: 'HTML 응답(키/차단 의심)' }; return []; }
      const data = JSON.parse(text);
      if (data.status !== '000') {
        diag[type] = { http: res.status, status: data.status, message: data.message || '' };
        return [];
      }
      const list = data.list || [];
      diag[type] = { http: res.status, status: data.status, raw: list.length, total: data.total_count ?? null };
      return list;
    } catch (e) {
      diag[type] = { error: String(e && e.message || e) };
      return [];
    }
  }

  try {
    // 거래소공시(I: 신규상장) + 발행공시(C: 증권신고서·투자설명서) 병렬 조회
    // C001 = 증권신고(지분증권). 공모·증자 관련 공시가 여기 모인다.
    // 대분류 I(거래소공시)는 수시공시가 대부분이라 최신 100건에 IPO가 걸리지 않아 제외.
    const list = await dartFetch('C001');

    const seen = new Set();
    const items = list
      .filter(item => {
        if (seen.has(item.rcept_no)) return false;
        seen.add(item.rcept_no);
        const nm = item.report_nm || '';
        // 철회분과 단순 정정분은 제외 ([발행조건확정]은 공모가 확정이라 유지)
        if (nm.includes('철회')) return false;
        if (nm.includes('[기재정정]') || nm.includes('[첨부정정]') || nm.includes('[정정]')) return false;
        // 지분증권 공모 관련 서류만
        return nm.includes('증권신고서(지분증권)')
          || nm.includes('투자설명서')
          || nm.includes('소액공모공시서류(지분증권)');
      })
      .map(item => {
        const nm = item.report_nm;
        let typeLabel = '기타';
        let typeClass = 'type-other';
        if      (nm.includes('발행조건확정')) { typeLabel = '발행조건확정'; typeClass = 'type-price'; }
        else if (nm.includes('투자설명서'))   { typeLabel = '투자설명서';   typeClass = 'type-pros';  }
        else if (nm.includes('소액공모'))     { typeLabel = '소액공모';     typeClass = 'type-book';  }
        else if (nm.includes('증권신고서'))   { typeLabel = '증권신고';     typeClass = 'type-reg';   }

        const market = item.corp_cls === 'Y' ? 'KOSPI'
                     : item.corp_cls === 'K' ? 'KOSDAQ'
                     : item.corp_cls === 'N' ? 'KONEX'
                     : item.corp_cls === 'E' ? '비상장'
                     : '';

        const dt = item.rcept_dt; // YYYYMMDD
        const dateStr = dt ? `${dt.slice(0,4)}.${dt.slice(4,6)}.${dt.slice(6,8)}` : '';

        return {
          rcept_no:  item.rcept_no,
          corp_name: item.corp_name,
          report_nm: nm,
          rcept_dt:  item.rcept_dt,
          dateStr,
          typeLabel,
          typeClass,
          market,
          url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
        };
      })
      .sort((a, b) => b.rcept_dt.localeCompare(a.rcept_dt))
      .slice(0, 60);

    const counts = items.reduce((acc, it) => {
      acc[it.typeLabel] = (acc[it.typeLabel] || 0) + 1;
      return acc;
    }, {});

    return new Response(JSON.stringify({
      total: items.length,
      counts,
      items,
      diag: { ...diag, range: [fmt(start), fmt(end)] },
      updatedAt: new Date().toISOString(),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
