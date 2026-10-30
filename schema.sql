-- =====================================================
--  Cloudflare D1  –  مخطط قاعدة البيانات
--  حفظ البيانات والصور والمستندات بنسبة 100% داخل D1 دون الحاجة إلى R2
-- =====================================================

CREATE TABLE IF NOT EXISTS violations (
  id                INTEGER  PRIMARY KEY AUTOINCREMENT,
  address           TEXT     NOT NULL,
  type              TEXT     NOT NULL,
  permit            TEXT     NOT NULL CHECK (permit IN ('yes','no')),
  permit_file_name  TEXT,                    -- اسم ملف الإجازة الأصلي
  permit_file_type  TEXT,                    -- MIME type (image/png, application/pdf, ...)
  permit_file_data  TEXT,                    -- محتوى الملف بصيغة Base64 Data URL
  procedures        TEXT     DEFAULT '[]',   -- JSON array: ["رصد","غرامة","إنذار"]
  docs_count        INTEGER  DEFAULT 0,
  lat               REAL,
  lng               REAL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS violation_docs (
  id              INTEGER  PRIMARY KEY AUTOINCREMENT,
  violation_id    INTEGER  NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  file_name       TEXT     NOT NULL,   -- اسم الملف الأصلي
  file_type       TEXT,                -- MIME type
  file_size       INTEGER,             -- حجم الملف بالبايت
  file_data       TEXT     NOT NULL,   -- محتوى الملف بصيغة Base64 Data URL
  uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_violation ON violation_docs(violation_id);

-- =====================================================
--  جداول إدارة المستخدمين، الصلاحيات، والتحقق عبر واتساب (OTP)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER  PRIMARY KEY AUTOINCREMENT,
  name            TEXT     NOT NULL,
  phone           TEXT     NOT NULL UNIQUE,    -- رقم الهاتف
  role            TEXT     NOT NULL DEFAULT 'observer' CHECK (role IN ('admin', 'supervisor', 'inspector', 'observer')), 
  department      TEXT     DEFAULT 'all',      -- 'all', 'violations', 'cleaning'
  is_active       INTEGER  DEFAULT 1,          -- 1 مفعل, 0 معطل
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login      DATETIME
);

-- جدول رموز التحقق OTP
CREATE TABLE IF NOT EXISTS otp_codes (
  id              INTEGER  PRIMARY KEY AUTOINCREMENT,
  phone           TEXT     NOT NULL,
  code            TEXT     NOT NULL,
  expires_at      DATETIME NOT NULL,
  is_used         INTEGER  DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- مستخدم مدير افتراضي للاختبار
INSERT OR IGNORE INTO users (name, phone, role, department)
VALUES ('مدير النظام', '07700000000', 'admin', 'all');
