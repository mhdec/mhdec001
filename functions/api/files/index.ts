interface Env {
  FILE_BUCKET: R2Bucket;
  MEMO_KV: KVNamespace;
}

const EXPIRATION_MS = 48 * 60 * 60 * 1000; // 48 Hours

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    let cards: any[] = [];

    // Try reading from KV first
    if (context.env.MEMO_KV) {
      const data = await context.env.MEMO_KV.get('shared_file_cards', 'json');
      if (Array.isArray(data)) {
        cards = data;
      }
    }

    const now = Date.now();
    // Filter & cleanup 48h expired cards
    const validCards = cards.filter((card) => {
      const age = now - new Date(card.uploadedAt).getTime();
      return age < EXPIRATION_MS;
    });

    // Save cleaned cards back if any expired were removed
    if (context.env.MEMO_KV && validCards.length !== cards.length) {
      await context.env.MEMO_KV.put('shared_file_cards', JSON.stringify(validCards));
    }

    return new Response(JSON.stringify({ cards: validCards }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ cards: [], error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const cards = body.cards || [];

    const now = Date.now();
    const validCards = cards.filter((card: any) => {
      const age = now - new Date(card.uploadedAt).getTime();
      return age < EXPIRATION_MS;
    });

    if (context.env.MEMO_KV) {
      await context.env.MEMO_KV.put('shared_file_cards', JSON.stringify(validCards));
    }

    return new Response(JSON.stringify({ success: true, cards: validCards }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
