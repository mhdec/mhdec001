interface Env {
  MEMO_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.MEMO_KV) {
      return new Response(JSON.stringify({ memos: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await context.env.MEMO_KV.get('shared_memos', 'json');
    return new Response(JSON.stringify({ memos: data || [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ memos: [] }), {
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
