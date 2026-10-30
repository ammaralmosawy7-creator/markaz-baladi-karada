// ============================================================
//  Cloudflare Pages Function
//  Route: GET /api/files/:key  →  تحميل ملف من R2
// ============================================================

export async function onRequestGet({ params, env }) {
  try {
    const key = decodeURIComponent(params.key);
    const obj = await env.FILES.get(key);

    if (!obj) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(obj.body, { headers });
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
