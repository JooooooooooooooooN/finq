const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const RSS_SOURCES = [
  { url: 'https://news.google.com/rss/search?q=증권+금융+주식&hl=ko&gl=KR&ceid=KR:ko', source: 'auto' },
];

export async function onRequest(context) {
  const { request: req } = context;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const id = url.searchParams.get('id');

  // 캐시 확인 (30분 TTL)
  const cacheKey = new Request(new URL('/api/news-cache-v1', url.origin).toString());
  const cache = caches.default;
  let items;

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      items = await cached.json();
    } else {
      items = await fetchAllNews();

      // 캐시 저장
      const cacheRes = new Response(JSON.stringify(items), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=1800' }
      });
      context.waitUntil(cache.put(cacheKey, cacheRes));
    }
  } catch {
    // 캐시 API 실패 시 직접 fetch
    try {
      items = await fetchAllNews();
    } catch {
      return new Response(JSON.stringify({ error: '뉴스를 불러오지 못했습니다', items: [] }), {
        status: 502, headers: HEADERS
      });
    }
  }

  if (id) {
    const item = items.find(i => i.id === id);
    if (!item) {
      return new Response(JSON.stringify({ error: '기사를 찾을 수 없습니다' }), {
        status: 404, headers: HEADERS
      });
    }
    return new Response(JSON.stringify(item), { headers: HEADERS });
  }

  return new Response(JSON.stringify({ items: items.slice(0, limit) }), { headers: HEADERS });
}

async function fetchAllNews() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(s => fetchRSS(s.url, s.source))
  );

  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // 날짜 내림차순 정렬
  all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return all;
}

async function fetchRSS(rssUrl, source) {
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinQ/1.0)' },
    cf: { cacheTtl: 1800 }
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRSS(xml, source);
}

function parseRSS(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const rawTitle = extractTag(block, 'title');
    const link     = extractLink(block);
    const desc     = extractTag(block, 'description');
    const pub      = extractTag(block, 'pubDate');
    const srcTag   = extractTag(block, 'source'); // 구글 뉴스: <source>매체명</source>

    if (!rawTitle || !link) continue;

    const { date, timestamp } = parseDate(pub);
    const id = encodeURIComponent(link.trim());

    // 구글 뉴스 제목 끝에 " - 매체명" 붙는 경우 제거
    const mediaName = srcTag ? cleanText(srcTag) : source;
    const title = cleanText(rawTitle).replace(new RegExp(`\\s*-\\s*${mediaName}\\s*$`), '');

    items.push({
      id,
      title,
      summary:   cleanText(desc).slice(0, 300),
      url:       link.trim(),
      date,
      timestamp,
      source:    mediaName
    });
  }

  return items;
}

// CDATA 포함 태그 추출
function extractTag(xml, tag) {
  // CDATA
  const cd = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cd) return cd[1].trim();
  // 일반
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (plain) return plain[1].trim();
  return '';
}

// <link> 태그는 셀프클로징 없이 텍스트로 들어오는 경우와 href 속성 두 가지 처리
function extractLink(xml) {
  // <link>https://...</link>
  const m1 = xml.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (m1) return m1[1].trim();
  // <link href="..."/>
  const m2 = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (m2) return m2[1].trim();
  // <guid>
  const m3 = xml.match(/<guid[^>]*>([^<]+)<\/guid>/i);
  if (m3 && m3[1].startsWith('http')) return m3[1].trim();
  return '';
}

function cleanText(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function parseDate(pubDate) {
  if (!pubDate) return { date: '', timestamp: 0 };
  try {
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return { date: '', timestamp: 0 };
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { date, timestamp: d.getTime() };
  } catch {
    return { date: '', timestamp: 0 };
  }
}
