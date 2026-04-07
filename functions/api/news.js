const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const RSS_URL = 'https://news.google.com/rss/search?q=%EC%A6%9D%EA%B6%8C+%EA%B8%88%EC%9C%B5+%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

export async function onRequest(context) {
  const { request: req } = context;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const id    = url.searchParams.get('id');
  const debug = url.searchParams.get('debug') === '1';

  // 캐시 (30분)
  const cacheKey = new Request(new URL('/api/news-cache-v3', url.origin).toString());
  const cache = caches.default;
  let items = [];
  let debugInfo = {};

  try {
    const cached = await cache.match(cacheKey);
    if (cached && !debug) {
      items = await cached.json();
    } else {
      const result = await fetchNews(debug);
      items = result.items;
      debugInfo = result.debug || {};

      if (items.length > 0) {
        const cacheRes = new Response(JSON.stringify(items), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=1800' }
        });
        context.waitUntil(cache.put(cacheKey, cacheRes));
      }
    }
  } catch (e) {
    debugInfo.cacheError = e.message;
    try {
      const result = await fetchNews(debug);
      items = result.items;
      Object.assign(debugInfo, result.debug || {});
    } catch (e2) {
      debugInfo.fetchError = e2.message;
    }
  }

  if (id) {
    const item = items.find(i => i.id === id);
    if (!item) return new Response(JSON.stringify({ error: '기사를 찾을 수 없습니다' }), { status: 404, headers: HEADERS });
    return new Response(JSON.stringify(item), { headers: HEADERS });
  }

  const body = { items: items.slice(0, limit) };
  if (debug) body._debug = debugInfo;

  return new Response(JSON.stringify(body), { headers: HEADERS });
}

async function fetchNews(debug = false) {
  const info = { url: RSS_URL };

  let res;
  try {
    res = await fetch(RSS_URL, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
    });
    info.status = res.status;
    info.ok = res.ok;
  } catch (e) {
    info.fetchException = e.message;
    return { items: [], debug: info };
  }

  if (!res.ok) {
    info.error = `HTTP ${res.status}`;
    return { items: [], debug: info };
  }

  let xml;
  try {
    xml = await res.text();
    info.xmlLength = xml.length;
    info.xmlPreview = xml.slice(0, 200);
  } catch (e) {
    info.textError = e.message;
    return { items: [], debug: info };
  }

  const items = parseRSS(xml);
  info.parsed = items.length;

  return { items, debug: info };
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const rawTitle = extractTag(block, 'title');
    const link     = extractLink(block);
    const desc     = extractTag(block, 'description');
    const pub      = extractTag(block, 'pubDate');
    const srcTag   = extractTag(block, 'source');

    if (!rawTitle || !link) continue;

    const { date, timestamp } = parseDate(pub);
    const id = encodeURIComponent(link.trim());
    const mediaName = srcTag ? cleanText(srcTag) : '뉴스';
    const title = cleanText(rawTitle).replace(new RegExp(`\\s*[-–]\\s*${escapeRegex(mediaName)}\\s*$`), '');

    items.push({ id, title, summary: cleanText(desc).slice(0, 300), url: link.trim(), date, timestamp, source: mediaName });
  }

  return items;
}

function extractTag(xml, tag) {
  const cd = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cd) return cd[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (plain) return plain[1].trim();
  return '';
}

function extractLink(xml) {
  const m1 = xml.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (m1) return m1[1].trim();
  const m2 = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (m2) return m2[1].trim();
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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
