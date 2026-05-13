// app.js – Firebase Auth + Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase, ref, set, get, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDyp3DVFuBiod7CIn-pGatRlrwj6ZUHxnc",
  authDomain: "doitienthecao.firebaseapp.com",
  databaseURL: "https://doitienthecao-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "doitienthecao",
  storageBucket: "doitienthecao.firebasestorage.app",
  messagingSenderId: "809650896899",
  appId: "1:809650896899:web:d6b6286e45966c0bbc0e36",
  measurementId: "G-G1SHBND8W0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===== TỶ LỆ ĐỔI =====
const RATES = {
  viettel:     { 10000:0.85, 20000:0.87, 50000:0.89, 100000:0.91, 200000:0.92, 500000:0.93 },
  mobifone:    { 10000:0.83, 20000:0.85, 50000:0.87, 100000:0.89, 200000:0.90, 500000:0.91 },
  vinaphone:   { 10000:0.83, 20000:0.85, 50000:0.87, 100000:0.89, 200000:0.90, 500000:0.91 },
  vietnamobile:{ 10000:0.78, 20000:0.80, 50000:0.83, 100000:0.85, 200000:0.87, 500000:0.88 },
  gmobile:     { 10000:0.75, 20000:0.77, 50000:0.80, 100000:0.82, 200000:0.84, 500000:0.86 },
};

let currentUser = null;

// ===== AUTH STATE =====
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    closeModal('loginModal');
    closeModal('registerModal');
    openModal('dashboardModal');
    loadBankAccounts();
    loadHistory();
    setupExchangeWatchers();
  } else {
    closeModal('dashboardModal');
  }
});

// ===== ĐĂNG KÝ =====
window.doRegister = async function () {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass  = document.getElementById('regPassword').value;
  const errEl = document.getElementById('registerError');
  const sucEl = document.getElementById('registerSuccess');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!name || !email || !phone || !pass) { showAlert(errEl, 'Vui lòng điền đầy đủ thông tin!'); return; }
  if (pass.length < 6) { showAlert(errEl, 'Mật khẩu phải có ít nhất 6 ký tự!'); return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await set(ref(db, `users/${cred.user.uid}/profile`), { name, email, phone, createdAt: Date.now() });
    showAlert(sucEl, '✅ Đăng ký thành công! Đang chuyển vào trang chính...', 'success');
  } catch (e) {
    showAlert(errEl, translateError(e.code));
  }
};

// ===== ĐĂNG NHẬP =====
window.doLogin = async function () {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!email || !pass) { showAlert(errEl, 'Vui lòng nhập email và mật khẩu!'); return; }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    showAlert(errEl, translateError(e.code));
  }
};

// ===== ĐĂNG XUẤT =====
window.doLogout = async function () {
  await signOut(auth);
  closeModal('dashboardModal');
};

// ===== THÊM NGÂN HÀNG =====
window.addBankAccount = async function () {
  if (!currentUser) return;
  const bankName   = document.getElementById('bankName').value;
  const bankAccNum = document.getElementById('bankAccount').value.trim();
  const bankHolder = document.getElementById('bankHolder').value.trim().toUpperCase();
  const alertEl    = document.getElementById('bankAlert');
  alertEl.style.display = 'none';

  if (!bankName || !bankAccNum || !bankHolder) { showAlert(alertEl, 'Vui lòng điền đầy đủ thông tin ngân hàng!'); return; }

  try {
    const newRef = push(ref(db, `users/${currentUser.uid}/banks`));
    await set(newRef, { bankName, accountNumber: bankAccNum, holderName: bankHolder, addedAt: Date.now() });
    showAlert(alertEl, '✅ Đã thêm tài khoản ngân hàng thành công!', 'success');
    document.getElementById('bankName').value = '';
    document.getElementById('bankAccount').value = '';
    document.getElementById('bankHolder').value = '';
  } catch (e) {
    showAlert(alertEl, 'Lỗi khi thêm ngân hàng: ' + e.message);
  }
};

// ===== XÓA NGÂN HÀNG =====
window.deleteBankAccount = async function (bankId) {
  if (!currentUser) return;
  if (!confirm('Xác nhận xóa tài khoản ngân hàng này?')) return;
  await remove(ref(db, `users/${currentUser.uid}/banks/${bankId}`));
};

