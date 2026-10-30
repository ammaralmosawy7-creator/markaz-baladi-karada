/* ==============================
   THEME TOGGLE
============================== */
let isDark = false;

function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  document.getElementById('themeIcon').textContent  = isDark ? '☀️' : '🌙';
  document.getElementById('themeLabel').textContent = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
}

/* ==============================
   PAGE NAVIGATION
============================== */
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (page === 'main')       document.getElementById('mainPage').classList.add('active');
  if (page === 'violations') document.getElementById('violationsPage').classList.add('active');
  if (page === 'cleaning')   document.getElementById('cleaningPage').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==============================
   PERMIT TOGGLE
============================== */
function togglePermit(show) {
  document.getElementById('permitUpload').classList.toggle('hidden', !show);
  if (!show) document.getElementById('permitFile').value = '';
}

/* ==============================
   FILE NAME DISPLAY
============================== */
function showFileName(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (input.files && input.files.length > 0)
    label.textContent = input.files.length === 1
      ? input.files[0].name
      : `${input.files.length} ملفات مختارة`;
}

/* ==============================
   MAP — GLOBAL STATE
============================== */
let violationMap  = null;   // Leaflet map instance (form)
let formMarker    = null;   // current marker in form map
let selectedLat   = null;
let selectedLng   = null;

let viewMap       = null;   // read-only view map
let viewMarker    = null;

// Al-Karada, Baghdad default center
const KRADA_LAT = 33.3152;
const KRADA_LNG = 44.4219;

/* ---- initialise the form map ---- */
function initFormMap() {
  if (violationMap) {
    violationMap.remove();
    violationMap = null;
    formMarker   = null;
  }

  violationMap = L.map('violationMap', { zoomControl: true }).setView([KRADA_LAT, KRADA_LNG], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(violationMap);

  // Custom red marker icon
  const redIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;
      background:#bf616a;
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [32,32],
    iconAnchor: [16,32],
    popupAnchor: [0,-34]
  });

  // Click on map → set marker
  violationMap.on('click', function(e) {
    placeFormMarker(e.latlng.lat, e.latlng.lng, redIcon);
  });
}

function placeFormMarker(lat, lng, icon) {
  selectedLat = lat;
  selectedLng = lng;

  if (formMarker) formMarker.remove();

  const customIcon = icon || L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;
      background:#bf616a;
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-34]
  });

  formMarker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(violationMap);
  formMarker.bindPopup(`
    <div style="text-align:center;direction:rtl;min-width:140px">
      <strong>📍 موقع المخالفة</strong><br/>
      <small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
    </div>
  `).openPopup();

  // Allow dragging the marker to fine-tune
  formMarker.on('dragend', function(ev) {
    const p = ev.target.getLatLng();
    placeFormMarker(p.lat, p.lng);
    violationMap.panTo([p.lat, p.lng]);
  });

  // Update coords bar
  document.getElementById('coordsText').textContent =
    `📌 خط العرض: ${lat.toFixed(6)}   |   خط الطول: ${lng.toFixed(6)}`;

  const mapsLink = document.getElementById('openGoogleMaps');
  mapsLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  mapsLink.classList.remove('hidden');
}

