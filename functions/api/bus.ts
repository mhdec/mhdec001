interface Env {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Content-Type': 'application/json',
};

const ENCODED_BUS_KEY = 'YzY1NzUwYTEzNjkyNDFlNjAyMGY1NGFkNTY0Mzc4MGI3ZmEzMWNkYWYzMTVkZGEzMzI3MjMwMjJkODE0NWY1ZQ==';

function getBusServiceKey(): string {
  try {
    return atob(ENCODED_BUS_KEY);
  } catch {
    return 'c65750a1369241e6020f54ad5643780b7fa31cdaf315dda332723022d8145f5e';
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
  const stId = url.searchParams.get('stId') || '100000076';
  const serviceKey = getBusServiceKey();

  const targetUrl = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${serviceKey}&stId=${stId}&resultType=json`;

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
