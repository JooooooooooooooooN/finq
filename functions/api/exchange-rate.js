const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export async function onRequest() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();

    const krw = data.rates.KRW;
    const jpy = data.rates.JPY;
    const cny = data.rates.CNY;
    const hkd = data.rates.HKD;

    return new Response(JSON.stringify({
      USD: Math.round(krw),
      JPY: Math.round(krw / jpy * 100) / 100,
      CNY: Math.round(krw / cny * 10) / 10,
      HKD: Math.round(krw / hkd * 10) / 10
    }), { headers: HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: HEADERS
    });
  }
}
