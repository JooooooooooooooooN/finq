const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const SOURCES = [
  { url: 'https://www.yna.co.kr/rss/economy.xml',    source: '연합뉴스' }, // ✅
  { url: 'https://www.mk.co.kr/rss/50200011/',       source: '매일경제' }, // ✅ 증권
  { url: 'https://www.hankyung.com/feed/finance',    source: '한국경제' }, // ✅
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export async function onRequest(context) {
  const { request: req } = context;
  const url   = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const id    = url.searchParams.get('id');
  const debug = url.searchParams.get('debug') === '1';

  // debug=1 이면 캐시 건너뜀
  const cacheKey = new Request(new URL('/api/news-cache-v8', url.origin).toString());
  const cache = caches.default;
  let items = [];

  if (!debug) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        items = await cached.json();
        return new Response(JSON.stringify({ items: items.slice(0, limit) }), { headers: HEADERS });
      }
    } catch {}
  }

  if (debug) {
    const dbg = await Promise.all(SOURCES.map(s => debugFetch(s)));
    return new Response(JSON.stringify({ _debug: dbg }), { headers: HEADERS });
  }

  items = await fetchAllNews();

  if (items.length > 0) {
    context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=1800' }
    })));
  }

  if (id) {
    const item = items.find(i => i.id === id);
    if (!item) return new Response(JSON.stringify({ error: '기사를 찾을 수 없습니다' }), { status: 404, headers: HEADERS });
    return new Response(JSON.stringify(item), { headers: HEADERS });
  }

  return new Response(JSON.stringify({ items: items.slice(0, limit) }), { headers: HEADERS });
}

async function debugFetch({ url, source }) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const text = await res.text();
    const itemCount = (text.match(/<item/g) || []).length;
    const parsed = parseRSS(text, source).length;
    // 첫 번째 <item> 블록 추출해서 구조 확인
    const firstItem = (text.match(/<item[\s>]([\s\S]*?)<\/item>/) || [])[1] || '';
    return { source, url, status: res.status, ok: res.ok, itemCount, parsed, firstItem: firstItem.slice(0, 400) };
  } catch (e) {
    return { source, url, error: e.message };
  }
}

async function fetchAllNews() {
  const results = await Promise.allSettled(SOURCES.map(s => fetchRSS(s)));
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  const seen = new Set();
  const unique = all.filter(i => { if (seen.has(i.url)) return false; seen.add(i.url); return true; });
  unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return unique;
}

async function fetchRSS({ url, source }) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRSS(xml, source);
}

function parseRSS(xml, source) {
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = getTag(b, 'title');
    const link  = getLink(b);
    const desc  = getTag(b, 'description');
    const pub   = getTag(b, 'pubDate');
    if (!title || !link) continue;
    const { date, timestamp } = parseDate(pub);
    items.push({
      id:        encodeURIComponent(link),
      title:     clean(title),
      summary:   clean(desc).slice(0, 300),
      url:       link,
      date, timestamp, source
    });
  }
  return items;
}

function getTag(xml, tag) {
  const cd = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'));
  if (cd) return cd[1].trim();
  const pl = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (pl) return pl[1].trim();
  return '';
}

function getLink(xml) {
  // CDATA: <link><![CDATA[URL]]></link>
  const cd = xml.match(/<link[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i);
  if (cd) return cd[1].trim();
  // 일반: <link>URL</link>
  const m1 = xml.match(/<link[^>]*>\s*([^<\s][^<]*?)\s*<\/link>/i);
  if (m1) return m1[1].trim();
  // href 속성: <link href="URL"/>
  const m2 = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (m2) return m2[1].trim();
  // guid 폴백
  const m3 = xml.match(/<guid[^>]*>\s*(https?[^<]+?)\s*<\/guid>/i);
  if (m3) return m3[1].trim();
  return '';
}

function clean(t) {
  return (t || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ').trim();
}

function parseDate(s) {
  if (!s) return { date: '', timestamp: 0 };
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return { date: '', timestamp: 0 };
    return { date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, timestamp: d.getTime() };
  } catch { return { date: '', timestamp: 0 }; }
}
