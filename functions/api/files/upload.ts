interface Env {
  FILE_BUCKET: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const formData = await context.request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileName = (file.name || 'file').normalize('NFC');
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${fileName}`;
    const uploadedAt = new Date().toISOString();

    if (context.env.FILE_BUCKET) {
      await context.env.FILE_BUCKET.put(fileId, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: {
          originalName: fileName,
          uploadedAt,
          size: String(file.size),
        },
      });
    }

    return new Response(
      JSON.stringify({
        id: fileId,
        name: fileName,
        size: file.size,
        type: file.type,
        uploadedAt,
        url: `/api/files/${fileId}`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