/* ---- locate me button ---- */
function locateMe() {
  if (!navigator.geolocation) {
    alert('المتصفح لا يدعم تحديد الموقع');
    return;
  }
  const btn = document.querySelector('.gps-locate');
  btn.textContent = '⏳ جاري التحديد...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      btn.textContent = '📡 تحديد موقعي الحالي';
      btn.disabled = false;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      violationMap.setView([lat, lng], 18);
      placeFormMarker(lat, lng);
    },
    function(err) {
      btn.textContent = '📡 تحديد موقعي الحالي';
      btn.disabled = false;
      alert('تعذّر تحديد الموقع: ' + err.message);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ---- search address ---- */
function searchAddress() {
  const wrap = document.getElementById('searchWrap');
  wrap.classList.toggle('visible');
  if (wrap.classList.contains('visible'))
    document.getElementById('searchInput').focus();
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;

  const btn = document.querySelector('.gps-do-search');
  btn.textContent = '⏳';
  btn.disabled = true;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=ar`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      const lt = parseFloat(lat);
      const ln = parseFloat(lon);
      violationMap.setView([lt, ln], 17);
      placeFormMarker(lt, ln);

      // Auto-fill address field if empty
      const addrField = document.getElementById('vAddress');
      if (!addrField.value) addrField.value = display_name;
    } else {
      alert('لم يتم العثور على الموقع، جرب عبارة بحث مختلفة');
    }
  } catch(e) {
    alert('تعذّر الاتصال بخدمة البحث. تحقق من اتصال الإنترنت.');
  } finally {
    btn.textContent = 'بحث';
    btn.disabled = false;
  }
}

// Search on Enter key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('searchInput') === document.activeElement) {
    e.preventDefault();
    doSearch();
  }
});

/* ==============================
   VIOLATIONS DATA
============================== */
let violations = [];

function openViolationModal() {
  document.getElementById('violationModal').classList.remove('hidden');
  document.getElementById('violationForm').reset();
  togglePermit(false);
  document.getElementById('permitFileName').textContent = 'ارفق نسخة من الإجازة';
  document.getElementById('docsFileName').textContent   = 'اختر ملف أو أكثر (PDF، صورة...)';
  document.getElementById('coordsText').textContent     = 'لم يتم تحديد الموقع بعد';
  document.getElementById('openGoogleMaps').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('visible');
  document.getElementById('searchInput').value = '';
  selectedLat = null;
  selectedLng = null;

  // Init map after modal is visible (needs DOM size)
  setTimeout(() => {
    initFormMap();
    violationMap.invalidateSize();
  }, 100);
}

function closeViolationModal() {
  document.getElementById('violationModal').classList.add('hidden');
  if (violationMap) { violationMap.remove(); violationMap = null; formMarker = null; }
}

// Close on backdrop
document.getElementById('violationModal').addEventListener('click', function(e) {
  if (e.target === this) closeViolationModal();
});
document.getElementById('mapViewModal').addEventListener('click', function(e) {
  if (e.target === this) closeMapView();
});

function submitViolation(e) {
  e.preventDefault();

  const address    = document.getElementById('vAddress').value.trim();
  const type       = document.getElementById('vType').value;
  const permit     = document.querySelector('input[name="permit"]:checked').value;
  const procedures = [...document.querySelectorAll('.checkbox-group input:checked')].map(c => c.value);
  const docsInput  = document.getElementById('docsFiles');
  const permitInput= document.getElementById('permitFile');
  const docsCount  = docsInput.files ? docsInput.files.length : 0;

  const violation = {
    id:         Date.now(),
    address,
    type,
    permit,
    procedures,
    docsCount,
    permitFile: (permit === 'yes' && permitInput.files.length > 0) ? permitInput.files[0].name : null,
    lat:        selectedLat,
    lng:        selectedLng,
    date:       new Date().toLocaleDateString('ar-IQ', { year:'numeric', month:'short', day:'numeric' })
  };

  violations.unshift(violation);
  renderViolations();
  closeViolationModal();
}

/* ==============================
   RENDER VIOLATIONS & DEEP SEARCH
============================== */
let currentViewMode = 'cards'; // 'cards' or 'table'
let filteredViolations = [];

function switchViolationView(mode) {
  currentViewMode = mode;
  document.getElementById('btnViewCards').classList.toggle('active', mode === 'cards');
  document.getElementById('btnViewTable').classList.toggle('active', mode === 'table');

  document.getElementById('violationsList').classList.toggle('hidden', mode !== 'cards');
  document.getElementById('violationsTableWrap').classList.toggle('hidden', mode !== 'table');
  renderViolations();
}

function clearDeepSearch() {
  document.getElementById('searchAddressInput').value = '';
  document.getElementById('searchTypeInput').value = '';
  document.getElementById('searchPermitInput').value = '';
  document.getElementById('searchProcedureInput').value = '';
  document.getElementById('searchDocsGpsInput').value = '';
  triggerDeepSearch();
}

function triggerDeepSearch() {
  const queryAddr = (document.getElementById('searchAddressInput')?.value || '').trim().toLowerCase();
  const queryType = document.getElementById('searchTypeInput')?.value || '';
  const queryPermit = document.getElementById('searchPermitInput')?.value || '';
  const queryProc = document.getElementById('searchProcedureInput')?.value || '';
  const queryDocsGps = document.getElementById('searchDocsGpsInput')?.value || '';

  filteredViolations = violations.filter(v => {
    // 1. بحث العنوان / الموقع
    if (queryAddr && !(v.address || '').toLowerCase().includes(queryAddr)) {
      return false;
    }

    // 2. نوع المخالفة
    if (queryType && v.type !== queryType) {
      return false;
    }

    // 3. إجازة البناء
    if (queryPermit && v.permit !== queryPermit) {
      return false;
    }

    // 4. الإجراءات المتخذة
    if (queryProc && !(v.procedures || []).includes(queryProc)) {
      return false;
    }

    // 5. المستندات و GPS
    if (queryDocsGps === 'with_docs' && (!v.docsCount || v.docsCount === 0)) return false;
    if (queryDocsGps === 'with_gps' && !v.lat) return false;
    if (queryDocsGps === 'without_gps' && v.lat) return false;

    return true;
  });

  const countDisplay = document.getElementById('searchResultsCount');
  if (countDisplay) {
    if (violations.length === 0) {
      countDisplay.textContent = 'لا توجد مخالفات مسجلة في النظام';
    } else if (filteredViolations.length === violations.length) {
      countDisplay.textContent = `يتم عرض كافة المخالفات (${violations.length} مخالفة)`;
    } else {
      countDisplay.textContent = `تم العثور على (${filteredViolations.length}) من أصل (${violations.length}) مخالفة`;
    }
  }

  renderViolations();
}

function renderViolations() {
  const list = document.getElementById('violationsList');
  const tableBody = document.getElementById('violationsTableBody');
  const dataToRender = filteredViolations.length > 0 || (document.getElementById('searchAddressInput')?.value || document.getElementById('searchTypeInput')?.value)
    ? filteredViolations 
    : violations;

  // في حال لا توجد بيانات
  if (dataToRender.length === 0) {
    if (list) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>${violations.length === 0 ? 'لا توجد مخالفات مسجلة حتى الآن' : 'لم يتم العثور على مخالفات مطابقة لمعايير البحث'}</p>
          ${violations.length === 0 ? '<button class="add-btn-empty" onclick="openViolationModal()">+ إضافة أول مخالفة</button>' : ''}
        </div>`;
    }
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;">لا توجد مخالفات مطابقة</td></tr>`;
    }
    return;
  }

  // 1. عرض البطاقات (Cards View)
  if (list) {
    list.innerHTML = dataToRender.map((v) => {
      const originalIdx = violations.indexOf(v);
      const badgesHtml = [
        ...(v.procedures.includes('رصد')   ? [`<span class="badge badge-rasad">👁️ رصد</span>`]     : []),
        ...(v.procedures.includes('غرامة') ? [`<span class="badge badge-gharama">💰 غرامة</span>`]  : []),
        ...(v.procedures.includes('إنذار') ? [`<span class="badge badge-inzar">📢 إنذار</span>`]    : []),
        v.permit === 'yes'
          ? `<span class="badge badge-permit">✅ إجازة بناء</span>`
          : `<span class="badge badge-nopermit">❌ بدون إجازة</span>`,
        v.lat
          ? `<span class="badge badge-gps" onclick="openMapView(${originalIdx})" title="عرض الموقع">📍 عرض الموقع</span>`
          : `<span class="badge" style="border-color:#5a6480;color:#8891a4">📍 بدون إحداثيات</span>`
      ].join('');

      const docsText = v.docsCount > 0 ? `📎 ${v.docsCount} مستند مرفق` : '';
      const gpsText  = v.lat ? `🌐 ${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : '';

      return `
        <div class="violation-card">
          <div>
            <div class="vc-title">📍 ${v.address}</div>
            <div class="vc-meta">
              <span>🔹 <strong>النوع:</strong> ${v.type}</span>
              ${docsText ? `<span>${docsText}</span>` : ''}
              ${v.permitFile ? `<span>📄 إجازة: ${v.permitFile}</span>` : ''}
              ${gpsText ? `<span style="font-family:monospace">${gpsText}</span>` : ''}
            </div>
            <div class="vc-badges">${badgesHtml}</div>
          </div>
          <div class="vc-actions">
            <span class="vc-date">${v.date}</span>
            <button class="vc-del-btn" onclick="deleteViolation(${originalIdx})" title="حذف">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  // 2. عرض الجدول التفصيلي (Table View)
  if (tableBody) {
    tableBody.innerHTML = dataToRender.map((v, i) => {
      const originalIdx = violations.indexOf(v);
      const proceduresList = (v.procedures && v.procedures.length > 0)
        ? v.procedures.join(' ، ')
        : 'لا توجد';

      const permitBadge = v.permit === 'yes'
        ? `<span class="badge badge-permit">✅ مجاز ${v.permitFile ? `<small>(${v.permitFile})</small>` : ''}</span>`
        : `<span class="badge badge-nopermit">❌ غير مجاز</span>`;

      const gpsBtn = v.lat
        ? `<button class="table-gps-link" onclick="openMapView(${originalIdx})">📍 ${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}</button>`
        : `<span style="color:var(--text3);font-size:0.8rem;">غير محدد</span>`;

      const docsSummary = (v.docsCount && v.docsCount > 0)
        ? `<span class="table-doc-tag">📎 ${v.docsCount} ملفات</span>`
        : `<span style="color:var(--text3);font-size:0.8rem;">لا توجد</span>`;

      return `
        <tr>
          <td><strong>${i + 1}</strong></td>
          <td><strong>📍 ${v.address}</strong></td>
          <td><span class="badge badge-rasad">${v.type}</span></td>
          <td>${permitBadge}</td>
          <td>${proceduresList}</td>
          <td>${docsSummary}</td>
          <td>${gpsBtn}</td>
          <td><small>${v.date}</small></td>
          <td>
            <button class="vc-del-btn" onclick="deleteViolation(${originalIdx})" title="حذف">🗑️</button>
          </td>
        </tr>`;
    }).join('');
  }
}

/* ==============================
   MAP VIEW (read-only)
============================== */
function openMapView(idx) {
  const v = violations[idx];
  if (!v || !v.lat) return;

  document.getElementById('mapViewModal').classList.remove('hidden');
  document.getElementById('mapViewTitle').textContent = `📍 ${v.address}`;
  document.getElementById('viewGoogleMaps').href = `https://www.google.com/maps?q=${v.lat},${v.lng}`;
  document.getElementById('viewCoords').textContent =
    `خط العرض: ${v.lat.toFixed(6)}   |   خط الطول: ${v.lng.toFixed(6)}`;

  setTimeout(() => {
    if (viewMap) { viewMap.remove(); viewMap = null; viewMarker = null; }

    viewMap = L.map('viewMap').setView([v.lat, v.lng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(viewMap);

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:36px;height:36px;
        background:#bf616a;
        border:3px solid #fff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(0,0,0,0.5);
      "></div>`,
      iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-38]
    });

    viewMarker = L.marker([v.lat, v.lng], { icon }).addTo(viewMap);
    viewMarker.bindPopup(`
      <div style="direction:rtl;text-align:center;min-width:160px">
        <strong>⚠️ ${v.type}</strong><br/>
        <span>${v.address}</span><br/>
        <small style="color:#888">${v.date}</small>
      </div>
    `).openPopup();

    viewMap.invalidateSize();
  }, 150);
}

function closeMapView() {
  document.getElementById('mapViewModal').classList.add('hidden');
  if (viewMap) { viewMap.remove(); viewMap = null; viewMarker = null; }
}

/* ==============================
   DELETE VIOLATION
============================== */
function deleteViolation(idx) {
  if (confirm('هل تريد حذف هذه المخالفة؟')) {
    violations.splice(idx, 1);
    renderViolations();
  }
}


/* ============================================================
   AUTH, WHATSAPP OTP & ROLES MANAGEMENT
============================================================ */
let currentUser = JSON.parse(localStorage.getItem('karada_user') || 'null');
let pendingPhone = '';

// تهيئة واجهة المستخدم بناءً على تسجيل الدخول والصلاحيات
function initAuthUI() {
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const usersBtn = document.getElementById('usersBtn');
  const addBtn = document.querySelector('.add-btn');

  if (currentUser) {
    userNameDisplay.textContent = currentUser.name.split(' ')[0] || currentUser.name;
    userAvatar.textContent = currentUser.role === 'admin' ? '👑' : '👤';

    // إظهار زر إدارة المستخدمين للمدير فقط
    if (currentUser.role === 'admin') {
      usersBtn.classList.remove('hidden');
    } else {
      usersBtn.classList.add('hidden');
    }

    // إخفاء زر إضافة مخالفة لمن صلاحيته "مشاهد فقط observer"
    if (addBtn) {
      if (currentUser.role === 'observer') {
        addBtn.style.display = 'none';
      } else {
        addBtn.style.display = 'block';
      }
    }
  } else {
    userNameDisplay.textContent = 'تسجيل الدخول';
    userAvatar.textContent = '👤';
    usersBtn.classList.add('hidden');
  }
}

// فتح نافذة المصادقة
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
  if (currentUser) {
    showStep('profile');
    document.getElementById('profName').textContent = currentUser.name;
    document.getElementById('profRoleBadge').textContent = getRoleArabic(currentUser.role);
    document.getElementById('profPhone').textContent = `📱 ${currentUser.phone}`;
    document.getElementById('profDept').textContent = `🏛️ الشعبة: ${getDeptArabic(currentUser.department)}`;
  } else {
    showStep('phone');
  }
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function showStep(step) {
  document.getElementById('loginStepPhone').classList.toggle('hidden', step !== 'phone');
  document.getElementById('loginStepOtp').classList.toggle('hidden', step !== 'otp');
  document.getElementById('loginStepProfile').classList.toggle('hidden', step !== 'profile');
}

function backToPhoneStep() {
  showStep('phone');
  document.getElementById('loginOtpInput').value = '';
}

// 1. إرسال كود OTP عبر واتساب
async function sendOtpCode() {
  const phone = document.getElementById('loginPhoneInput').value.trim();
  if (!phone) {
    alert('يرجى إدخال رقم الهاتف أولاً');
    return;
  }

  pendingPhone = phone;
  const demoAlert = document.getElementById('demoOtpAlert');
  demoAlert.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();
    if (!data.ok) {
      alert(data.error || 'فشل إرسال كود التحقق');
      return;
    }

    document.getElementById('sentPhoneDisplay').textContent = phone;
    showStep('otp');

    // إذا كان كود تجريبي (قبل ربط WhatsApp API الحقيقي)
    if (data.demoCode) {
      demoAlert.textContent = `⚡ كود التحقق السريع (وضع التطوير): ${data.demoCode}`;
      demoAlert.classList.remove('hidden');
      document.getElementById('loginOtpInput').value = data.demoCode;
    }

  } catch (err) {
    // في حال العمل دون سيرفر أو offline (وضع تجريبي للمتصفح المباشر)
    console.warn('Backend not reachable, activating local simulation mode');
    showStep('otp');
    document.getElementById('sentPhoneDisplay').textContent = phone;
    demoAlert.textContent = `⚡ كود التحقق السريع: 123456 (للتجربة)`;
    demoAlert.classList.remove('hidden');
    document.getElementById('loginOtpInput').value = '123456';
  }
}

