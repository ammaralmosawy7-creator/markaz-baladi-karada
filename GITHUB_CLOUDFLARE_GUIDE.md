# 🏛️ دليل نشر تطبيق مركز بلدي الكرادة (مجاني 100% على Cloudflare و D1 فقط)

تم تحديث التطبيق وإلغاء الحاجة لمستودع R2 تماماً؛ حيث يتم الآن تخزين كافة الصور والمستندات بترميز Base64 مباشرة داخل قاعدة بيانات **Cloudflare D1**، ليكون النشر مجانياً بالكامل 100% دون الحاجة إلى إضافة بطاقة ائتمان أو اشتراك مدفوع.

---

## 📌 الخطوة 1: رفع التحديثات إلى GitHub

1. افتح موجه الأوامر (PowerShell أو Terminal) داخل مجلد المشروع:
```powershell
cd "c:\مركز بلدي الكرادة"
git add .
git commit -m "إلغاء R2 والاعتماد بالكامل على Cloudflare D1 لتخزين الصور والملفات مجاناً"
git push -u origin main
```

---

## 📌 الخطوة 2: إعداد قاعدة البيانات D1 فقط (بدون R2)

1. سجل الدخول إلى **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. من القائمة الجانبية: **Storage & Databases** ⬅️ **D1 SQL Database**.
3. إذا لم تنشئ قاعدة البيانات بعد، اضغط **Create database**:
   - الاسم: `karada-violations`.
   - اضغط **Create**.
4. انسخ الـ **Database ID** والصقه في ملف [`wrangler.toml`](file:///c:/مركز%20بلدي%20الكرادة/wrangler.toml) مكان `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
5. داخل صفحة قاعدة البيانات في Cloudflare، افتح تبويب **Console**:
   - انسخ محتويات ملف [`schema.sql`](file:///c:/مركز%20بلدي%20الكرادة/schema.sql).
   - الصقها في حقل الأوامر واضغط **Execute** لإنشاء الجداول المحدثة.

---

## 📌 الخطوة 3: ربط Cloudflare Pages

1. من القائمة الجانبية: **Compute (Workers & Pages)** ⬅️ **Create application** ⬅️ تبويب **Pages** ⬅️ **Connect to Git**.
2. اختر مستودعك من GitHub: `markaz-baladi-karada`.
3. إعدادات البناء (Build settings):
   - **Framework preset:** اتركه `None`.
   - **Build command:** اتركه فارغاً.
   - **Build output directory:** اتركه `.` (أو فارغ).
4. اضغط **Save and Deploy**.

---

## 📌 الخطوة 4: ربط متغير قاعدة البيانات D1 فقط

1. ادخل إلى مشروعك في **Cloudflare Pages** ⬅️ **Settings** ⬅️ **Functions**.
2. انزل إلى قسم **D1 database bindings**:
   - اضغط **Add binding**.
   - **Variable name:** اكتب `DB` (بالأحرف الكبيرة).
   - **D1 database:** اختر `karada-violations`.
3. *(ملاحظة هامة: لا تحتاج إلى إضافة R2 bucket bindings نهائياً)*.
4. اذهب إلى تبويب **Deployments** واضغط **Retry deployment** أو **Create deployment** لأحدث نسخة.

---

🎉 أصبح تطبيقك الآن يعمل برابط سريع وسحابي مجاني بالكامل مع حفظ كافة بيانات المخالفات والصور والمستندات وصلاحيات المراقبين داخل قاعدة بيانات D1 مباشرة!