// ===== GỬI YÊU CẦU ĐỔI THẺ =====
window.submitExchange = async function () {
  if (!currentUser) return;
  const network  = document.getElementById('network').value;
  const denom    = document.getElementById('denomination').value;
  const serial   = document.getElementById('serial').value.trim();
  const code     = document.getElementById('cardCode').value.trim();
  const bankSel  = document.getElementById('bankSelect').value;
  const alertEl  = document.getElementById('exchangeAlert');
  alertEl.style.display = 'none';

  if (!network || !denom || !serial || !code || !bankSel) {
    showAlert(alertEl, 'Vui lòng điền đầy đủ thông tin thẻ và chọn ngân hàng!'); return;
  }

  const rate    = RATES[network]?.[parseInt(denom)] || 0.85;
  const receive = Math.floor(parseInt(denom) * rate);

  try {
    const txRef = push(ref(db, `users/${currentUser.uid}/transactions`));
    await set(txRef, {
      network, denomination: parseInt(denom), serial, cardCode: code,
      bankId: bankSel, rate, receiveAmount: receive,
      status: 'pending', createdAt: Date.now()
    });
    // Also save to admin queue
    await set(ref(db, `admin/queue/${txRef.key}`), {
      uid: currentUser.uid, network, denomination: parseInt(denom),
      serial, cardCode: code, rate, receiveAmount: receive,
      status: 'pending', createdAt: Date.now()
    });
    showAlert(alertEl, `✅ Gửi thành công! Bạn sẽ nhận ${formatMoney(receive)} sau 1–3 phút.`, 'success');
    document.getElementById('network').value = '';
    document.getElementById('denomination').value = '';
    document.getElementById('serial').value = '';
    document.getElementById('cardCode').value = '';
    document.getElementById('ratePreview').style.display = 'none';
    switchTab('tabHistory');
  } catch (e) {
    showAlert(alertEl, 'Lỗi gửi yêu cầu: ' + e.message);
  }
};

// ===== LOAD NGÂN HÀNG =====
function loadBankAccounts() {
  if (!currentUser) return;
  onValue(ref(db, `users/${currentUser.uid}/banks`), (snap) => {
    const list     = document.getElementById('bankList');
    const selEl    = document.getElementById('bankSelect');
    const data     = snap.val() || {};
    const entries  = Object.entries(data);

    // Update bank list UI
    list.innerHTML = entries.length === 0
      ? '<p class="empty-msg">Chưa có tài khoản ngân hàng nào</p>'
      : entries.map(([id, b]) => `
        <div class="bank-item">
          <div class="bank-item-info">
            <span class="bank-item-name">🏦 ${b.bankName}</span>
            <span class="bank-item-account">${b.accountNumber}</span>
            <span class="bank-item-holder">${b.holderName}</span>
          </div>
          <button class="btn-delete" onclick="deleteBankAccount('${id}')"><i class="fas fa-trash"></i></button>
        </div>`).join('');

    // Update select in exchange tab
    selEl.innerHTML = '<option value="">-- Chọn ngân hàng --</option>'
      + entries.map(([id, b]) => `<option value="${id}">${b.bankName} – ${b.accountNumber}</option>`).join('');
  });
}

// ===== LOAD LỊCH SỬ =====
function loadHistory() {
  if (!currentUser) return;
  onValue(ref(db, `users/${currentUser.uid}/transactions`), (snap) => {
    const list = document.getElementById('historyList');
    const data = snap.val() || {};
    const entries = Object.entries(data).reverse();
    list.innerHTML = entries.length === 0
      ? '<p class="empty-msg">Chưa có giao dịch nào</p>'
      : entries.map(([id, tx]) => `
        <div class="history-item">
          <div class="history-left">
            <span class="history-net">📱 ${tx.network} – ${formatMoney(tx.denomination)}</span>
            <span class="history-date">${new Date(tx.createdAt).toLocaleString('vi-VN')}</span>
          </div>
          <div class="history-right">
            <span class="history-amount">+${formatMoney(tx.receiveAmount)}</span>
            <span class="history-status status-${tx.status}">${statusLabel(tx.status)}</span>
          </div>
        </div>`).join('');
  });
}

// ===== RATE PREVIEW WATCHERS =====
function setupExchangeWatchers() {
  ['network','denomination'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateRatePreview);
  });
}

function updateRatePreview() {
  const net   = document.getElementById('network').value;
  const denom = document.getElementById('denomination').value;
  const prev  = document.getElementById('ratePreview');
  if (!net || !denom) { prev.style.display = 'none'; return; }
  const rate    = RATES[net]?.[parseInt(denom)] || 0.85;
  const receive = Math.floor(parseInt(denom) * rate);
  document.getElementById('previewDenom').textContent   = formatMoney(parseInt(denom));
  document.getElementById('previewRate').textContent    = (rate * 100).toFixed(0) + '%';
  document.getElementById('previewReceive').textContent = formatMoney(receive);
  prev.style.display = 'block';
}

// ===== HELPERS =====
function formatMoney(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}
function statusLabel(s) {
  return s === 'pending' ? '⏳ Đang xử lý' : s === 'success' ? '✅ Thành công' : '❌ Thất bại';
}
function showAlert(el, msg, type = 'error') {
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.style.display = 'block';
}
function translateError(code) {
  const map = {
    'auth/email-already-in-use': 'Email này đã được sử dụng!',
    'auth/invalid-email':        'Email không hợp lệ!',
    'auth/weak-password':        'Mật khẩu quá yếu!',
    'auth/user-not-found':       'Tài khoản không tồn tại!',
    'auth/wrong-password':       'Mật khẩu không đúng!',
    'auth/invalid-credential':   'Email hoặc mật khẩu không đúng!',
    'auth/too-many-requests':    'Quá nhiều lần thử. Vui lòng thử lại sau!',
  };
  return map[code] || `Lỗi: ${code}`;
}
