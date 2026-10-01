interface Env {
  FILE_BUCKET: R2Bucket;
}

const EXPIRATION_MS = 48 * 60 * 60 * 1000; // 48 Hours

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.FILE_BUCKET) {
      return new Response(JSON.stringify({ files: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const objects = await context.env.FILE_BUCKET.list();
    const now = Date.now();
    const files = [];

    for (const obj of objects.objects) {
      const uploadedAt = obj.customMetadata?.uploadedAt || obj.uploaded.toISOString();
      const age = now - new Date(uploadedAt).getTime();

      // Automatically delete files older than 48 hours
      if (age >= EXPIRATION_MS) {
        await context.env.FILE_BUCKET.delete(obj.key);
      } else {
        files.push({
          id: obj.key,
          name: obj.customMetadata?.originalName || obj.key,
          size: obj.size,
          type: obj.httpMetadata?.contentType || 'application/octet-stream',
          uploadedAt,
          url: `/api/files/${obj.key}`,
        });
      }
    }

    return new Response(JSON.stringify({ files }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ files: [], error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
