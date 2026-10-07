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
  const arsId = url.searchParams.get('arsId');
  const stId = url.searchParams.get('stId');
  const serviceKey = getBusServiceKey();

  let targetUrl: string;
  if (arsId) {
    targetUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${serviceKey}&arsId=${arsId}&resultType=json`;
  } else {
    const targetArsId = stId === '100000076' ? '01172' : stId === '100000103' ? '01199' : null;
    if (targetArsId) {
      targetUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${serviceKey}&arsId=${targetArsId}&resultType=json`;
    } else {
      targetUrl = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${serviceKey}&stId=${stId || '100000076'}&resultType=json`;
    }
  }

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
