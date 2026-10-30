// ============================================================
//  Cloudflare Pages Function
//  Route: DELETE /api/violations/:id
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json;charset=UTF-8',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestDelete({ params, env }) {
  try {
    const id = parseInt(params.id);
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Invalid ID' }), { status: 400, headers: CORS });

    // جلب مفاتيح ملفات R2 قبل الحذف
    const violation = await env.DB.prepare(`SELECT permit_file_key FROM violations WHERE id = ?`).bind(id).first();
    const docs      = await env.DB.prepare(`SELECT file_key FROM violation_docs WHERE violation_id = ?`).bind(id).all();

    // حذف ملفات R2
    if (violation?.permit_file_key) await env.FILES.delete(violation.permit_file_key);
    for (const d of docs.results) await env.FILES.delete(d.file_key);

    // حذف السجل (CASCADE يحذف violation_docs تلقائياً)
    await env.DB.prepare(`DELETE FROM violations WHERE id = ?`).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}
