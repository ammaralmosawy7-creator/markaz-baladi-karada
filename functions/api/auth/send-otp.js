// ============================================================
//  Cloudflare Pages Function: /api/auth/send-otp
//  إرسال كود التحقق OTP عبر WhatsApp
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
    const { phone } = await request.json();
    if (!phone) {
      return new Response(JSON.stringify({ ok: false, error: 'رقم الهاتف مطلوب' }), { status: 400, headers: CORS });
    }

    // تنظيف رقم الهاتف
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // التحقق من وجود المستخدم وصلاحيته في D1
    const user = await env.DB.prepare(`SELECT * FROM users WHERE phone = ?`).bind(cleanPhone).first();
    if (!user) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'رقم الهاتف غير مسجل في النظام. يرجى مراجعة مسؤول إدارة المركز البلدي.' 
      }), { status: 403, headers: CORS });
    }

    if (user.is_active === 0) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'تم تعطيل هذا الحساب. يرجى مراجعة الإدارة.' 
      }), { status: 403, headers: CORS });
    }

    // توليد كود تحقق عشوائي من 6 أرقام
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // صالح لمدة 5 دقائق

    // حفظ الكود في قاعدة البيانات
    await env.DB.prepare(`
      INSERT INTO otp_codes (phone, code, expires_at)
      VALUES (?, ?, ?)
    `).bind(cleanPhone, otpCode, expiresAt).run();

    // إرسال الكود عبر WhatsApp API (مثلاً عبر UltraMsg أو WhatsApp Cloud API أو Twilio)
    // يدعم التخصيص عبر المتغيرات البيئية env.WHATSAPP_TOKEN
    let sendStatus = 'demo_mode';
    if (env.WHATSAPP_INSTANCE_ID && env.WHATSAPP_TOKEN) {
      try {
        const messageBody = `🏛️ *مركز بلدي الكرادة*\nرمز التحقق الخاص بك لتسجيل الدخول هو:\n*${otpCode}*\nصلاحية الرمز 5 دقائق فقط. لا تشارك الرمز مع أحد.`;
        
        // مثال: UltraMsg WhatsApp API
        await fetch(`https://api.ultramsg.com/${env.WHATSAPP_INSTANCE_ID}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: env.WHATSAPP_TOKEN,
            to: cleanPhone.startsWith('+') ? cleanPhone : (cleanPhone.startsWith('0') ? '964' + cleanPhone.slice(1) : cleanPhone),
            body: messageBody
          })
        });
        sendStatus = 'sent';
      } catch (err) {
        console.error('WhatsApp send error:', err);
      }
    }

    // في وضع التطوير المحلي أو إذا لم يتم تفعيل مزود واتساب بعد، نُرجع الكود أيضاً للمعاينة
    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'تم إرسال كود التحقق بنجاح عبر WhatsApp',
      demoCode: (!env.WHATSAPP_TOKEN) ? otpCode : undefined // يظهر الكود فقط إذا لم تكن مفاتيح الـ API مفعلة
    }), { headers: CORS });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
}
