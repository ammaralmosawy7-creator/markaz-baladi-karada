// ============================================================
//  Cloudflare Pages Function: /api/users
//  إدارة المستخدمين والصلاحيات (للمدير Admin فقط)
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json;charset=UTF-8',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── GET: قائمة المستخدمين ────────────────────────────────────
export async function onRequestGet({ env }) {
  try {
    const list = await env.DB.prepare(`
      SELECT id, name, phone, role, department, is_active, created_at, last_login 
      FROM users 
      ORDER BY id DESC
    `).all();

    return new Response(JSON.stringify({ ok: true, users: list.results }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}

// ── POST: إضافة مستخدم جديد وتحديد صلاحيته ────────────────────
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name, phone, role, department } = body;

    if (!name || !phone) {
      return new Response(JSON.stringify({ ok: false, error: 'الاسم ورقم الهاتف مطلوبان' }), { status: 400, headers: CORS });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const userRole = role || 'observer';
    const userDept = department || 'all';

    await env.DB.prepare(`
      INSERT INTO users (name, phone, role, department)
      VALUES (?, ?, ?, ?)
    `).bind(name.trim(), cleanPhone, userRole, userDept).run();

    return new Response(JSON.stringify({ ok: true, message: 'تمت إضافة المستخدم بنجاح' }), { headers: CORS });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return new Response(JSON.stringify({ ok: false, error: 'رقم الهاتف مسجل مسبقاً لمستخدم آخر' }), { status: 400, headers: CORS });
    }
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}

// ── DELETE: حذف مستخدم أو تعطيله ─────────────────────────────
export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'معرف المستخدم مطلوب' }), { status: 400, headers: CORS });
    }

    await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
    return new Response(JSON.stringify({ ok: true, message: 'تم حذف المستخدم بنجاح' }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}
