interface Env {
  FILE_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    if (!context.env.FILE_BUCKET || !id) {
      return new Response('Not Found', { status: 404 });
    }

    const object = await context.env.FILE_BUCKET.get(id);
    if (!object) {
      return new Response('File Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set(
      'Content-Disposition',
      `attachment; filename="${object.customMetadata?.originalName || id}"`
    );

    return new Response(object.body, { headers });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    if (context.env.FILE_BUCKET && id) {
      await context.env.FILE_BUCKET.delete(id);
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
