# 🏛️ دليل ربط تطبيق مركز بلدي الكرادة مع GitHub و Cloudflare

هذا الدليل يوضح لك الخطوات خطوة بخطوة لرفع المشروع على حسابك في **GitHub** وربطه مع استضافة **Cloudflare Pages** وقاعدة بيانات **D1** ومستودع الصور **R2**.

---

## 📌 الخطوة 1: رفع المشروع إلى GitHub

لقد قمت بتهيئة مستودع Git محلياً وتجهيز فرع `main`. الآن:

1. افتح موقع **[GitHub.com](https://github.com)** وسجل الدخول بحسابك.
2. اضغط على علامة **`+`** بالأعلى ثم اختر **`New repository`**.
3. اكتب اسم المستودع: `markaz-baladi-karada` (اجعله Public أو Private كما تفضل).
4. **لا** تضع علامة صح على README أو .gitignore (لأننا جهزناها مسبقاً).
5. اضغط على **`Create repository`**.
6. انسخ الرابط الذي سيظهر لك (مثال: `https://github.com/USERNAME/markaz-baladi-karada.git`).
7. افتح موجه الأوامر (PowerShell أو Terminal) داخل مجلد المشروع ونفذ الأمرين التاليين (مع استبدال الرابط برابط مستودعك):

```powershell
git remote add origin https://github.com/USERNAME/markaz-baladi-karada.git
git push -u origin main
```

*(سيطلب منك GitHub إدخال اسم المستخدم و Personal Access Token أو تسجيل الدخول من المتصفح).*

---

## 📌 الخطوة 2: إنشاء قاعدة البيانات D1 ومستودع R2 في Cloudflare

سجل دخولك إلى لوحة تحكم **[Cloudflare Dashboard](https://dash.cloudflare.com/)**:

### أ) إنشاء قاعدة بيانات Cloudflare D1 (لحفظ المخالفات والمستخدمين):
1. من القائمة الجانبية، اذهب إلى **Storage & Databases** ثم **D1 SQL Database**.
2. اضغط على **Create database**.
3. سمّها: `karada-violations` واضغط **Create**.
4. انسخ الـ **Database ID** الخاص بها، والصقه في ملف [`wrangler.toml`](file:///c:/مركز%20بلدي%20الكرادة/wrangler.toml) مكان `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
5. داخل صفحة قاعدة البيانات في Cloudflare، اضغط على تبويب **Console** ثم انسخ محتويات ملف [`schema.sql`](file:///c:/مركز%20بلدي%20الكرادة/schema.sql) والصقها واضغط **Execute** لإنشاء الجداول.

### ب) إنشاء مستودع Cloudflare R2 (لحفظ الصور والمستندات):
1. من القائمة الجانبية، اضغط على **R2 Object Storage**.
2. اضغط على **Create bucket**.
3. سمّها: `karada-files` واضغط **Create bucket**.

---

## 📌 الخطوة 3: ربط Cloudflare Pages مع GitHub (النشر التلقائي)

1. في Cloudflare، اذهب إلى **Compute (Workers & Pages)** ⬅️ **Create application**.
2. اختر تبويب **Pages** ثم اضغط **Connect to Git**.
3. اختر حسابك في GitHub، وحدد المستودع: `markaz-baladi-karada`.
4. في إعدادات البناء (Build settings):
   - **Framework preset:** اتركه `None`.
   - **Build command:** اتركه فارغاً.
   - **Build output directory:** اتركه `.` (نقطة، أو فارغ).
5. اضغط على **Save and Deploy**.

---

## 📌 الخطوة 4: ربط المتغيرات (Bindings) في Cloudflare Pages

حتى يستطيع السيرفر (Functions) الوصول لقاعدة البيانات والصور:

1. ادخل إلى مشروعك في **Cloudflare Pages** ⬅️ **Settings** ⬅️ **Functions**.
2. انزل إلى **D1 database bindings**:
   - اضغط **Add binding**.
   - **Variable name:** اكتب `DB` (بالأحرف الكبيرة).
   - **D1 database:** اختر `karada-violations`.
3. انزل إلى **R2 bucket bindings**:
   - اضغط **Add binding**.
   - **Variable name:** اكتب `FILES` (بالأحرف الكبيرة).
   - **R2 bucket:** اختر `karada-files`.
4. (اختياري لواتساب): في **Environment variables** أضف:
   - `WHATSAPP_INSTANCE_ID`
   - `WHATSAPP_TOKEN`
5. اضغط على **Save** ثم قم بعمل **Redeploy** لأحدث نشر.

---

🎉 **مبروك!** أصبح تطبيقك الآن يعمل برابط رسمي مجاني عالمي وسريع (مثل: `https://markaz-baladi-karada.pages.dev`) مع اتصال دائم وحفظ مباشر للصور في R2 والبيانات في D1، وأي تعديل مستقبلي ترفعه على GitHub سيتم تحديثه في الموقع تلقائياً في ثوانٍ معدودة.
