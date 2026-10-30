// ============================================================
//  Cloudflare Pages Function
//  Route: GET /api/violations   →  جلب كل المخالفات
//  Route: POST /api/violations  →  إنشاء مخالفة جديدة
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

// ── GET /api/violations ──────────────────────────────────────
export async function onRequestGet({ env }) {
  try {
    const rows = await env.DB.prepare(`
      SELECT v.*,
             GROUP_CONCAT(d.file_key  || '|' || d.file_name, ';;') AS docs_raw
      FROM   violations v
      LEFT JOIN violation_docs d ON d.violation_id = v.id
      GROUP  BY v.id
      ORDER  BY v.created_at DESC
    `).all();

    const violations = rows.results.map(r => ({
      ...r,
      procedures: JSON.parse(r.procedures || '[]'),
      docs: r.docs_raw
        ? r.docs_raw.split(';;').map(s => {
            const [key, name] = s.split('|');
            return { key, name, url: `/api/files/${encodeURIComponent(key)}` };
          })
        : [],
    }));

    return new Response(JSON.stringify({ ok: true, violations }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}

// ── POST /api/violations ─────────────────────────────────────
// Body: multipart/form-data  (files + JSON fields)
export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();

    // ── 1. قراءة الحقول النصية
    const address    = form.get('address')    || '';
    const type       = form.get('type')       || '';
    const permit     = form.get('permit')     || 'no';
    const procedures = form.get('procedures') || '[]';
    const lat        = parseFloat(form.get('lat'))  || null;
    const lng        = parseFloat(form.get('lng'))  || null;

    // ── 2. رفع ملف الإجازة إلى R2 (إن وُجد)
    let permitFileKey  = null;
    let permitFileName = null;
    const permitFile = form.get('permitFile');
    if (permitFile && permitFile.size > 0) {
      permitFileName = permitFile.name;
      permitFileKey  = `permits/${Date.now()}_${sanitize(permitFile.name)}`;
      await env.FILES.put(permitFileKey, permitFile.stream(), {
        httpMetadata: { contentType: permitFile.type },
      });
    }

    // ── 3. إدراج السجل في D1
    const result = await env.DB.prepare(`
      INSERT INTO violations (address, type, permit, permit_file_key, permit_file_name,
                              procedures, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(address, type, permit, permitFileKey, permitFileName, procedures, lat, lng).run();

    const violationId = result.meta.last_row_id;

    // ── 4. رفع المستندات المرفقة إلى R2
    const docFiles = form.getAll('docs');
    let docsCount = 0;
    for (const file of docFiles) {
      if (!file || file.size === 0) continue;
      const key = `docs/${violationId}/${Date.now()}_${sanitize(file.name)}`;
      await env.FILES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      await env.DB.prepare(`
        INSERT INTO violation_docs (violation_id, file_key, file_name, file_type, file_size)
        VALUES (?, ?, ?, ?, ?)
      `).bind(violationId, key, file.name, file.type, file.size).run();
      docsCount++;
    }

    // ── 5. تحديث عدد المستندات
    await env.DB.prepare(`UPDATE violations SET docs_count = ? WHERE id = ?`)
               .bind(docsCount, violationId).run();

    return new Response(JSON.stringify({ ok: true, id: violationId }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}
