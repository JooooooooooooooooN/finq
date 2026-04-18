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

  // 거래소공시 키워드 (I타입 — 신규상장·수요예측 등 IPO 전용)
  const EXCHANGE_KW = ['신규상장', '상장예비심사', '수요예측', '공모가격', '청약일정'];

  async function dartFetch(type) {
    try {
      const res = await fetch(
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${apiKey}&pblntf_ty=${type}${base}`,
        { headers: hdrs }
      );
      if (!res.ok) return [];
      const text = await res.text();
      if (text.trim().startsWith('<')) return [];
      const data = JSON.parse(text);
      if (data.status !== '000') return [];
      return data.list || [];
    } catch { return []; }
  }

  try {
    // 거래소공시(I: 신규상장) + 발행공시(C: 증권신고서·투자설명서) 병렬 조회
    const [listI, listC] = await Promise.all([dartFetch('I'), dartFetch('C')]);

    const seen = new Set();
    const items = [...listI, ...listC]
      .filter(item => {
        if (seen.has(item.rcept_no)) return false;
        seen.add(item.rcept_no);
        const nm = item.report_nm;
        // 거래소공시(I): 신규상장·수요예측 등 IPO 전용
        if (EXCHANGE_KW.some(k => nm.includes(k))) return true;
        // 발행공시(C): 지분증권 일반공모 증권신고서만 (유상증자·투자설명서 제외)
        return nm.includes('증권신고서') && nm.includes('지분증권')
          && !nm.includes('주주배정') && !nm.includes('제3자배정');
      })
      .map(item => {
        const nm = item.report_nm;
        let typeLabel = '기타';
        let typeClass = 'type-other';
        if      (nm.includes('신규상장'))     { typeLabel = '신규상장';  typeClass = 'type-listing'; }
        else if (nm.includes('상장예비심사')) { typeLabel = '심사결과';  typeClass = 'type-review';  }
        else if (nm.includes('수요예측'))     { typeLabel = '수요예측';  typeClass = 'type-book';    }
        else if (nm.includes('공모가격'))     { typeLabel = '공모가확정'; typeClass = 'type-price';  }
        else if (nm.includes('청약일정'))     { typeLabel = '청약일정';  typeClass = 'type-sub';    }
        else if (nm.includes('투자설명서'))   { typeLabel = '투자설명서'; typeClass = 'type-pros';  }
        else if (nm.includes('증권신고서'))   { typeLabel = '증권신고';  typeClass = 'type-reg';    }

        const market = nm.includes('코스피') ? 'KOSPI'
                     : nm.includes('코스닥') ? 'KOSDAQ'
                     : item.corp_cls === 'Y' ? 'KOSPI'
                     : item.corp_cls === 'K' ? 'KOSDAQ'
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
      updatedAt: new Date().toISOString(),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
