interface Env {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Content-Type': 'application/json',
};

const ENCODED_SUBWAY_KEY = 'Njc1ODUzNjU3MTZjNjI2NTM2MzU3MTRlNmM3NjUy';

function getSubwayServiceKey(): string {
  try {
    return atob(ENCODED_SUBWAY_KEY);
  } catch {
    return '67585365716c62653635714e6c7652';
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const stationName = encodeURIComponent(url.searchParams.get('station') || '안국');
  const serviceKey = getSubwayServiceKey();

  const targetUrl = `http://swopenapi.seoul.go.kr/api/subway/${serviceKey}/json/realtimeStationArrival/1/10/${stationName}`;

  try {
    const res = await fetch(targetUrl);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
