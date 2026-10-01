interface Env {
  MEMO_KV: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.MEMO_KV) {
      return new Response(JSON.stringify({ memos: [] }), {
        headers: corsHeaders,
      });
    }

    const data = await context.env.MEMO_KV.get('shared_memos', 'json');
    return new Response(JSON.stringify({ memos: data || [] }), {
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ memos: [] }), {
      headers: corsHeaders,
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    if (context.env.MEMO_KV && body.memos) {
      await context.env.MEMO_KV.put('shared_memos', JSON.stringify(body.memos));
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
