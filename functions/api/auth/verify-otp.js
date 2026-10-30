// ============================================================
//  Cloudflare Pages Function: /api/auth/verify-otp
//  التحقق من كود الـ OTP وإصدار جلسة المستخدم
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json;charset=UTF-8',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ ok: false, error: 'رقم الهاتف والكود مطلوبان' }), { status: 400, headers: CORS });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const nowIso = new Date().toISOString();

    // البحث عن أحدث كود صالح وغير مستخدم
    const otpRecord = await env.DB.prepare(`
      SELECT * FROM otp_codes 
      WHERE phone = ? AND code = ? AND is_used = 0 AND expires_at > ?
      ORDER BY id DESC LIMIT 1
    `).bind(cleanPhone, code.trim(), nowIso).first();

    if (!otpRecord) {
      return new Response(JSON.stringify({ ok: false, error: 'كود التحقق غير صحيح أو منتهي الصلاحية' }), { status: 400, headers: CORS });
    }

    // تعليم الكود كمستخدم
    await env.DB.prepare(`UPDATE otp_codes SET is_used = 1 WHERE id = ?`).bind(otpRecord.id).run();

    // جلب بيانات المستخدم
    const user = await env.DB.prepare(`SELECT * FROM users WHERE phone = ?`).bind(cleanPhone).first();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'المستخدم غير موجود' }), { status: 404, headers: CORS });
    }

    // تحديث وقت آخر تسجيل دخول
    await env.DB.prepare(`UPDATE users SET last_login = ? WHERE id = ?`).bind(nowIso, user.id).run();

    // إعادة بيانات المستخدم والصلاحيات
    return new Response(JSON.stringify({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role, // admin, supervisor, inspector, observer
        department: user.department,
        last_login: nowIso
      }
    }), { headers: CORS });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}
