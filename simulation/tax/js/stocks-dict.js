/* 일본 / 중국 / 홍콩 인기 종목 사전 */

const STOCKS_JP = [
  { ticker: '7203.T',  name: '토요타' },
  { ticker: '6758.T',  name: '소니' },
  { ticker: '9984.T',  name: '소프트뱅크그룹' },
  { ticker: '6861.T',  name: '키엔스' },
  { ticker: '7974.T',  name: '닌텐도' },
  { ticker: '8035.T',  name: '도쿄일렉트론' },
  { ticker: '6367.T',  name: '다이킨' },
  { ticker: '4063.T',  name: '신에쓰화학' },
  { ticker: '6501.T',  name: '히타치' },
  { ticker: '6902.T',  name: '덴소' },
  { ticker: '7267.T',  name: '혼다' },
  { ticker: '6954.T',  name: '파낙' },
  { ticker: '8306.T',  name: '미쓰비시UFJ' },
  { ticker: '8316.T',  name: '스미토모미쓰이' },
  { ticker: '9432.T',  name: 'NTT' },
  { ticker: '9433.T',  name: 'KDDI' },
  { ticker: '9434.T',  name: '소프트뱅크(통신)' },
  { ticker: '4502.T',  name: '다케다제약' },
  { ticker: '4519.T',  name: '추가이제약' },
  { ticker: '6098.T',  name: '리크루트' },
  { ticker: '6594.T',  name: '니덱' },
  { ticker: '4661.T',  name: '오리엔탈랜드' },
  { ticker: '8058.T',  name: '미쓰비시상사' },
  { ticker: '8031.T',  name: '미쓰이물산' },
  { ticker: '9022.T',  name: 'JR동해' },
  { ticker: '4568.T',  name: '다이이치산쿄' },
  { ticker: '6762.T',  name: 'TDK' },
  { ticker: '6971.T',  name: '교세라' },
  { ticker: '7751.T',  name: '캐논' },
  { ticker: '4452.T',  name: '카오' }
];

const STOCKS_CN = [
  { ticker: '600519.SS', name: '구이저우마오타이(귀주모태주)' },
  { ticker: '000858.SZ', name: '우량예(오량액)' },
  { ticker: '300750.SZ', name: 'CATL(닝더스다이)' },
  { ticker: '002594.SZ', name: 'BYD' },
  { ticker: '601318.SS', name: '핑안보험' },
  { ticker: '600036.SS', name: '초상은행' },
  { ticker: '000333.SZ', name: '메이디' },
  { ticker: '601166.SS', name: '흥업은행' },
  { ticker: '600900.SS', name: '창장전력' },
  { ticker: '000651.SZ', name: '그리전기' },
  { ticker: '600276.SS', name: '헝루이의학' },
  { ticker: '601012.SS', name: '롱지녹색에너지' },
  { ticker: '002415.SZ', name: '하이크비전' },
  { ticker: '600030.SS', name: '중신증권' },
  { ticker: '601888.SS', name: '중국국제여행사' },
  { ticker: '000001.SZ', name: '핑안은행' },
  { ticker: '600000.SS', name: '푸동개발은행' },
  { ticker: '601398.SS', name: '공상은행' },
  { ticker: '601939.SS', name: '건설은행' },
  { ticker: '601288.SS', name: '농업은행' },
  { ticker: '601628.SS', name: '중국인수보험' },
  { ticker: '600104.SS', name: 'SAIC모터(상하이자동차)' },
  { ticker: '002714.SZ', name: '목원식품(목원수산)' },
  { ticker: '300059.SZ', name: '이스트머니(동방재부)' },
  { ticker: '002475.SZ', name: '럭스쉐어(립쉰정밀)' }
];

const STOCKS_HK = [
  { ticker: '0700.HK',  name: '텐센트' },
  { ticker: '9988.HK',  name: '알리바바' },
  { ticker: '1810.HK',  name: '샤오미' },
  { ticker: '3690.HK',  name: '메이퇀' },
  { ticker: '9618.HK',  name: 'JD닷컴' },
  { ticker: '0005.HK',  name: 'HSBC' },
  { ticker: '0941.HK',  name: '차이나모바일' },
  { ticker: '0388.HK',  name: '홍콩거래소(HKEx)' },
  { ticker: '1299.HK',  name: 'AIA그룹' },
  { ticker: '0883.HK',  name: 'CNOOC' },
  { ticker: '0016.HK',  name: '선홍카이부동산' },
  { ticker: '2318.HK',  name: '핑안보험' },
  { ticker: '1398.HK',  name: '공상은행(ICBC)' },
  { ticker: '0857.HK',  name: '페트로차이나' },
  { ticker: '0386.HK',  name: '시노펙' },
  { ticker: '2020.HK',  name: '안타스포츠' },
  { ticker: '0011.HK',  name: '항셍은행' },
  { ticker: '3988.HK',  name: '중국은행' },
  { ticker: '0002.HK',  name: 'CLP홀딩스' },
  { ticker: '0027.HK',  name: '갤럭시엔터테인먼트' },
  { ticker: '1177.HK',  name: '시노바이오팜' },
  { ticker: '0003.HK',  name: 'HK앤드차이나가스' },
  { ticker: '0012.HK',  name: '헨더슨랜드' },
  { ticker: '9999.HK',  name: '넷이즈' },
  { ticker: '0960.HK',  name: '룽후그룹' },
  { ticker: '1024.HK',  name: '쿠쇼우(쿠아이쇼우)' },
  { ticker: '0669.HK',  name: '창청자동차' },
  { ticker: '2382.HK',  name: '선전국제' },
  { ticker: '0175.HK',  name: '지리자동차' },
  { ticker: '1211.HK',  name: 'BYD(홍콩)' }
];

function searchStockDict(keyword, dict) {
  const val = keyword.toLowerCase();
  return dict.filter(s =>
    s.ticker.toLowerCase().includes(val) || s.name.includes(val)
  ).slice(0, 6);
}