// 2. التحقق من كود الـ OTP
async function verifyOtpCode() {
  const code = document.getElementById('loginOtpInput').value.trim();
  if (!code) {
    alert('يرجى إدخال كود التحقق المكون من 6 أرقام');
    return;
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: pendingPhone, code })
    });

    const data = await res.json();
    if (!data.ok) {
      alert(data.error || 'كود التحقق غير صحيح');
      return;
    }

    loginSuccess(data.user);

  } catch (err) {
    // محاكاة وضع بدون سيرفر
    if (code === '123456' || code.length === 6) {
      const mockUser = {
        name: pendingPhone === '07700000000' ? 'مدير المركز' : 'مفتش ميداني',
        phone: pendingPhone,
        role: pendingPhone === '07700000000' ? 'admin' : 'inspector',
        department: 'violations'
      };
      loginSuccess(mockUser);
    } else {
      alert('كود التحقق غير صحيح');
    }
  }
}

function loginSuccess(user) {
  currentUser = user;
  localStorage.setItem('karada_user', JSON.stringify(currentUser));
  initAuthUI();
  closeLoginModal();
  alert(`مرحباً بك: ${currentUser.name}\nالصلاحية: ${getRoleArabic(currentUser.role)}`);
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('karada_user');
  initAuthUI();
  closeLoginModal();
  alert('تم تسجيل الخروج بنجاح');
}

