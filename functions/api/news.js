const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const SOURCES = [
  { rss: 'https://www.yna.co.kr/rss/stock.xml',         source: '연합뉴스' },
  { rss: 'https://www.hankyung.com/feed/finance',        source: '한국경제' },
  { rss: 'https://biz.chosun.com/rss/stock.xml',         source: '조선비즈' },
  { rss: 'https://rss.mt.co.kr/mt_stock.xml',            source: '머니투데이' },
];

const RSS2JSON = 'https://api.rss2json.com/v1/api.json';

export async function onRequest(context) {
  const { request: req } = context;
  const url   = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const id    = url.searchParams.get('id');

  // 캐시 30분
  const cacheKey = new Request(new URL('/api/news-cache-v4', url.origin).toString());
  const cache = caches.default;
  let items = [];

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      items = await cached.json();
    } else {
      items = await fetchAllNews();
      if (items.length > 0) {
        context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(items), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=1800' }
        })));
      }
    }
  } catch {
    items = await fetchAllNews().catch(() => []);
  }

  if (id) {
    const item = items.find(i => i.id === id);
    if (!item) return new Response(JSON.stringify({ error: '기사를 찾을 수 없습니다' }), { status: 404, headers: HEADERS });
    return new Response(JSON.stringify(item), { headers: HEADERS });
  }

  return new Response(JSON.stringify({ items: items.slice(0, limit) }), { headers: HEADERS });
}

async function fetchAllNews() {
  const results = await Promise.allSettled(SOURCES.map(s => fetchSource(s)));
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // 중복 제거 (같은 링크)
  const seen = new Set();
  const unique = all.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  // 날짜 내림차순
  unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return unique;
}

async function fetchSource({ rss, source }) {
  const apiUrl = `${RSS2JSON}?rss_url=${encodeURIComponent(rss)}&count=20`;
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!res.ok) return [];

  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) return [];

  return data.items
    .filter(i => i.title && i.link)
    .map(i => {
      const { date, timestamp } = parseDate(i.pubDate);
      const id = encodeURIComponent(i.link.trim());
      return {
        id,
        title:   stripHtml(i.title),
        summary: stripHtml(i.description || i.content || '').slice(0, 300),
        url:     i.link.trim(),
        date,
        timestamp,
        source
      };
    });
}

function stripHtml(text) {
  if (!text) return '';
  return text
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
    return {
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      timestamp: d.getTime()
    };
  } catch { return { date: '', timestamp: 0 }; }
}