/* ============================================================
   USERS MANAGEMENT (ADMIN ROLE)
============================================================ */
function openUsersModal() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('هذه الشاشة مخصصة لمدير النظام فقط');
    return;
  }
  document.getElementById('usersModal').classList.remove('hidden');
  fetchUsersList();
}

function closeUsersModal() {
  document.getElementById('usersModal').classList.add('hidden');
}

// جلب قائمة المستخدمين
async function fetchUsersList() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">جاري تحميل المستخدمين...</td></tr>`;

  try {
    const res = await fetch('/api/users');
    const data = await res.json();

    if (data.ok && data.users) {
      renderUsersTable(data.users);
    } else {
      loadFallbackUsers();
    }
  } catch (err) {
    loadFallbackUsers();
  }
}

function loadFallbackUsers() {
  const localList = JSON.parse(localStorage.getItem('karada_mock_users') || `[
    {"id":1,"name":"مدير المركز","phone":"07700000000","role":"admin","department":"all","created_at":"2025-01-01"},
    {"id":2,"name":"م. أحمد الركابي","phone":"07801234567","role":"supervisor","department":"violations","created_at":"2025-02-10"},
    {"id":3,"name":"راصد شعبة الكرادة","phone":"07712345678","role":"inspector","department":"violations","created_at":"2025-03-05"}
  ]`);
  renderUsersTable(localList);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا يوجد مستخدمين مسجلين</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td dir="ltr" style="text-align:right;">${u.phone}</td>
      <td><span class="badge ${getRoleBadgeClass(u.role)}">${getRoleArabic(u.role)}</span></td>
      <td>${getDeptArabic(u.department)}</td>
      <td><small>${u.created_at ? u.created_at.split('T')[0] : '-'}</small></td>
      <td>
        ${u.role !== 'admin' ? `<button class="del-user-btn" onclick="deleteUser(${u.id})">حذف</button>` : '<small>محمي</small>'}
      </td>
    </tr>
  `).join('');
}

// إضافة مستخدم جديد
async function createUser(e) {
  e.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  const phone = document.getElementById('newUserPhone').value.trim();
  const role = document.getElementById('newUserRole').value;
  const department = document.getElementById('newUserDept').value;

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, role, department })
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error || 'فشلت إضافة المستخدم');
      return;
    }
    alert('تمت إضافة المستخدم بنجاح');
  } catch (err) {
    // محاكاة محلية
    const localList = JSON.parse(localStorage.getItem('karada_mock_users') || '[]');
    localList.unshift({ id: Date.now(), name, phone, role, department, created_at: new Date().toISOString() });
    localStorage.setItem('karada_mock_users', JSON.stringify(localList));
    alert('تمت إضافة المستخدم محلياً بنجاح');
  }

  document.getElementById('addUserForm').reset();
  fetchUsersList();
}

async function deleteUser(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

  try {
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
  } catch (err) {
    const localList = JSON.parse(localStorage.getItem('karada_mock_users') || '[]');
    const filtered = localList.filter(u => u.id !== id);
    localStorage.setItem('karada_mock_users', JSON.stringify(filtered));
  }
  fetchUsersList();
}

// دوال مساعدة للترجمة والتصنيف
function getRoleArabic(role) {
  switch (role) {
    case 'admin': return 'مدير نظام';
    case 'supervisor': return 'مشرف عام';
    case 'inspector': return 'مراقب / راصد ميداني';
    case 'observer': return 'مشاهد فقط';
    default: return role;
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin': return 'badge-permit';
    case 'supervisor': return 'badge-rasad';
    case 'inspector': return 'badge-gharama';
    default: return 'badge-inzar';
  }
}

function getDeptArabic(dept) {
  switch (dept) {
    case 'all': return 'كافة الشعب';
    case 'violations': return 'شعبة التجاوزات';
    case 'cleaning': return 'شعبة النظافة';
    default: return dept || 'الكل';
  }
}

// استدعاء التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
});
