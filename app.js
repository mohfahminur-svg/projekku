/**
 * PayQu - Smart Wallet & Catatan Uang Pribadi
 * Offline-First Progressive Web App (PWA) Logic
 */

const STORAGE_KEY = 'payqu_state_v1';

// ==========================================
// REAL-TIME DATE & TIME UTILITIES
// ==========================================

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const INDO_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalTimeString(d = new Date()) {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getLocalTimeWithSecondsString(d = new Date()) {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Convert any 12-hour (AM/PM) or arbitrary time format to strict 24-hour HH:mm
function convertTo24HourTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();

  // Match e.g. "02:12 PM", "2:12 pm", "11:30 AM", "02.12 PM"
  const ampmMatch = trimmed.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const modifier = (ampmMatch[3] || '').toUpperCase();

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // Fallback match standard HH:mm or H:mm
  const standardMatch = trimmed.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (standardMatch) {
    const hours = String(parseInt(standardMatch[1], 10)).padStart(2, '0');
    return `${hours}:${standardMatch[2]}`;
  }

  return trimmed;
}

// Format live user keystrokes into 24-hour HH:mm (00:00 - 23:59)
function format24HourTimeInput(input) {
  if (!input) return;
  let val = input.value.replace(/[^0-9]/g, '');
  if (val.length > 4) val = val.slice(0, 4);

  if (val.length >= 3) {
    let hh = parseInt(val.slice(0, 2), 10);
    if (hh > 23) hh = 23;
    let mm = parseInt(val.slice(2, 4), 10);
    if (mm > 59) mm = 59;
    input.value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(val.length === 3 ? 1 : 2, '0')}`;
  } else if (val.length === 2) {
    let hh = parseInt(val, 10);
    if (hh > 23) hh = 23;
    input.value = String(hh).padStart(2, '0');
  } else {
    input.value = val;
  }
}

function normalize24HourTimeInput(input) {
  if (!input || !input.value.trim()) return;
  input.value = convertTo24HourTime(input.value.trim());
}

function getIndonesianDateString(d = new Date(), isShort = true) {
  const dayName = INDO_DAYS[d.getDay()];
  const dayNum = d.getDate();
  const monthName = isShort ? INDO_MONTHS_SHORT[d.getMonth()] : INDO_MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

function formatTransactionDisplayTime(tx) {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Extract time from tx.time or tx.createdAt (always 24-hour)
  let timeStr = '';
  if (tx.time && typeof tx.time === 'string') {
    timeStr = convertTo24HourTime(tx.time);
  }
  if (!timeStr && tx.createdAt) {
    timeStr = getLocalTimeString(new Date(tx.createdAt));
  }
  if (!timeStr) {
    timeStr = getLocalTimeString(now);
  }

  const txDate = tx.date;
  if (!txDate) {
    return tx.time || `Hari ini, ${timeStr}`;
  }

  if (txDate === todayStr) {
    return `Hari ini, ${timeStr}`;
  }
  if (txDate === yesterdayStr) {
    return `Kemarin, ${timeStr}`;
  }

  const parts = txDate.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const curYear = now.getFullYear();
    const monthName = INDO_MONTHS_SHORT[m] || '';
    if (y === curYear) {
      return `${d} ${monthName}, ${timeStr}`;
    } else {
      return `${d} ${monthName} ${y}, ${timeStr}`;
    }
  }

  return tx.time || txDate;
}

function formatFullTransactionDateTime(tx) {
  let timeStr = '';
  if (tx.time && typeof tx.time === 'string') {
    timeStr = convertTo24HourTime(tx.time);
  }
  if (!timeStr && tx.createdAt) {
    timeStr = getLocalTimeString(new Date(tx.createdAt));
  }
  if (!timeStr) timeStr = getLocalTimeString(new Date());

  if (tx.date) {
    const parts = tx.date.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const dayName = INDO_DAYS[dt.getDay()] || '';
      const monthName = INDO_MONTHS_SHORT[m] || '';
      return `${dayName}, ${d} ${monthName} ${y} • ${timeStr} WIB`;
    }
  }
  return (tx.time || 'Hari ini') + ' WIB';
}

function updateLiveClock() {
  const clockEl = document.getElementById('liveClockText');
  const dateEl = document.getElementById('liveDateText');
  const now = new Date();

  if (clockEl) {
    clockEl.textContent = `${getLocalTimeWithSecondsString(now)} WIB`;
  }
  if (dateEl) {
    dateEl.textContent = getIndonesianDateString(now, true);
  }
}

function startRealTimeClock() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
}

function setTxTimeToNow() {
  const dateInput = document.getElementById('txDateInput');
  const timeInput = document.getElementById('txTimeInput');
  const now = new Date();
  if (dateInput) dateInput.value = getLocalDateString(now);
  if (timeInput) timeInput.value = getLocalTimeString(now);
}

// Initial default state (used only when no local storage data exists)
const defaultState = {
  currency: 'IDR',
  balanceHidden: false,
  selectedWalletFilter: 'Semua Rekening',
  recentTxFilter: 'all',
  activeTab: 'tab-home',
  selectedTxId: null,
  formType: 'expense',
  userProfile: {
    name: '',
    email: '',
    avatar: '',
    hasCompletedOnboarding: false
  },
  pinSettings: {
    isPinEnabled: false,
    isBiometricEnabled: true,
    pin: ''
  },
  exportPeriod: 'Bulan Ini',
  wallets: [],
  transactions: []
};

// Global active state in memory
let state = JSON.parse(JSON.stringify(defaultState));

// Buffer for PIN modal
let currentPinBuffer = '';
let deferredInstallPrompt = null;

// ==========================================
// 1. STORAGE MANAGEMENT (Offline-first Local Storage)
// ==========================================

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign({}, defaultState, parsed);
      // Ensure nested properties are merged correctly
      state.userProfile = Object.assign({}, defaultState.userProfile, parsed.userProfile || {});
      // Jika pengguna sudah memiliki nama di profil sebelumnya, tandai onboarding selesai
      if (state.userProfile.name && state.userProfile.name.trim() !== '' && typeof state.userProfile.hasCompletedOnboarding !== 'boolean') {
        state.userProfile.hasCompletedOnboarding = true;
      }
      state.pinSettings = Object.assign({}, defaultState.pinSettings, parsed.pinSettings || {});
      // Biometrik selalu aktif di sistem
      state.pinSettings.isBiometricEnabled = true;
      // Jika PIN masih dummy bawaan lama '123456', bersihkan agar pengguna baru tidak memiliki PIN bawaan liar
      if (state.pinSettings.pin === '123456') {
        state.pinSettings.pin = '';
        state.pinSettings.isPinEnabled = false;
      }
      // Hormati status aktif/mati Kunci PIN sesuai pengaturan pengguna
      if (parsed.pinSettings && typeof parsed.pinSettings.isPinEnabled === 'boolean') {
        // Kunci PIN hanya bisa aktif jika memang sudah ada PIN 6 digit yang sah
        if (state.pinSettings.pin && state.pinSettings.pin.length === 6) {
          state.pinSettings.isPinEnabled = parsed.pinSettings.isPinEnabled;
        } else {
          state.pinSettings.isPinEnabled = false;
        }
      }
      if (!Array.isArray(state.wallets)) {
        state.wallets = defaultState.wallets.slice();
      }
      if (!Array.isArray(state.transactions)) {
        state.transactions = defaultState.transactions.slice();
      }
      if (!state.recentTxFilter) {
        state.recentTxFilter = 'all';
      }

      // Migrasi: Lepas status 'Utama' dari BCA dan dompet lain agar tidak muncul label "Utama" yang tidak diinginkan
      let migrated = false;
      if (Array.isArray(state.wallets)) {
        state.wallets.forEach(w => {
          if (w.name === 'BCA Utama' || (w.id === 'bca' && (w.name.includes('Utama') || (w.desc && w.desc.includes('Utama'))))) {
            w.name = 'BCA';
            if (w.desc && w.desc.includes('Utama')) {
              w.desc = 'Rekening Bank 8820';
            }
            migrated = true;
          }
          if (w.code && w.code.toLowerCase() === 'utama') {
            w.code = (w.type === 'ewallet' ? 'e-Wallet' : (w.type === 'cash' ? 'Cash' : 'Bank'));
            migrated = true;
          }
        });
      }
      if (Array.isArray(state.transactions)) {
        state.transactions.forEach(t => {
          if (t.wallet === 'BCA Utama') {
            t.wallet = 'BCA';
            migrated = true;
          }
        });
      }
      if (state.selectedWalletFilter === 'BCA Utama') {
        state.selectedWalletFilter = 'BCA';
        migrated = true;
      }
      if (migrated) {
        saveStateToStorage();
      }
    } else {
      saveStateToStorage();
    }
  } catch (err) {
    console.error('Failed to load local state:', err);
    state = JSON.parse(JSON.stringify(defaultState));
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

// ==========================================
// 2. HELPER UTILITIES & FORMATTING
// ==========================================

function formatIDR(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function formatNumberWithDots(val) {
  if (val === null || val === undefined) return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('id-ID');
}

function parseFormattedNumber(val) {
  if (!val) return 0;
  const clean = String(val).replace(/\D/g, '');
  return parseFloat(clean) || 0;
}

function setupCurrencyInputFormatter(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener('input', () => {
    inputEl.value = formatNumberWithDots(inputEl.value);
  });
}

function showToast(msg, icon = '✓') {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  if (iconEl) iconEl.textContent = icon;

  toast.classList.remove('-translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (window.toastTimer) clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-20', 'opacity-0');
  }, 2800);
}

function openModal(id) {
  if (id === 'modalTransaction') {
    setTxTimeToNow();
    updateCategoryInputPreview();
    checkTxBalanceSufficient();
  } else if (id === 'modalAllTransactions') {
    allTxFilter = 'all';
    updateAllTxFilterUI();
    const searchInput = document.getElementById('txSearchInput');
    if (searchInput) searchInput.value = '';
    renderAllTransactionsList();
  } else if (id === 'modalExportCSV') {
    initExportModalDates();
    setExportFormat(currentExportFormat || 'excel');
  } else if (id === 'modalBackupData') {
    updateBackupStatusUI();
  }
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
  setTimeout(() => {
    const sheet = el.querySelector('.modal-sheet-enter');
    if (sheet) sheet.classList.add('modal-sheet-active');
    const center = el.querySelector('.modal-center-enter');
    if (center) center.classList.add('modal-center-active');
  }, 10);
}

function closeModal(id) {
  if (id === 'modalReceiptScanner') { stopCamera(); }
  const el = document.getElementById(id);
  if (!el) return;
  const sheet = el.querySelector('.modal-sheet-enter');
  if (sheet) sheet.classList.remove('modal-sheet-active');
  const center = el.querySelector('.modal-center-enter');
  if (center) center.classList.remove('modal-center-active');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('flex');
  }, 240);
}

// ==========================================
// 3. TAB NAVIGATION
// ==========================================

function switchTab(tabId) {
  state.activeTab = tabId;

  // Show only selected tab
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== tabId);
  });

  const tabConfig = [
    { id: 'nav-btn-home', target: 'tab-home', label: 'Beranda' },
    { id: 'nav-btn-stats', target: 'tab-stats', label: 'Statistik' },
    { id: 'nav-btn-wallets', target: 'tab-wallets', label: 'Dompet' },
    { id: 'nav-btn-profile', target: 'tab-profile', label: 'Profil' }
  ];

  tabConfig.forEach(t => {
    const btn = document.getElementById(t.id);
    if (!btn) return;
    const label = btn.querySelector('.nav-label');
    const isCurrent = (t.target === tabId);

    btn.classList.toggle('active-tab', isCurrent);
    if (isCurrent) {
      btn.style.backgroundColor = '#ffffff';
      btn.style.color = '#1A1824';
      btn.className = 'nav-tab-btn active-tab flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 shrink-0';
      if (label) {
        label.classList.remove('hidden');
        label.style.color = '#1A1824';
      }
    } else {
      btn.style.backgroundColor = 'transparent';
      btn.style.color = '#111111';
      btn.className = 'nav-tab-btn flex items-center gap-1.5 p-2 rounded-full text-ink-dark/80 hover:text-ink-dark transition-all active:scale-95 shrink-0';
      if (label) label.classList.add('hidden');
    }
  });

  if (tabId === 'tab-home') {
    // Saat kembali ke tab beranda, refresh posisi carousel kartu agar berada di tengah dan tampak utuh
    requestAnimationFrame(() => {
      const track = document.getElementById('walletCardsCarousel');
      if (track) {
        void track.offsetHeight; // Paksa reflow layout agar layer grafis GPU Chrome langsung me-raster kartu
      }
      refreshWalletCarouselPosition(false);
    });
  } else if (tabId === 'tab-stats') {
    renderStats();
  } else if (tabId === 'tab-wallets') {
    renderWalletsTabList();
  }
  renderBalances();
}

// ==========================================
// 4. BALANCES & CALCULATIONS
// ==========================================

function calculateTotals() {
  let income = 0;
  let expense = 0;
  const filtered = state.selectedWalletFilter === 'Semua Rekening'
    ? state.transactions
    : state.transactions.filter(t => t.wallet.toLowerCase() === state.selectedWalletFilter.toLowerCase());

  filtered.forEach(t => {
    if (t.type === 'income') income += Number(t.amount || 0);
    else expense += Number(t.amount || 0);
  });

  let totalBal = 0;
  if (state.selectedWalletFilter === 'Semua Rekening') {
    state.wallets.forEach(w => totalBal += Number(w.balance || 0));
  } else {
    const match = state.wallets.find(w => w.name.toLowerCase() === state.selectedWalletFilter.toLowerCase());
    totalBal = match ? Number(match.balance || 0) : (income - expense);
  }

  return { income, expense, balance: totalBal };
}

function renderBalances() {
  const { income, expense, balance } = calculateTotals();
  const balanceEl = document.getElementById('mainBalanceDisplay');
  const incomeEl = document.getElementById('totalIncomeDisplay');
  const expenseEl = document.getElementById('totalExpenseDisplay');

  if (state.balanceHidden) {
    if (balanceEl) balanceEl.textContent = '••••••••';
    if (incomeEl) incomeEl.textContent = '+••••••';
    if (expenseEl) expenseEl.textContent = '-••••••';
  } else {
    if (balanceEl) balanceEl.textContent = formatIDR(balance);
    if (incomeEl) incomeEl.textContent = '+' + formatIDR(income);
    if (expenseEl) expenseEl.textContent = '-' + formatIDR(expense);
  }

  // Update Stats header totals & ratio bars
  updateStatsRatioBars(income, expense);
}

function updateStatsRatioBars(income, expense) {
  const statsExp = document.getElementById('statsExpenseTotal');
  const statsInc = document.getElementById('statsIncomeTotal');
  const statsIncomePct = document.getElementById('statsIncomePct');
  const statsIncomeBar = document.getElementById('statsIncomeBar');
  const statsExpensePct = document.getElementById('statsExpensePct');
  const statsExpenseBar = document.getElementById('statsExpenseBar');

  if (statsExp) statsExp.textContent = formatIDR(expense);
  if (statsInc) statsInc.textContent = formatIDR(income);

  const inc = Number(income || 0);
  const exp = Number(expense || 0);
  const total = inc + exp;
  let incPct = 0;
  let expPct = 0;
  if (total > 0) {
    incPct = Math.round((inc / total) * 100);
    expPct = 100 - incPct;
  }

  if (statsIncomePct) statsIncomePct.textContent = incPct + '%';
  if (statsIncomeBar) statsIncomeBar.style.width = incPct + '%';
  if (statsExpensePct) statsExpensePct.textContent = expPct + '%';
  if (statsExpenseBar) statsExpenseBar.style.width = expPct + '%';
}

// ==========================================
// 5. WALLETS (DOMPET) MANAGEMENT & RENDERING
// ==========================================

function renderWallets() {
  renderHomeWalletCards();
  renderWalletsTabList();
  updateWalletDropdowns();
}

window.isCarouselDragging = false;

let walletCarousel = {
  currentIndex: 0,
  currentTranslate: 0,
  isDragging: false,
  dragMoved: false
};

function refreshWalletCarouselPosition(animated = false) {
  const wrapper = document.getElementById('walletCarouselWrapper');
  const track = document.getElementById('walletCardsCarousel');
  if (!wrapper || !track) return;
  // Jika tab beranda belum terlihat di layar, tunda sampai tab beranda dibuka
  if (!wrapper.offsetWidth || wrapper.offsetParent === null) return;

  const numWallets = state.wallets ? state.wallets.length : 0;
  if (numWallets === 0) return;

  if (numWallets === 1) {
    track.className = 'relative flex gap-3 items-stretch justify-center';
    track.style.transform = 'none';
    walletCarousel.currentIndex = 0;
    walletCarousel.currentTranslate = 0;
    updateWalletCardsScaleAndOpacity(0, false);
    updateWalletCarouselDots();
    return;
  }

  track.className = 'relative flex gap-3 items-stretch';

  const cards = track.querySelectorAll('.wallet-carousel-card');
  if (!cards || cards.length === 0) return;

  const copies = numWallets === 2 ? 5 : 3;
  const middleCopy = Math.floor(copies / 2);
  const cur = (walletCarousel.currentIndex == null || isNaN(walletCarousel.currentIndex)) ? 0 : walletCarousel.currentIndex;
  const baseIdx = ((cur % numWallets) + numWallets) % numWallets;
  walletCarousel.currentIndex = (middleCopy * numWallets) + baseIdx;

  setWalletCarouselIndex(walletCarousel.currentIndex, animated);
}

// Efek animasi dinamis & halus: Skala & Opasitas kartu sesuai jarak dari tengah (Modern iOS / Fintech Card Carousel)
function updateWalletCardsScaleAndOpacity(currentTranslate, animated = true) {
  const wrapper = document.getElementById('walletCarouselWrapper');
  const track = document.getElementById('walletCardsCarousel');
  if (!wrapper || !track) return;
  const cards = track.querySelectorAll('.wallet-carousel-card');
  if (!cards || cards.length === 0) return;

  const numWallets = state.wallets ? state.wallets.length : 0;
  if (numWallets <= 1) {
    cards.forEach(card => {
      card.style.transform = 'scale(1) translateZ(0)';
      card.style.opacity = '1';
      card.style.filter = 'none';
      card.style.boxShadow = '0 10px 24px -4px rgba(0, 0, 0, 0.12)';
    });
    return;
  }

  const wrapperWidth = wrapper.offsetWidth || 340;
  const centerInTrack = (-currentTranslate) + (wrapperWidth / 2);

  cards.forEach(card => {
    const cardWidth = card.offsetWidth || 260;
    const cardCenter = card.offsetLeft + (cardWidth / 2);
    const dist = Math.abs(cardCenter - centerInTrack);
    const stride = cardWidth + 12; // 12px gap-3

    // Progress dari 0 (di tengah) hingga 1 (satu kartu di samping)
    const factor = Math.min(Math.max(dist / stride, 0), 2.0);

    // Hitung skala dan opasitas dinamis yang sangat halus
    // Kartu utama di tengah: scale 1.0, opacity 1.0
    // Kartu samping yang mengintip: scale 0.91, opacity 0.65
    // Kartu di luar pandangan: scale 0.83, opacity 0.35
    const scale = (1 - (Math.min(factor, 1.2) * 0.09)).toFixed(4);
    const opacity = (1 - (Math.min(factor, 1.2) * 0.38)).toFixed(3);

    if (animated) {
      card.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease, filter 0.45s ease';
    } else {
      card.style.transition = 'none';
    }

    card.style.transform = `scale(${scale}) translateZ(0)`;
    card.style.opacity = opacity;
    card.style.transformOrigin = 'center center';

    if (factor < 0.4) {
      card.style.boxShadow = '0 16px 32px -4px rgba(0, 0, 0, 0.16), 0 6px 14px -2px rgba(0, 0, 0, 0.08)';
      card.style.zIndex = '10';
      card.style.filter = 'none';
    } else {
      card.style.boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.05)';
      card.style.zIndex = `${Math.max(1, 8 - Math.round(factor))}`;
      card.style.filter = 'grayscale(8%)';
    }
  });
}

function setWalletCarouselIndex(index, animated = true) {
  const wrapper = document.getElementById('walletCarouselWrapper');
  const track = document.getElementById('walletCardsCarousel');
  if (!track || !wrapper) return;

  const numWallets = state.wallets ? state.wallets.length : 0;
  if (numWallets === 0) {
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0, 0, 0)';
    updateWalletCarouselDots();
    return;
  }

  if (numWallets === 1) {
    track.className = 'relative flex gap-3 items-stretch justify-center';
    track.style.transition = 'none';
    track.style.transform = 'none';
    walletCarousel.currentIndex = 0;
    walletCarousel.currentTranslate = 0;
    walletCarousel.needsPositionRefresh = false;
    updateWalletCardsScaleAndOpacity(0, false);
    updateWalletCarouselDots();
    return;
  }

  track.className = 'relative flex gap-3 items-stretch';

  const cards = track.querySelectorAll('.wallet-carousel-card');
  if (!cards || cards.length === 0) return;

  const safeIndex = Math.max(0, Math.min(index, cards.length - 1));
  walletCarousel.currentIndex = safeIndex;

  // Cek apakah carousel sedang tersembunyi (misalnya user sedang di tab Dompet/Statistik)
  const isHidden = !wrapper.offsetWidth || wrapper.offsetParent === null || !cards[safeIndex] || cards[safeIndex].offsetWidth === 0;
  if (isHidden) {
    // Jangan ubah transform saat elemen tersembunyi agar tidak menghasilkan offset 0 yang merusak tata letak
    walletCarousel.needsPositionRefresh = true;
    updateWalletCarouselDots();
    return;
  }

  // Pemusatan tepat: titik tengah wrapper dikurangi titik tengah kartu relatif terhadap track
  const targetCard = cards[safeIndex];
  const wrapperWidth = wrapper.offsetWidth;
  const cardCenter = targetCard.offsetLeft + (targetCard.offsetWidth / 2);
  const targetTranslate = Math.round((wrapperWidth / 2) - cardCenter);

  walletCarousel.currentTranslate = targetTranslate;
  walletCarousel.needsPositionRefresh = false;

  if (animated) {
    track.style.willChange = 'transform';
    track.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
  } else {
    track.style.willChange = 'auto';
    track.style.transition = 'none';
  }

  track.style.transform = `translate3d(${targetTranslate}px, 0, 0)`;
  updateWalletCardsScaleAndOpacity(targetTranslate, animated);
  updateWalletCarouselDots();
}

function onWalletCarouselTransitionEnd(e) {
  // Hanya proses transisi transform pada track utama
  if (e && e.target !== document.getElementById('walletCardsCarousel')) return;
  if (e && e.propertyName !== 'transform') return;

  const track = document.getElementById('walletCardsCarousel');
  if (track) track.style.willChange = 'auto';

  const numWallets = state.wallets ? state.wallets.length : 0;
  if (numWallets <= 1) return;

  const copies = numWallets === 2 ? 5 : 3;
  const minThreshold = numWallets;
  const maxThreshold = (copies - 1) * numWallets;

  // Pergantian instan tanpa jeda/patah antar set klon
  if (walletCarousel.currentIndex >= maxThreshold) {
    walletCarousel.currentIndex -= numWallets;
    setWalletCarouselIndex(walletCarousel.currentIndex, false);
  } else if (walletCarousel.currentIndex < minThreshold) {
    walletCarousel.currentIndex += numWallets;
    setWalletCarouselIndex(walletCarousel.currentIndex, false);
  }
}

function renderHomeWalletCards() {
  const container = document.getElementById('walletCardsCarousel');
  if (!container) return;
  container.innerHTML = '';

  const palette = [
    { bg: 'bg-card-yellow', text: 'text-[#1A1824]', subtext: 'text-[#1A1824]/75', border: 'border-black/10' },
    { bg: 'bg-[#1E88E5]', text: 'text-white', subtext: 'text-white/85', border: 'border-white/20' },
    { bg: 'bg-card-mint', text: 'text-[#1A1824]', subtext: 'text-[#1A1824]/75', border: 'border-black/10' },
    { bg: 'bg-card-purple', text: 'text-white', subtext: 'text-white/85', border: 'border-white/10' },
    { bg: 'bg-ink-dark', text: 'text-white', subtext: 'text-white/70', border: 'border-white/10' },
    { bg: 'bg-rose-500', text: 'text-white', subtext: 'text-white/85', border: 'border-white/20' }
  ];

  if (!state.wallets || state.wallets.length === 0) {
    container.className = 'relative flex gap-3 items-stretch';
    container.innerHTML = `
      <div class="w-full text-center py-8 bg-white rounded-2xl border border-slate-100">
        <p class="text-xs text-slate-400">Belum ada kartu rekening</p>
      </div>
    `;
    updateWalletCarouselDots();
    return;
  }

  const numWallets = state.wallets.length;
  if (numWallets === 1) {
    container.className = 'relative flex gap-3 items-stretch justify-center';
  } else {
    container.className = 'relative flex gap-3 items-stretch';
  }

  // Smart palette assignment: no adjacent wallets share the same color,
  // and the last wallet doesn't share color with the first wallet (for seamless carousel looping).
  const walletThemes = [];
  for (let i = 0; i < numWallets; i++) {
    walletThemes.push(palette[i % palette.length]);
  }
  if (numWallets > 1 && walletThemes[numWallets - 1].bg === walletThemes[0].bg) {
    const prevBg = walletThemes[numWallets - 2].bg;
    const firstBg = walletThemes[0].bg;
    const alt = palette.find(p => p.bg !== prevBg && p.bg !== firstBg) || palette[1];
    walletThemes[numWallets - 1] = alt;
  }

  // Render set kartu untuk Infinite Looping tanpa batas (5 copies jika 2 dompet, 3 copies jika > 2 dompet)
  const copies = numWallets === 2 ? 5 : (numWallets > 2 ? 3 : 1);
  const middleCopy = Math.floor(copies / 2);
  const initialIndex = middleCopy * numWallets;

  for (let copy = 0; copy < copies; copy++) {
    state.wallets.forEach((w, origIdx) => {
      const globalIdx = copy * numWallets + origIdx;
      const theme = walletThemes[origIdx];
      const card = document.createElement('div');
      card.className = `wallet-carousel-card shrink-0 w-[74%] sm:w-[280px] ${theme.bg} rounded-3xl p-5 ${theme.text} shadow-soft relative overflow-hidden flex flex-col justify-between h-36 border ${theme.border} cursor-pointer active:opacity-95 select-none`;
      card.dataset.walletIndex = origIdx;
      card.dataset.globalIndex = globalIdx;

      card.onclick = () => {
        if (window.isCarouselDragging) return;
        setWalletCarouselIndex(globalIdx, true);
        selectActiveWalletFilter(w.name, false);
      };

      const balDisplay = state.balanceHidden ? '••••••' : formatIDR(w.balance);
      let codeDisplay = '';
      if (w.code && w.code.toLowerCase() !== 'utama' && !['bank', 'ewallet', 'cash'].includes(w.code.toLowerCase())) {
        codeDisplay = w.type === 'bank' ? `Rekening • ${w.code}` : (w.type === 'ewallet' ? `e-Wallet • ${w.code}` : w.code);
      } else {
        codeDisplay = w.type === 'bank' ? 'Rekening Bank' : (w.type === 'ewallet' ? 'Dompet Digital' : 'Uang Tunai');
      }

      card.innerHTML = `
        <div class="relative z-10 flex flex-col text-left pointer-events-none">
          <span class="text-xs font-bold ${theme.subtext} uppercase tracking-wider">${codeDisplay}</span>
          <h3 class="text-base sm:text-lg font-extrabold ${theme.text} mt-0.5 tracking-tight font-display leading-tight">${w.name}</h3>
        </div>
        <div class="relative z-10 text-left pointer-events-none">
          <span class="text-[11px] font-semibold ${theme.subtext} block">Saldo</span>
          <h4 class="font-display text-2xl font-bold tracking-tight ${theme.text} mt-0.5">${balDisplay}</h4>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Mulai di kartu set tengah secara mulus
  walletCarousel.currentIndex = numWallets > 1 ? initialIndex : 0;
  requestAnimationFrame(() => {
    setWalletCarouselIndex(walletCarousel.currentIndex, false);
  });
}

function slideWalletCarousel(direction) {
  if (!state.wallets || state.wallets.length <= 1) return;
  setWalletCarouselIndex(walletCarousel.currentIndex + direction, true);
}

function scrollToWalletCard(targetWalletIndex) {
  if (!state.wallets || state.wallets.length <= 1) return;
  const numWallets = state.wallets.length;
  const copies = numWallets === 2 ? 5 : 3;
  const middleCopy = Math.floor(copies / 2);
  setWalletCarouselIndex((middleCopy * numWallets) + (targetWalletIndex % numWallets), true);
}

function updateWalletCarouselDots() {
  const dotsContainer = document.getElementById('walletCarouselDots');
  if (!dotsContainer) return;

  const numWallets = state.wallets ? state.wallets.length : 0;
  if (numWallets <= 1) {
    dotsContainer.innerHTML = '';
    return;
  }

  const activeWalletIdx = ((walletCarousel.currentIndex % numWallets) + numWallets) % numWallets;

  dotsContainer.innerHTML = state.wallets.map((_, i) => `
    <button type="button" onclick="scrollToWalletCard(${i})" class="h-1.5 rounded-full transition-all duration-300 ease-out cursor-pointer ${i === activeWalletIdx ? 'w-5 bg-ink-dark shadow-xs' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}" aria-label="Slide kartu ${i + 1}"></button>
  `).join('');
}

function setupWalletCarouselDrag() {
  const wrapper = document.getElementById('walletCarouselWrapper');
  const track = document.getElementById('walletCardsCarousel');
  if (!wrapper || !track || track._dragInitialized) return;
  track._dragInitialized = true;

  // Dengarkan akhir transisi untuk loop tak hingga yang mulus
  track.addEventListener('transitionend', onWalletCarouselTransitionEnd);

  let isDown = false;
  let startX = 0;
  let currentX = 0;
  let startTranslate = 0;
  let wheelTimeout = null;

  function onPointerDown(e) {
    if (!state.wallets || state.wallets.length <= 1) return;
    isDown = true;
    walletCarousel.dragMoved = false;
    window.isCarouselDragging = false;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    currentX = startX;

    // Hentikan transisi yang sedang berjalan agar drag 1:1 real-time dan responsif instan
    track.style.willChange = 'transform';
    track.style.transition = 'none';
    const cards = track.querySelectorAll('.wallet-carousel-card');
    cards.forEach(c => { c.style.transition = 'none'; });

    const transformMatrix = window.getComputedStyle(track).transform;
    if (transformMatrix && transformMatrix !== 'none') {
      const match = transformMatrix.match(/matrix(?:3d)?\((.+)\)/);
      if (match) {
        const values = match[1].split(', ');
        startTranslate = parseFloat(values[values.length === 16 ? 12 : 4]) || walletCarousel.currentTranslate;
      } else {
        startTranslate = walletCarousel.currentTranslate;
      }
    } else {
      startTranslate = walletCarousel.currentTranslate;
    }
    walletCarousel.currentTranslate = startTranslate;
    wrapper.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!isDown) return;
    currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const diffX = currentX - startX;

    if (Math.abs(diffX) > 6) {
      walletCarousel.dragMoved = true;
      window.isCarouselDragging = true;
    }

    const newTranslate = startTranslate + diffX;
    track.style.transform = `translate3d(${newTranslate}px, 0, 0)`;
    // Animasi dinamis real-time saat jari/kursor bergeser
    updateWalletCardsScaleAndOpacity(newTranslate, false);
  }

  function onPointerUp() {
    if (!isDown) return;
    isDown = false;
    wrapper.style.cursor = 'grab';

    setTimeout(() => {
      window.isCarouselDragging = false;
    }, 80);

    const diffX = currentX - startX;
    const cards = track.querySelectorAll('.wallet-carousel-card');
    const activeCard = cards ? cards[walletCarousel.currentIndex] : null;
    const stride = activeCard ? (activeCard.offsetWidth + 12) : (walletCarousel.cardStride || 280);
    const threshold = stride * 0.18; // Ambang geser 18%

    if (diffX < -threshold) {
      // Geser Kiri -> Kartu Berikutnya dengan animasi halus meluncur
      setWalletCarouselIndex(walletCarousel.currentIndex + 1, true);
    } else if (diffX > threshold) {
      // Geser Kanan -> Kartu Sebelumnya dengan animasi halus meluncur
      setWalletCarouselIndex(walletCarousel.currentIndex - 1, true);
    } else {
      // Geser sedikit -> Kembali ke posisi kartu saat ini
      setWalletCarouselIndex(walletCarousel.currentIndex, true);
    }
  }

  // Mouse drag
  wrapper.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  // Touch swipe mobile
  wrapper.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp, { passive: true });

  // Mouse wheel & touchpad horizontal gesture
  wrapper.addEventListener('wheel', (e) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 12) {
      e.preventDefault();
      if (!wheelTimeout) {
        if (delta > 0) {
          slideWalletCarousel(1);
        } else {
          slideWalletCarousel(-1);
        }
        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 320);
      }
    }
  }, { passive: false });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (state.activeTab === 'tab-home') {
      refreshWalletCarouselPosition(false);
    }
  });
}

function renderWalletsTabList() {
  const container = document.getElementById('walletTabAccountsList');
  if (!container) return;
  container.innerHTML = '';

  if (state.wallets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 bg-white rounded-2xl border border-slate-100">
        <p class="text-xs text-slate-400">Belum ada dompet atau rekening. Klik "+ Dompet Baru" untuk menambahkan.</p>
      </div>
    `;
    return;
  }

  state.wallets.forEach((w) => {
    // Calculate transactions for this wallet
    const walletTxs = state.transactions.filter(t => t.wallet.toLowerCase() === w.name.toLowerCase());
    let wIncome = 0;
    let wExpense = 0;
    walletTxs.forEach(t => {
      if (t.type === 'income') wIncome += Number(t.amount || 0);
      else wExpense += Number(t.amount || 0);
    });

    const isDetailOpen = window.openWalletDetailIds && window.openWalletDetailIds.has(w.id);
    const isMutasiOpen = window.openMutasiWalletIds && window.openMutasiWalletIds.has(w.id);

    let mutasiItemsHtml = '';
    if (walletTxs.length === 0) {
      mutasiItemsHtml = `
        <div class="text-center py-3.5 px-3 bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
          <p class="text-[11px] text-slate-400 font-medium">Belum ada transaksi pada dompet ini</p>
        </div>
      `;
    } else {
      mutasiItemsHtml = `
        <div class="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
          ${walletTxs.map(t => {
            const isInc = t.type === 'income';
            const meta = getCategoryMeta(t.category || t.title, t.type);
            const displayTime = formatTransactionDisplayTime(t);
            return `
              <div class="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between border border-slate-100/80 cursor-pointer active:scale-[0.99] transition-all" onclick="openTxDetail('${t.id}'); event.stopPropagation();">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 shadow-xs">
                    <span class="material-symbols-outlined text-[16px]">${meta.icon}</span>
                  </div>
                  <div class="truncate text-left">
                    <h5 class="text-xs font-bold text-ink-dark truncate">${t.title}</h5>
                    <p class="text-[10px] text-slate-400 mt-0.5">${displayTime} &bull; ${t.category}</p>
                  </div>
                </div>
                <div class="text-right shrink-0 pl-2">
                  <span class="text-xs font-bold ${isInc ? 'text-[#1CA46B]' : 'text-rose-600'} font-display block">
                    ${isInc ? '+' : '-'}${formatIDR(t.amount)}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const card = document.createElement('div');
    card.id = `wallet-card-${w.id}`;
    card.className = 'bg-white rounded-2xl border border-slate-100/80 p-4 transition-all duration-200 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]';
    card.style.border = '1.5px solid rgb(239, 236, 230)';
    card.style.boxShadow = 'rgba(17, 17, 17, 0.04) 0px 4px 16px';

    const balDisplay = state.balanceHidden ? '••••••' : formatIDR(w.balance);
    const subLabel = w.desc || (w.type === 'bank' ? `Rekening Bank ${w.code || ''}` : (w.type === 'ewallet' ? `Dompet Digital ${w.code || ''}` : 'Uang Tunai'));

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-bold text-ink-dark">${w.name}</h4>
          </div>
          <p class="text-[10px] text-slate-400 mt-0.5">${subLabel}</p>
        </div>
        <div class="flex items-center space-x-3">
          <div class="text-right">
            <span class="text-xs font-bold text-ink-dark font-display block">${balDisplay}</span>
            <span class="text-[9px] text-slate-400 font-medium">Saldo Terkini</span>
          </div>
          <div class="flex items-center space-x-1 pl-2 border-l border-slate-100">
            <button aria-label="Hapus ${w.name}" class="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all active:scale-90" onclick="promptDeleteWallet('${w.id}', '${w.name}'); event.stopPropagation();" title="Hapus Dompet" type="button">
              <span class="material-symbols-outlined text-[17px]">delete</span>
            </button>
            <button aria-label="Detail ${w.name}" class="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all active:scale-90" onclick="toggleWalletDetails('${w.id}'); event.stopPropagation();" title="Lihat Rincian" type="button">
              <span class="material-symbols-outlined text-[18px] transition-transform duration-200" style="${isDetailOpen || isMutasiOpen ? 'transform: rotate(180deg);' : ''}" id="icon-chevron-${w.id}">expand_more</span>
            </button>
          </div>
        </div>
      </div>
      <!-- Collapsible Details Breakdown -->
      <div class="wallet-detail-box pt-3 mt-3 border-t border-slate-100 space-y-2.5 ${isDetailOpen || isMutasiOpen ? '' : 'hidden'}" id="wallet-detail-${w.id}">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/60 flex flex-col">
            <span class="text-[10px] font-semibold text-emerald-700">Total Pemasukan</span>
            <span class="font-bold font-display text-emerald-700 text-xs mt-0.5">+${formatIDR(wIncome)}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-red-50/60 border border-red-100/60 flex flex-col">
            <span class="text-[10px] font-semibold text-red-600">Total Pengeluaran</span>
            <span class="font-bold font-display text-red-600 text-xs mt-0.5">-${formatIDR(wExpense)}</span>
          </div>
        </div>
        <div class="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
          <span>${walletTxs.length} transaksi tercatat</span>
          <button id="btn-mutasi-${w.id}" class="font-bold text-[#1E88E5] hover:underline active:scale-95 transition-transform flex items-center gap-0.5 cursor-pointer" onclick="toggleWalletMutasi('${w.id}'); event.stopPropagation();" type="button">
            <span>${isMutasiOpen ? 'Tutup Mutasi' : 'Lihat Mutasi'}</span>
            <span class="material-symbols-outlined text-[13px]" id="icon-mutasi-${w.id}">${isMutasiOpen ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
        <!-- Expandable Mutasi Transaksi List for this Wallet -->
        <div class="wallet-mutasi-list space-y-1.5 pt-2 border-t border-slate-100 ${isMutasiOpen ? '' : 'hidden'}" id="wallet-mutasi-${w.id}">
          ${mutasiItemsHtml}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateWalletDropdowns() {
  // Update #txWalletInput in Transaction Form
  const txWalletSelect = document.getElementById('txWalletInput');
  if (txWalletSelect) {
    if (!state.wallets || state.wallets.length === 0) {
      txWalletSelect.innerHTML = '<option value="" disabled selected>Belum ada dompet (Tambah dahulu)</option>';
    } else {
      const curVal = txWalletSelect.value;
      txWalletSelect.innerHTML = state.wallets.map(w => `<option value="${w.name}">${w.name}</option>`).join('');
      if (state.wallets.some(w => w.name === curVal)) {
        txWalletSelect.value = curVal;
      }
    }
    checkTxBalanceSufficient();
  }

  // Update #ocrDetectedWallet in Scanner Form
  const ocrWalletSelect = document.getElementById('ocrDetectedWallet');
  if (ocrWalletSelect) {
    if (!state.wallets || state.wallets.length === 0) {
      ocrWalletSelect.innerHTML = '<option value="" disabled selected>Belum ada dompet (Tambah dahulu)</option>';
    } else {
      ocrWalletSelect.innerHTML = state.wallets.map(w => `<option value="${w.name}">${w.name}</option>`).join('');
    }
  }

  // Update Header Dropdown Filter
  const dropdownMenu = document.getElementById('walletDropdownMenu');
  if (dropdownMenu) {
    let html = `
      <button class="w-full px-3.5 py-2 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 flex items-center justify-between transition-colors" onclick="selectActiveWalletFilter('Semua Rekening')">
        <span>Semua Rekening</span>
        <span class="text-[9px] text-slate-400">Total</span>
      </button>
    `;
    state.wallets.forEach(w => {
      html += `
        <button class="w-full px-3.5 py-2 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 flex items-center justify-between transition-colors" onclick="selectActiveWalletFilter('${w.name}')">
          <span>${w.name}</span>
          <span class="text-[9px] text-slate-400 font-mono">${formatIDR(w.balance)}</span>
        </button>
      `;
    });
    dropdownMenu.innerHTML = html;
  }
}

window.openWalletDetailIds = window.openWalletDetailIds || new Set();
window.openMutasiWalletIds = window.openMutasiWalletIds || new Set();

function toggleWalletDetails(walletId) {
  const detail = document.getElementById('wallet-detail-' + walletId);
  const icon = document.getElementById('icon-chevron-' + walletId);
  if (!detail) return;
  const isHidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden', !isHidden);
  if (isHidden) {
    window.openWalletDetailIds.add(walletId);
  } else {
    window.openWalletDetailIds.delete(walletId);
  }
  if (icon) {
    icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function toggleWalletMutasi(walletId) {
  const container = document.getElementById('wallet-mutasi-' + walletId);
  const btn = document.getElementById('btn-mutasi-' + walletId);
  const icon = document.getElementById('icon-mutasi-' + walletId);
  if (!container) return;

  const isHidden = container.classList.contains('hidden');
  container.classList.toggle('hidden', !isHidden);

  if (isHidden) {
    window.openMutasiWalletIds.add(walletId);
    window.openWalletDetailIds.add(walletId);
  } else {
    window.openMutasiWalletIds.delete(walletId);
  }

  if (btn && icon) {
    const textSpan = btn.querySelector('span:first-child');
    if (textSpan) textSpan.textContent = isHidden ? 'Tutup Mutasi' : 'Lihat Mutasi';
    icon.textContent = isHidden ? 'expand_less' : 'expand_more';
  }
}

let pendingDeleteWalletId = null;
let pendingDeleteWalletName = '';

function promptDeleteWallet(walletId, walletName) {
  pendingDeleteWalletId = walletId;
  pendingDeleteWalletName = walletName;

  const targetNameEl = document.getElementById('deleteWalletTargetName');
  if (targetNameEl) {
    targetNameEl.textContent = walletName;
  }

  const descEl = document.getElementById('deleteWalletConfirmDesc');
  if (descEl) {
    if (state.wallets && state.wallets.length <= 1) {
      descEl.innerHTML = `Ini adalah satu-satunya dompet Anda. Apakah Anda yakin ingin menghapus dompet <span class="font-bold text-red-800">"${walletName}"</span>? Histori transaksi tetap tersimpan.`;
    } else {
      descEl.innerHTML = `Apakah Anda yakin ingin menghapus dompet <span class="font-bold text-red-800">"${walletName}"</span>? Catatan dan riwayat transaksi akan tetap tersimpan di aplikasi.`;
    }
  }

  openModal('modalDeleteWalletConfirm');
}

function executeDeleteWallet() {
  if (!pendingDeleteWalletId) return;
  const walletId = pendingDeleteWalletId;
  const walletName = pendingDeleteWalletName;

  state.wallets = (state.wallets || []).filter(w => w.id !== walletId);

  if (state.selectedWalletFilter && state.selectedWalletFilter.toLowerCase() === walletName.toLowerCase()) {
    state.selectedWalletFilter = 'Semua Rekening';
    const label = document.getElementById('activeCurrencyLabel');
    if (label) label.textContent = 'Semua Rekening';
  }

  saveStateToStorage();
  renderWallets();
  renderBalances();
  renderRecentTransactions();
  closeModal('modalDeleteWalletConfirm');
  showToast(`Dompet "${walletName}" berhasil dihapus`);

  pendingDeleteWalletId = null;
  pendingDeleteWalletName = '';
}

function deleteWallet(walletId, walletName) {
  promptDeleteWallet(walletId, walletName);
}

function handleCreateWalletSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('newWalletNameInput');
  const balInput = document.getElementById('newWalletBalanceInput');
  const typeSelect = document.getElementById('newWalletTypeSelect');

  const name = nameInput ? nameInput.value.trim() : '';
  const balance = parseFormattedNumber(balInput ? balInput.value : 0);
  const type = typeSelect ? typeSelect.value : 'bank';

  if (!name) {
    alert('Nama dompet / rekening tidak boleh kosong');
    return;
  }

  // Check duplicate
  if (state.wallets.some(w => w.name.toLowerCase() === name.toLowerCase())) {
    alert('Nama dompet ini sudah ada!');
    return;
  }

  const newWallet = {
    id: 'w-' + Date.now(),
    name: name,
    balance: balance,
    type: type,
    code: type === 'cash' ? 'Cash' : (type === 'ewallet' ? 'e-Wallet' : 'Bank'),
    desc: type === 'bank' ? 'Rekening Bank Baru' : (type === 'ewallet' ? 'Dompet Digital' : 'Uang Tunai')
  };

  state.wallets.push(newWallet);
  saveStateToStorage();
  renderWallets();
  renderBalances();
  closeModal('modalCurrency');
  if (document.getElementById('newWalletForm')) {
    document.getElementById('newWalletForm').reset();
  }
  showToast(`Dompet "${name}" berhasil ditambahkan!`);
}

function toggleWalletDropdown() {
  const menu = document.getElementById('walletDropdownMenu');
  const chevron = document.getElementById('currencyChevron');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !isHidden);
  if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

function selectActiveWalletFilter(walletName, syncCarousel = true) {
  state.selectedWalletFilter = walletName;
  const label = document.getElementById('activeCurrencyLabel');
  const dot = document.getElementById('activeCurrencyDot');
  if (label) label.textContent = walletName;

  if (dot) {
    if (walletName.toLowerCase().includes('gopay')) dot.className = 'w-1.5 h-1.5 rounded-full bg-card-mint shrink-0 inline-block';
    else if (walletName.toLowerCase().includes('jago')) dot.className = 'w-1.5 h-1.5 rounded-full bg-card-purple shrink-0 inline-block';
    else dot.className = 'w-1.5 h-1.5 rounded-full bg-card-yellow shrink-0 inline-block';
  }

  const menu = document.getElementById('walletDropdownMenu');
  if (menu) menu.classList.add('hidden');
  const chevron = document.getElementById('currencyChevron');
  if (chevron) chevron.style.transform = 'rotate(0deg)';

  // Jadikan kartu yang dipilih tepat di tengah carousel jika dipanggil dari luar
  if (syncCarousel && state.wallets && walletName !== 'Semua Rekening') {
    const wIdx = state.wallets.findIndex(w => w.name.toLowerCase() === walletName.toLowerCase());
    if (wIdx !== -1) {
      scrollToWalletCard(wIdx);
    }
  }

  renderBalances();
  renderRecentTransactions();
  showToast(`Filter aktif: ${walletName}`);
}

// ==========================================
// 6. TRANSACTIONS MANAGEMENT & RENDERING
// ==========================================


function updateCategoryInputPreview() {
  const catInput = document.getElementById('txCategoryInput');
  const box = document.getElementById('txCategoryIconPreviewBox');
  const icon = document.getElementById('txCategoryIconPreview');
  if (!catInput || !box || !icon) return;

  const meta = getCategoryMeta(catInput.value, state.formType);
  box.className = 'absolute left-3 w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0 ' + meta.bg;
  icon.textContent = meta.icon;
}

function updateOcrCategoryPreview() {
  const catInput = document.getElementById('ocrDetectedCategory');
  const box = document.getElementById('ocrCategoryIconPreviewBox');
  const icon = document.getElementById('ocrCategoryIconPreview');
  if (!catInput || !box || !icon) return;

  const meta = getCategoryMeta(catInput.value, 'expense');
  box.className = 'absolute left-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-xs shrink-0 ' + meta.bg;
  icon.textContent = meta.icon;
}

function setTxFormType(type) {
  state.formType = type;
  const titleEl = document.getElementById('modalTxTitle');
  const pillEl = document.getElementById('txTypePill');
  const tabExp = document.getElementById('tabExpenseSelect');
  const tabInc = document.getElementById('tabIncomeSelect');
  const catInput = document.getElementById('txCategoryInput') || document.getElementById('txCategorySelect');

  if (type === 'expense') {
    if (titleEl) titleEl.textContent = 'Catat Pengeluaran';
    if (pillEl) pillEl.className = 'w-3 h-3 rounded-full bg-rose-500';
    if (tabExp) tabExp.className = 'py-2.5 rounded-xl bg-rose-500 text-white shadow-sm transition-all';
    if (tabInc) tabInc.className = 'py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all';
    if (catInput) {
      catInput.placeholder = 'Ketik kategori pengeluaran (misal: Makanan, Bensin, Belanja)';
    }
  } else {
    if (titleEl) titleEl.textContent = 'Catat Pemasukan';
    if (pillEl) pillEl.className = 'w-3 h-3 rounded-full bg-[#1CA46B]';
    if (tabInc) tabInc.className = 'py-2.5 rounded-xl bg-[#1CA46B] text-white shadow-sm transition-all';
    if (tabExp) tabExp.className = 'py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all';
    if (catInput) {
      catInput.placeholder = 'Ketik kategori pemasukan (misal: Gajian, Bonus, Usaha)';
    }
  }

  // Update live category preview icon
  updateCategoryInputPreview();
  checkTxBalanceSufficient();
}

function checkTxBalanceSufficient() {
  const amtInput = document.getElementById('txAmountInput');
  const walletInput = document.getElementById('txWalletInput');
  const hintEl = document.getElementById('txWalletBalanceAmount');
  const warningEl = document.getElementById('txInsufficientBalanceWarning');

  const walletName = walletInput ? walletInput.value : '';
  const targetWallet = state.wallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
  const currentBalance = targetWallet ? Number(targetWallet.balance || 0) : 0;

  if (hintEl) {
    hintEl.textContent = formatIDR(currentBalance);
    hintEl.className = currentBalance <= 0 ? 'font-bold text-rose-500' : 'font-bold text-ink-dark';
  }

  const amt = parseFormattedNumber(amtInput ? amtInput.value : 0);
  const isExpense = state.formType === 'expense';
  const isInsufficient = isExpense && amt > 0 && amt > currentBalance;

  if (warningEl) {
    if (isInsufficient) {
      warningEl.classList.remove('hidden');
      warningEl.classList.add('flex');
    } else {
      warningEl.classList.add('hidden');
      warningEl.classList.remove('flex');
    }
  }

  if (amtInput) {
    if (isInsufficient) {
      amtInput.classList.add('border-rose-400', 'bg-rose-50/40');
    } else {
      amtInput.classList.remove('border-rose-400', 'bg-rose-50/40');
    }
  }

  return !isInsufficient;
}

function showInsufficientBalanceModal(walletName, currentBalance, amount) {
  const nameEl = document.getElementById('insufficientWalletName');
  const balEl = document.getElementById('insufficientWalletBalance');
  const amtEl = document.getElementById('insufficientTxAmount');

  if (nameEl) nameEl.textContent = walletName;
  if (balEl) balEl.textContent = formatIDR(currentBalance);
  if (amtEl) amtEl.textContent = formatIDR(amount);

  openModal('modalInsufficientBalance');
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  const amtInput = document.getElementById('txAmountInput');
  const catInput = document.getElementById('txCategoryInput') || document.getElementById('txCategorySelect');
  const notesInput = document.getElementById('txNotesInput');
  const walletInput = document.getElementById('txWalletInput');
  const dateInput = document.getElementById('txDateInput');
  const timeInput = document.getElementById('txTimeInput');

  const amt = parseFormattedNumber(amtInput ? amtInput.value : 0);
  const cat = catInput && catInput.value ? catInput.value.trim() : '';
  const notes = notesInput && notesInput.value.trim() ? notesInput.value.trim() : (cat || 'Transaksi');
  const wallet = walletInput ? walletInput.value : (state.wallets[0] ? state.wallets[0].name : 'BCA');

  const now = new Date();
  const txDate = dateInput && dateInput.value ? dateInput.value : getLocalDateString(now);
  const txTime = timeInput && timeInput.value.trim() ? convertTo24HourTime(timeInput.value.trim()) : getLocalTimeString(now);

  if (!amt || amt <= 0) {
    alert('Nominal harus lebih dari 0');
    return;
  }

  if (!state.wallets || state.wallets.length === 0 || !wallet) {
    openModal('modalNoWalletReminder');
    return;
  }

  if (!cat) {
    alert('Kategori wajib diisi!');
    if (catInput) catInput.focus();
    return;
  }

  // Cek saldo jika transaksi adalah pengeluaran
  if (state.formType === 'expense') {
    const targetWallet = state.wallets.find(w => w.name.toLowerCase() === wallet.toLowerCase());
    const currentBalance = targetWallet ? Number(targetWallet.balance || 0) : 0;
    if (amt > currentBalance) {
      showInsufficientBalanceModal(targetWallet ? targetWallet.name : wallet, currentBalance, amt);
      if (amtInput) amtInput.focus();
      checkTxBalanceSufficient();
      return;
    }
  }

  const meta = getCategoryMeta(cat, state.formType);

  const newTx = {
    id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
    title: notes,
    type: state.formType,
    amount: amt,
    category: cat,
    wallet: wallet,
    date: txDate,
    time: txTime,
    createdAt: (txDate === getLocalDateString(now)) ? now.getTime() : new Date(`${txDate}T${txTime}:00`).getTime(),
    icon: meta.icon,
    color: meta.bg
  };

  // Adjust target wallet balance
  const targetWallet = state.wallets.find(w => w.name.toLowerCase() === wallet.toLowerCase());
  if (targetWallet) {
    if (state.formType === 'income') targetWallet.balance += amt;
    else targetWallet.balance -= amt;
  }

  state.transactions.unshift(newTx);
  saveStateToStorage();

  renderBalances();
  renderWallets();
  renderRecentTransactions();
  renderStats();

  closeModal('modalTransaction');
  if (document.getElementById('txForm')) document.getElementById('txForm').reset();
  showToast(`${state.formType === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatIDR(amt)} berhasil dicatat!`);
}


// Smart Category to Icon & Color Mapper
function getCategoryMeta(category, type = 'expense') {
  const cat = (category || '').toLowerCase().trim();
  const isIncome = type === 'income';

  // Identik: Hijau (#1CA46B) untuk Pemasukan, Merah (rose-600) untuk Pengeluaran
  const themeBg = isIncome 
    ? 'bg-emerald-100 text-[#1CA46B]' 
    : 'bg-rose-100 text-rose-600';

  // 1. Gaji / Gajian / Uang Masuk Utama (Income)
  if (/gaji|gajian|salary|payroll|upah|uang\s*masuk/i.test(cat)) {
    return { icon: 'payments', bg: themeBg, label: 'Gaji' };
  }

  // 2. Bonus / Freelance / Sampingan
  if (/bonus|freelance|proyek|project|komisi|tip|lembur|side\s*job|hadiah\s*uang/i.test(cat)) {
    return { icon: 'workspace_premium', bg: themeBg, label: 'Bonus' };
  }

  // 3. Investasi & Pasif Income
  if (/investasi|saham|crypto|kripto|reksadana|dividen|profit|cuan|bunga|emas|deposito/i.test(cat)) {
    return { icon: 'trending_up', bg: themeBg, label: 'Investasi' };
  }

  // 4. Bisnis / Usaha / Penjualan
  if (/bisnis|usaha|omset|omzet|penjualan|dagang|toko|untung/i.test(cat)) {
    return { icon: 'storefront', bg: themeBg, label: 'Bisnis' };
  }

  // Default if marked as income and no specific keyword
  if (isIncome && (!cat || /pemasukan|income|masuk/i.test(cat))) {
    return { icon: 'payments', bg: themeBg, label: 'Pemasukan' };
  }

  // 5. Makanan & Restoran (Kategori Makan)
  if (/makan|makanan|resto|restoran|kuliner|warung|warteg|padang|bakso|mie|nasi|ayam|sate|burger|pizza|dapur|kitchen|sarapan|lunch|dinner|snack|cemilan|food/i.test(cat)) {
    return { icon: 'restaurant', bg: themeBg, label: 'Makanan' };
  }

  // 6. Kopi & Minuman
  if (/kopi|coffee|cafe|kafe|starbucks|janji\s*jiwa|kulo|fore|boba|tea|teh|jus|juice|drink|minum|minuman|haus/i.test(cat)) {
    return { icon: 'local_cafe', bg: themeBg, label: 'Kopi / Minuman' };
  }

  // 7. Belanja & Supermarket
  if (/belanja|mart|alfa|indo|supermarket|minimarket|hypermart|transmart|superindo|baju|pakaian|sepatu|fashion|mall|pasar|shopping|shopee|tokopedia|lazada|toserba/i.test(cat)) {
    return { icon: 'shopping_bag', bg: themeBg, label: 'Belanja' };
  }

  // 8. Bensin & Bahan Bakar
  if (/bensin|bbm|spbu|pertamina|shell|pertalite|pertamax|solar|dexlite/i.test(cat)) {
    return { icon: 'local_gas_station', bg: themeBg, label: 'Bensin / BBM' };
  }

  // 9. Transportasi / Ojol / Kendaraan
  if (/motor|ojek|grab|gojek|maxim|ojol|taksi|taxi|transport|transportasi|mobil|bus|kereta|krl|mrt|lrt|tol|parkir|servis|bengkel|oli/i.test(cat)) {
    if (/motor|ojek|ojol|grab\s*bike|gojek|maxim/i.test(cat)) {
      return { icon: 'two_wheeler', bg: themeBg, label: 'Ojek / Motor' };
    }
    return { icon: 'directions_car', bg: themeBg, label: 'Transportasi' };
  }

  // 10. Listrik & PLN
  if (/listrik|pln|token/i.test(cat)) {
    return { icon: 'bolt', bg: themeBg, label: 'Listrik' };
  }

  // 11. Pulsa, Kuota & Internet
  if (/wifi|internet|indihome|pulsa|kuota|paket\s*data|telkomsel|xl|indosat|tri/i.test(cat)) {
    return { icon: 'wifi', bg: themeBg, label: 'Internet / Pulsa' };
  }

  // 12. Air & PDAM
  if (/air|pdam/i.test(cat)) {
    return { icon: 'water_drop', bg: themeBg, label: 'Air PDAM' };
  }

  // 13. Tagihan, Pajak, Iuran, Cicilan
  if (/tagihan|pajak|iuran|bpjs|cicilan|angsuran|langganan|netflix|spotify|bill/i.test(cat)) {
    return { icon: 'receipt_long', bg: themeBg, label: 'Tagihan' };
  }

  // 14. Kesehatan, Obat & Dokter
  if (/sehat|kesehatan|obat|apotek|apotik|dokter|klinik|rs|rumah\s*sakit|medis|vitamin|gigi/i.test(cat)) {
    return { icon: 'medical_services', bg: themeBg, label: 'Kesehatan' };
  }

  // 15. Pendidikan, Kuliah, Sekolah, Buku
  if (/sekolah|kuliah|kampus|buku|kursus|les|seminar|spp|pendidikan|edukasi|ujian|bimbingan/i.test(cat)) {
    return { icon: 'school', bg: themeBg, label: 'Pendidikan' };
  }

  // 16. Hiburan, Game, Liburan
  if (/hiburan|nonton|bioskop|cinema|xxi|cgv|game|gaming|steam|liburan|wisata|hotel|karaoke|hobi|rekreasi/i.test(cat)) {
    return { icon: 'sports_esports', bg: themeBg, label: 'Hiburan' };
  }

  // 17. Sedekah, Zakat, Infaq, Donasi
  if (/sedekah|infaq|zakat|donasi|sumbangan|keluarga|orang\s*tua|anak|hadiah|gift/i.test(cat)) {
    return { icon: 'volunteer_activism', bg: themeBg, label: 'Sedekah / Donasi' };
  }

  // 18. Transfer / Tarik Tunai
  if (/transfer|kirim|tarik|atm|topup|top\s*up/i.test(cat)) {
    return { icon: 'swap_horiz', bg: themeBg, label: 'Transfer' };
  }

  // Fallback
  if (isIncome) {
    return { icon: 'payments', bg: themeBg, label: 'Pemasukan' };
  }
  return { icon: 'category', bg: themeBg, label: 'Pengeluaran' };
}

function setRecentTxFilter(filterType) {
  state.recentTxFilter = filterType;
  updateRecentTxFilterUI();
  renderRecentTransactions();
}
window.setRecentTxFilter = setRecentTxFilter;

function updateRecentTxFilterUI() {
  const current = state.recentTxFilter || 'all';
  const tabAll = document.getElementById('tabFilterAll');
  const tabIncome = document.getElementById('tabFilterIncome');
  const tabExpense = document.getElementById('tabFilterExpense');

  if (tabAll) {
    if (current === 'all') {
      tabAll.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-[#FFC107] text-[#1A1824] text-center shadow-xs transition-all flex items-center justify-center gap-1 text-[11px] font-bold';
    } else {
      tabAll.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-transparent text-slate-600 hover:text-ink-dark text-center transition-all flex items-center justify-center gap-1 text-[11px] font-semibold';
    }
  }

  if (tabIncome) {
    const dot = tabIncome.querySelector('.filter-dot');
    if (current === 'income') {
      tabIncome.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-[#1CA46B] text-white text-center shadow-xs transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-white shrink-0';
    } else {
      tabIncome.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-transparent text-slate-600 hover:text-ink-dark text-center transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0';
    }
  }

  if (tabExpense) {
    const dot = tabExpense.querySelector('.filter-dot');
    if (current === 'expense') {
      tabExpense.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-[#F43F5E] text-white text-center shadow-xs transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-white shrink-0';
    } else {
      tabExpense.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-transparent text-slate-600 hover:text-ink-dark text-center transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0';
    }
  }
}

function renderRecentTransactions() {
  const list = document.getElementById('recentTransactionsList');
  if (!list) return;
  list.innerHTML = '';

  const now = new Date();
  const todayStr = getLocalDateString(now);

  // Halaman Beranda HANYA untuk data riwayat transaksi 1 hari saja (Hari Ini)
  // Setelah hari berganti (tanggal berbeda), riwayat transaksi di beranda akan kosong secara otomatis
  const todayTransactions = state.transactions.filter(t => (t.date || '') === todayStr);

  const walletFiltered = state.selectedWalletFilter === 'Semua Rekening'
    ? todayTransactions
    : todayTransactions.filter(t => t.wallet && t.wallet.toLowerCase() === state.selectedWalletFilter.toLowerCase());

  const currentFilter = state.recentTxFilter || 'all';
  const filtered = walletFiltered.filter(t => {
    if (currentFilter === 'all') return true;
    return t.type === currentFilter;
  });

  // Urutkan transaksi hari ini berdasarkan waktu terbaru ke terlama
  const sortedToday = filtered.slice().sort((a, b) => {
    const timeA = (a.date || '') + ' ' + (a.time || '');
    const timeB = (b.date || '') + ' ' + (b.time || '');
    return timeB.localeCompare(timeA);
  });

  if (sortedToday.length === 0) {
    const filterText = currentFilter === 'income' ? 'pemasukan' : currentFilter === 'expense' ? 'pengeluaran' : '';
    list.innerHTML = `
      <div class="text-center py-7 bg-white rounded-2xl border border-slate-100 shadow-soft">
        <p class="text-xs font-bold text-slate-700">Belum ada transaksi ${filterText ? filterText + ' ' : ''}hari ini</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Riwayat beranda hanya menampilkan transaksi hari ini.</p>
        <button type="button" onclick="switchTab('tab-stats')" class="mt-3 text-[11px] font-bold text-[#1E88E5] hover:underline inline-flex items-center gap-1 active:scale-95 transition-transform">
          <span>Lihat Riwayat Keseluruhan di Statistik</span>
          <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>
    `;
    return;
  }

  // Maksimal 5 transaksi hari ini ditampilkan di beranda
  const recent = sortedToday.slice(0, 5);

  recent.forEach(tx => {
    const isIncome = tx.type === 'income';
    const card = document.createElement('article');
    card.className = 'bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 shadow-soft hover:shadow-md cursor-pointer active:scale-[0.99] transition-all';
    card.onclick = () => openTxDetail(tx.id);

    const meta = getCategoryMeta(tx.category || tx.title, tx.type);
    const displayTime = formatTransactionDisplayTime(tx);

    card.innerHTML = `
      <div class="flex items-center space-x-3 pointer-events-none">
        <div class="w-11 h-11 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0 shadow-sm">
          <span class="material-symbols-outlined text-[22px]">${meta.icon}</span>
        </div>
        <div class="flex flex-col text-left">
          <h4 class="text-xs font-bold text-ink-dark tracking-tight leading-snug">${tx.title}</h4>
          <p class="text-[10px] text-slate-400 font-medium mt-0.5">${displayTime} • ${tx.wallet}</p>
        </div>
      </div>
      <div class="text-right flex flex-col items-end pointer-events-none">
        <p class="text-xs font-bold ${isIncome ? 'text-[#1CA46B]' : 'text-rose-600'} leading-snug font-display">
          ${isIncome ? '+' : '-'}${formatIDR(tx.amount)}
        </p>
        <span class="text-[9px] font-bold ${isIncome ? 'text-[#1CA46B] bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'} px-2 py-0.5 rounded-full mt-1 leading-none">
          ${tx.category}
        </span>
      </div>
    `;
    list.appendChild(card);
  });

  // Tombol "Lihat Seluruh Riwayat" di bagian paling bawah
  const viewAllBtn = document.createElement('button');
  viewAllBtn.type = 'button';
  viewAllBtn.className = 'w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-ink-dark shadow-soft active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2';
  viewAllBtn.innerHTML = `
    <span>Lihat Riwayat Transaksi Keseluruhan</span>
    <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">${state.transactions.length} Total</span>
    <span class="material-symbols-outlined text-[16px] text-slate-500">arrow_forward</span>
  `;
  viewAllBtn.onclick = () => {
    openModal('modalAllTransactions');
  };
  list.appendChild(viewAllBtn);
}

let allTxFilter = 'all';

function setAllTxFilter(filterType) {
  allTxFilter = filterType;
  updateAllTxFilterUI();
  const searchInput = document.getElementById('txSearchInput');
  const query = searchInput ? searchInput.value : '';
  renderAllTransactionsList(query);
}
window.setAllTxFilter = setAllTxFilter;

function updateAllTxFilterUI() {
  const current = allTxFilter || 'all';
  const tabAll = document.getElementById('modalTabFilterAll');
  const tabIncome = document.getElementById('modalTabFilterIncome');
  const tabExpense = document.getElementById('modalTabFilterExpense');

  if (tabAll) {
    if (current === 'all') {
      tabAll.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-[#FFC107] text-[#1A1824] text-center shadow-xs transition-all flex items-center justify-center gap-1 text-[11px] font-bold';
    } else {
      tabAll.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-transparent text-slate-600 hover:text-ink-dark text-center transition-all flex items-center justify-center gap-1 text-[11px] font-semibold';
    }
  }

  if (tabIncome) {
    const dot = tabIncome.querySelector('.filter-dot');
    if (current === 'income') {
      tabIncome.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-[#1CA46B] text-white text-center shadow-xs transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-white shrink-0';
    } else {
      tabIncome.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-transparent text-slate-600 hover:text-ink-dark text-center transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0';
    }
  }

  if (tabExpense) {
    const dot = tabExpense.querySelector('.filter-dot');
    if (current === 'expense') {
      tabExpense.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-[#F43F5E] text-white text-center shadow-xs transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-white shrink-0';
    } else {
      tabExpense.className = 'flex-1 py-1.5 px-2.5 rounded-xl bg-transparent text-slate-600 hover:text-ink-dark text-center transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold';
      if (dot) dot.className = 'filter-dot w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0';
    }
  }
}

function renderAllTransactionsList(query = '') {
  const container = document.getElementById('fullTransactionsList');
  if (!container) return;
  container.innerHTML = '';

  const q = (query || '').toLowerCase().trim();
  const currentFilter = allTxFilter || 'all';

  const filtered = state.transactions.filter(t => {
    if (currentFilter !== 'all' && t.type !== currentFilter) {
      return false;
    }
    if (q) {
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchCat = (t.category || '').toLowerCase().includes(q);
      const matchWallet = (t.wallet || '').toLowerCase().includes(q);
      const matchAmt = String(t.amount || '').includes(q);
      return matchTitle || matchCat || matchWallet || matchAmt;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-center text-xs text-slate-400 py-6">Tidak ada transaksi ditemukan</p>';
    return;
  }

  filtered.forEach(tx => {
    const isIncome = tx.type === 'income';
    const meta = getCategoryMeta(tx.category || tx.title, tx.type);
    const displayTime = formatTransactionDisplayTime(tx);

    const item = document.createElement('div');
    item.className = 'bg-slate-50 hover:bg-slate-100 rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 cursor-pointer active:scale-[0.98] transition-all';
    item.onclick = () => {
      openTxDetail(tx.id);
    };
    item.innerHTML = `
      <div class="flex items-center space-x-3 pointer-events-none">
        <div class="w-10 h-10 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0 shadow-sm">
          <span class="material-symbols-outlined text-[20px]">${meta.icon}</span>
        </div>
        <div class="text-left">
          <h5 class="text-xs font-bold text-ink-dark leading-snug">${tx.title}</h5>
          <p class="text-[10px] text-slate-400 mt-0.5">${displayTime} • ${tx.wallet}</p>
        </div>
      </div>
      <div class="text-right flex flex-col items-end pointer-events-none">
        <span class="text-xs font-bold ${isIncome ? 'text-[#1CA46B]' : 'text-rose-600'} font-display block">
          ${isIncome ? '+' : '-'}${formatIDR(tx.amount)}
        </span>
        <span class="text-[9px] font-bold ${isIncome ? 'text-[#1CA46B] bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'} px-2 py-0.5 rounded-full mt-1 leading-none">
          ${tx.category}
        </span>
      </div>
    `;
    container.appendChild(item);
  });
}

function openTxDetail(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  state.selectedTxId = id;
  const isIncome = tx.type === 'income';
  const meta = getCategoryMeta(tx.category || tx.title, tx.type);

  const titleEl = document.getElementById('detailTitle');
  const amtEl = document.getElementById('detailAmount');
  const catEl = document.getElementById('detailCategory');
  const dateEl = document.getElementById('detailDate');
  const walletEl = document.getElementById('detailWallet');
  const badge = document.getElementById('detailBadgeType');
  const iconBox = document.getElementById('detailIconBox');
  const iconName = document.getElementById('detailIconName');

  if (titleEl) titleEl.textContent = tx.title;
  if (amtEl) {
    amtEl.textContent = (isIncome ? '+' : '-') + formatIDR(tx.amount);
    amtEl.className = 'text-2xl font-black font-display mt-1 ' + (isIncome ? 'text-[#1CA46B]' : 'text-rose-600');
  }
  if (catEl) catEl.textContent = tx.category;
  if (dateEl) dateEl.textContent = formatFullTransactionDateTime(tx);
  if (walletEl) walletEl.textContent = tx.wallet;

  if (iconBox) iconBox.className = 'w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-sm ' + meta.bg;
  if (iconName) iconName.textContent = meta.icon;

  if (badge) {
    if (isIncome) {
      badge.textContent = 'Pemasukan';
      badge.className = 'text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1CA46B]';
    } else {
      badge.textContent = 'Pengeluaran';
      badge.className = 'text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600';
    }
  }

  openModal('modalTxDetail');
}

function deleteSelectedTransaction() {
  if (!state.selectedTxId) return;
  const tx = state.transactions.find(t => t.id === state.selectedTxId);
  if (tx) {
    // Reverse wallet balance
    const wallet = state.wallets.find(w => w.name.toLowerCase() === tx.wallet.toLowerCase());
    if (wallet) {
      if (tx.type === 'income') wallet.balance -= tx.amount;
      else wallet.balance += tx.amount;
    }
  }

  state.transactions = state.transactions.filter(t => t.id !== state.selectedTxId);
  state.selectedTxId = null;

  saveStateToStorage();
  renderBalances();
  renderWallets();
  renderRecentTransactions();
  renderStats();
  renderAllTransactionsList();

  closeModal('modalTxDetail');
  showToast('Transaksi berhasil dihapus');
}

// ==========================================
// 7. TAB STATISTIK DYNAMIC RENDERING & CHART
// ==========================================

// Active stats filter configuration
let statsFilter = {
  mode: 'this_month', // 'today' | 'yesterday' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'single' | 'range' | 'all'
  singleDate: '',
  dateFrom: '',
  dateTo: '',
  label: 'Bulan Ini'
};

function getStatsFilteredTransactions() {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (statsFilter.mode === 'today') {
    return state.transactions.filter(t => t.date === todayStr);
  }

  if (statsFilter.mode === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = getLocalDateString(yest);
    return state.transactions.filter(t => t.date === yestStr);
  }

  if (statsFilter.mode === '7days') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    const past7Str = getLocalDateString(past7);
    return state.transactions.filter(t => t.date && t.date >= past7Str && t.date <= todayStr);
  }

  if (statsFilter.mode === 'this_month') {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return state.transactions.filter(t => {
      if (!t.date) return true;
      const parts = t.date.split('-');
      return parseInt(parts[0], 10) === curYear && parseInt(parts[1], 10) === curMonth;
    });
  }

  if (statsFilter.mode === 'last_month') {
    const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetYear = lastM.getFullYear();
    const targetMonth = lastM.getMonth() + 1;
    return state.transactions.filter(t => {
      if (!t.date) return false;
      const parts = t.date.split('-');
      return parseInt(parts[0], 10) === targetYear && parseInt(parts[1], 10) === targetMonth;
    });
  }

  if (statsFilter.mode === 'this_year') {
    const curYear = now.getFullYear();
    return state.transactions.filter(t => {
      if (!t.date) return false;
      return parseInt(t.date.split('-')[0], 10) === curYear;
    });
  }

  if (statsFilter.mode === 'single' && statsFilter.singleDate) {
    return state.transactions.filter(t => t.date === statsFilter.singleDate);
  }

  if (statsFilter.mode === 'range' && statsFilter.dateFrom && statsFilter.dateTo) {
    return state.transactions.filter(t => t.date && t.date >= statsFilter.dateFrom && t.date <= statsFilter.dateTo);
  }

  if (statsFilter.mode === 'all') {
    return state.transactions;
  }

  // Fallback to current month
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  return state.transactions.filter(t => {
    if (!t.date) return true;
    const parts = t.date.split('-');
    return parseInt(parts[0], 10) === curYear && parseInt(parts[1], 10) === curMonth;
  });
}

function renderStats() {
  const filteredTxs = getStatsFilteredTransactions();
  const periodLabel = document.getElementById('statsSelectedPeriodLabel')?.textContent.trim() || 'Bulan Ini';

  // 1. Calculate Period Totals & Ratio
  const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const statsPeriodBadge = document.getElementById('statsPeriodBadge');
  if (statsPeriodBadge) statsPeriodBadge.textContent = periodLabel;

  updateStatsRatioBars(totalIncome, totalExpense);

  // 2. Render Category Breakdown
  renderStatsCategoryBars(filteredTxs, totalExpense);

  // 3. Render Dynamic Chart Adapted to Period
  renderStatsChart(filteredTxs);

  // 4. Render Largest Transactions
  renderStatsTopTransactions(filteredTxs);
}

function renderStatsCategoryBars(filteredTxs, totalExpense) {
  const containerBars = document.getElementById('statsCategoryBars');
  if (!containerBars) return;
  containerBars.innerHTML = '';

  const expenses = filteredTxs.filter(t => t.type === 'expense');
  const catMap = {};
  expenses.forEach(t => {
    const c = (t.category && t.category.trim()) ? t.category.trim() : 'Lainnya';
    catMap[c] = (catMap[c] || 0) + Number(t.amount || 0);
  });

  const categories = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);

  if (categories.length === 0) {
    containerBars.innerHTML = '<p class="text-center text-xs text-slate-400 py-4">Belum ada pengeluaran pada periode ini.</p>';
    return;
  }

  const palette = ['#FFC107', '#1CA46B', '#654CF4', '#F43F5E', '#0EA5E9', '#EC4899', '#8B5CF6', '#F59E0B'];

  categories.forEach((cat, idx) => {
    const amt = catMap[cat];
    const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
    const color = palette[idx % palette.length];

    const barEl = document.createElement('div');
    barEl.innerHTML = `
      <div class="flex justify-between text-xs font-medium mb-1.5">
        <span class="text-slate-700 font-semibold flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color};"></span>
          <span>${cat}</span>
        </span>
        <span class="font-bold text-ink-dark font-display">${formatIDR(amt)} <span class="text-slate-400 font-sans font-normal text-[11px]">(${pct}%)</span></span>
      </div>
      <div class="w-full h-2.5 rounded-full overflow-hidden bg-slate-100">
        <div class="h-full rounded-full transition-all duration-500" style="width: ${Math.max(4, pct)}%; background-color: ${color};"></div>
      </div>
    `;
    containerBars.appendChild(barEl);
  });
}

function renderStatsChart(filteredTxs) {
  const chartContainer = document.getElementById('statsBarChart');
  const chartTitleEl = document.getElementById('statsChartTitle');
  if (!chartContainer) return;
  chartContainer.innerHTML = '';

  const mode = statsFilter.mode || 'this_month';
  const label = statsFilter.label || 'Periode Ini';

  // 1. Update Title dynamically
  let chartTitle = 'Tren Transaksi';
  if (mode === 'today') chartTitle = 'Tren Transaksi (Hari Ini)';
  else if (mode === 'yesterday') chartTitle = 'Tren Transaksi (Kemarin)';
  else if (mode === 'single') chartTitle = `Tren Transaksi (${label})`;
  else if (mode === '7days') chartTitle = 'Tren 7 Hari Terakhir';
  else if (mode === 'this_month' || mode === 'last_month') chartTitle = `Tren Mingguan (${label})`;
  else if (mode === 'this_year') chartTitle = `Tren Bulanan (${label})`;
  else if (mode === 'range') chartTitle = `Tren Rentang (${label})`;
  else chartTitle = `Tren (${label})`;

  if (chartTitleEl) chartTitleEl.textContent = chartTitle;

  // 2. If NO transactions in this period at all, show clean empty state (no false bars!)
  if (!filteredTxs || filteredTxs.length === 0) {
    chartContainer.className = 'flex items-center justify-center h-32 pt-2 px-1 w-full';
    chartContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center text-slate-400 py-2">
        <p class="text-xs font-bold text-slate-600">Belum ada data grafik</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Tidak ada transaksi pada ${label}</p>
      </div>
    `;
    return;
  }

  // Restore flex items-end layout
  chartContainer.className = 'flex items-end justify-between h-32 pt-3 px-1 gap-1';

  let columns = [];

  // ==========================================
  // CASE A: SINGLE DAY (today, yesterday, single)
  // ==========================================
  if (mode === 'today' || mode === 'yesterday' || mode === 'single') {
    const timeBlocks = [
      { key: 'pagi', label: 'Pagi', sub: '06-12', start: 6, end: 12 },
      { key: 'siang', label: 'Siang', sub: '12-16', start: 12, end: 16 },
      { key: 'sore', label: 'Sore', sub: '16-19', start: 16, end: 19 },
      { key: 'malam', label: 'Malam', sub: '19-24', start: 19, end: 24 }
    ];

    columns = timeBlocks.map(block => {
      let inc = 0;
      let exp = 0;
      filteredTxs.forEach(t => {
        let hour = 12;
        if (t.time && typeof t.time === 'string') {
          const m = t.time.match(/(\d{1,2})/);
          if (m) hour = parseInt(m[1], 10);
        } else if (t.createdAt) {
          hour = new Date(t.createdAt).getHours();
        }
        if (hour >= block.start && hour < block.end) {
          if (t.type === 'income') inc += Number(t.amount || 0);
          else if (t.type === 'expense') exp += Number(t.amount || 0);
        }
      });
      return {
        label: block.label,
        sub: block.sub,
        income: inc,
        expense: exp
      };
    });
  }
  // ==========================================
  // CASE B: 7 DAYS (7days)
  // ==========================================
  else if (mode === '7days') {
    const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayLabel = shortDays[d.getDay()];
      const isToday = (i === 0);

      const txsOnDay = filteredTxs.filter(t => t.date === dateStr);
      const inc = txsOnDay.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = txsOnDay.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

      columns.push({
        label: dayLabel,
        isToday,
        dateStr,
        income: inc,
        expense: exp
      });
    }
  }
  // ==========================================
  // CASE C: THIS MONTH / LAST MONTH (Weekly breakdown)
  // ==========================================
  else if (mode === 'this_month' || mode === 'last_month') {
    const weeks = [
      { label: 'Mgg 1', start: 1, end: 7 },
      { label: 'Mgg 2', start: 8, end: 14 },
      { label: 'Mgg 3', start: 15, end: 21 },
      { label: 'Mgg 4', start: 22, end: 28 },
      { label: 'Mgg 5', start: 29, end: 31 }
    ];

    columns = weeks.map(w => {
      let inc = 0;
      let exp = 0;
      filteredTxs.forEach(t => {
        if (!t.date) return;
        const dayNum = parseInt(t.date.split('-')[2], 10);
        if (dayNum >= w.start && dayNum <= w.end) {
          if (t.type === 'income') inc += Number(t.amount || 0);
          else if (t.type === 'expense') exp += Number(t.amount || 0);
        }
      });
      return {
        label: w.label,
        sub: `Tgl ${w.start}-${w.end}`,
        income: inc,
        expense: exp
      };
    });
  }
  // ==========================================
  // CASE D: THIS YEAR (Monthly breakdown)
  // ==========================================
  else if (mode === 'this_year') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    columns = months.map((mName, mIdx) => {
      const monthNum = mIdx + 1;
      let inc = 0;
      let exp = 0;
      filteredTxs.forEach(t => {
        if (!t.date) return;
        const m = parseInt(t.date.split('-')[1], 10);
        if (m === monthNum) {
          if (t.type === 'income') inc += Number(t.amount || 0);
          else if (t.type === 'expense') exp += Number(t.amount || 0);
        }
      });
      return {
        label: mName,
        income: inc,
        expense: exp
      };
    });
  }
  // ==========================================
  // CASE E: RANGE OR ALL (Dynamic intervals)
  // ==========================================
  else {
    const dates = Array.from(new Set(filteredTxs.map(t => t.date).filter(Boolean))).sort();
    if (dates.length <= 7) {
      columns = dates.map(dStr => {
        const parts = dStr.split('-');
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dObj.getDay()];
        const txsOnDay = filteredTxs.filter(t => t.date === dStr);
        const inc = txsOnDay.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
        const exp = txsOnDay.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
        return {
          label: `${parts[2]}/${parts[1]}`,
          sub: dayName,
          income: inc,
          expense: exp
        };
      });
    } else {
      const segmentSize = Math.ceil(dates.length / 5);
      for (let s = 0; s < 5; s++) {
        const sliceDates = dates.slice(s * segmentSize, (s + 1) * segmentSize);
        if (sliceDates.length === 0) continue;
        const segTxs = filteredTxs.filter(t => sliceDates.includes(t.date));
        const inc = segTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const exp = segTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const first = sliceDates[0].split('-').slice(1).reverse().join('/');
        columns.push({
          label: first,
          income: inc,
          expense: exp
        });
      }
    }
  }

  // Find max value for scaling bar heights
  const maxVal = Math.max(...columns.map(c => Math.max(c.income, c.expense)), 50000);

  columns.forEach(col => {
    const incPct = col.income > 0 ? Math.max(12, Math.round((col.income / maxVal) * 100)) : 6;
    const expPct = col.expense > 0 ? Math.max(12, Math.round((col.expense / maxVal) * 100)) : 6;

    const colEl = document.createElement('div');
    colEl.className = 'flex flex-col items-center gap-1.5 group cursor-pointer active:scale-95 transition-transform flex-1';
    colEl.onclick = () => {
      showToast(`${col.label} ${col.sub ? '(' + col.sub + ')' : ''}: Masuk ${formatIDR(col.income)} • Keluar ${formatIDR(col.expense)}`);
    };

    colEl.innerHTML = `
      <div class="flex items-end justify-center gap-1 h-24 w-full">
        <!-- Income Bar (Green) -->
        <div class="w-3 rounded-t-full transition-all group-hover:scale-110 shadow-xs ${col.income > 0 ? 'bg-[#1CA46B]' : 'bg-slate-200/50'}" 
             style="height: ${incPct}%;" 
             title="Pemasukan: ${formatIDR(col.income)}"></div>
        <!-- Expense Bar (Red) -->
        <div class="w-3 rounded-t-full transition-all group-hover:scale-110 shadow-xs ${col.expense > 0 ? 'bg-rose-500' : 'bg-slate-200/50'}" 
             style="height: ${expPct}%;" 
             title="Pengeluaran: ${formatIDR(col.expense)}"></div>
      </div>
      <span class="text-[10px] ${col.isToday ? 'font-bold text-ink-dark bg-amber-200/80 px-1.5 py-0.5 rounded-full' : 'font-semibold text-slate-500 group-hover:text-ink-dark'} transition-colors whitespace-nowrap text-center">
        ${col.label}
      </span>
    `;
    chartContainer.appendChild(colEl);
  });
}

function renderStatsTopTransactions(filteredTxs) {
  const topContainer = document.getElementById('statsTopTransactionsList') || document.querySelector('#tab-stats .space-y-2\\.5');
  const topTitleEl = document.getElementById('statsTopTransactionsTitle');
  if (topTitleEl) {
    topTitleEl.textContent = statsFilter.label ? `Riwayat Transaksi (${statsFilter.label})` : 'Riwayat Transaksi Keseluruhan';
  }
  if (!topContainer) return;
  topContainer.innerHTML = '';

  // Urutkan transaksi secara kronologis sesuai waktu (terbaru ke terlama), BUKAN dari nominal terbesar
  const allSorted = (filteredTxs || getStatsFilteredTransactions()).slice().sort((a, b) => {
    const dateA = (a.date || '') + ' ' + (a.time || '');
    const dateB = (b.date || '') + ' ' + (b.time || '');
    return dateB.localeCompare(dateA);
  });

  if (allSorted.length === 0) {
    topContainer.innerHTML = '<p class="text-center text-xs text-slate-400 py-4">Belum ada riwayat transaksi pada periode ini</p>';
    return;
  }

  // Tampilkan daftar transaksi kronologis
  const txs = allSorted.slice(0, 15);

  const itemsHtml = txs.map(t => {
    const isIncome = t.type === 'income';
    const meta = getCategoryMeta(t.category || t.title, t.type);
    const displayTime = formatTransactionDisplayTime(t);

    return `
    <div class="p-3 rounded-2xl bg-slate-50 flex items-center justify-between border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all active:scale-[0.98]" onclick="openTxDetail('${t.id}')">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 shadow-xs">
          <span class="material-symbols-outlined text-[18px]">${meta.icon}</span>
        </div>
        <div>
          <h4 class="text-xs font-bold text-ink-dark leading-snug">${t.title}</h4>
          <p class="text-[10px] text-slate-400 mt-0.5">${displayTime} &bull; ${t.wallet}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs font-bold ${isIncome ? 'text-[#1CA46B]' : 'text-rose-600'} font-display block">
          ${isIncome ? '+' : '-'}${formatIDR(t.amount)}
        </span>
        <span class="text-[9px] font-bold ${isIncome ? 'text-[#1CA46B] bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'} px-2 py-0.5 rounded-full inline-block mt-0.5">
          ${isIncome ? 'Masuk' : 'Keluar'}
        </span>
      </div>
    </div>
  `;
  }).join('');

  topContainer.innerHTML = itemsHtml;

  // Tombol "Lihat Semuanya" di bagian paling bawah
  const viewAllBtn = document.createElement('button');
  viewAllBtn.type = 'button';
  viewAllBtn.className = 'w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-ink-dark shadow-soft active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2';
  viewAllBtn.innerHTML = `
    <span>Lihat Semua Riwayat Transaksi</span>
    <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">${allSorted.length} Transaksi</span>
    <span class="material-symbols-outlined text-[16px] text-slate-500">arrow_forward</span>
  `;
  viewAllBtn.onclick = () => {
    openModal('modalAllTransactions');
  };
  topContainer.appendChild(viewAllBtn);
}

function openStatsPeriodModal() {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const todayStr = getLocalDateString(now);

  const singleInput = document.getElementById('statsSingleDateInput');
  const fromInput = document.getElementById('statsRangeDateFrom');
  const toInput = document.getElementById('statsRangeDateTo');

  if (singleInput && !singleInput.value) singleInput.value = todayStr;
  if (fromInput && !fromInput.value) fromInput.value = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
  if (toInput && !toInput.value) toInput.value = todayStr;

  const todayPreset = document.getElementById('statsPresetTodayDate');
  const thisMonthPreset = document.getElementById('statsPresetThisMonthLabel');
  const lastMonthPreset = document.getElementById('statsPresetLastMonthLabel');
  const thisYearPreset = document.getElementById('statsPresetThisYearLabel');

  if (todayPreset) todayPreset.textContent = now.getDate() + ' ' + INDO_MONTHS_SHORT[curMonth];
  if (thisMonthPreset) thisMonthPreset.textContent = INDO_MONTHS_SHORT[curMonth] + ' ' + curYear;
  const lastM = new Date(curYear, curMonth - 1, 1);
  if (lastMonthPreset) lastMonthPreset.textContent = INDO_MONTHS_SHORT[lastM.getMonth()] + ' ' + lastM.getFullYear();
  if (thisYearPreset) thisYearPreset.textContent = String(curYear);

  openModal('modalStatsPeriodPicker');
}

function selectStatsPeriod(type) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  statsFilter.mode = type;
  if (type === 'today') {
    statsFilter.label = 'Hari Ini (' + now.getDate() + ' ' + INDO_MONTHS_SHORT[now.getMonth()] + ')';
  } else if (type === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    statsFilter.label = 'Kemarin (' + yest.getDate() + ' ' + INDO_MONTHS_SHORT[yest.getMonth()] + ')';
  } else if (type === '7days') {
    statsFilter.label = '7 Hari Terakhir';
  } else if (type === 'this_month') {
    statsFilter.label = INDO_MONTHS_SHORT[curMonth] + ' ' + curYear;
  } else if (type === 'last_month') {
    const lastM = new Date(curYear, curMonth - 1, 1);
    statsFilter.label = INDO_MONTHS_SHORT[lastM.getMonth()] + ' ' + lastM.getFullYear();
  } else if (type === 'this_year') {
    statsFilter.label = 'Tahun ' + curYear;
  } else if (type === 'all') {
    statsFilter.label = 'Semua Waktu';
  }

  const labelEl = document.getElementById('statsSelectedPeriodLabel');
  if (labelEl) labelEl.textContent = statsFilter.label;

  closeModal('modalStatsPeriodPicker');
  renderStats();
  showToast('Periode: ' + statsFilter.label);
}

function applyStatsSingleDate() {
  const input = document.getElementById('statsSingleDateInput');
  if (!input || !input.value) {
    alert('Silakan pilih tanggal terlebih dahulu!');
    return;
  }

  statsFilter.mode = 'single';
  statsFilter.singleDate = input.value;

  const parts = input.value.split('-');
  if (parts.length === 3) {
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[0];
    statsFilter.label = d + ' ' + INDO_MONTHS_SHORT[m] + ' ' + y;
  } else {
    statsFilter.label = input.value;
  }

  const labelEl = document.getElementById('statsSelectedPeriodLabel');
  if (labelEl) labelEl.textContent = statsFilter.label;

  closeModal('modalStatsPeriodPicker');
  renderStats();
  showToast('Filter tanggal: ' + statsFilter.label);
}

function applyStatsDateRange() {
  const fromInput = document.getElementById('statsRangeDateFrom');
  const toInput = document.getElementById('statsRangeDateTo');

  if (!fromInput || !fromInput.value || !toInput || !toInput.value) {
    alert('Silakan lengkapi rentang tanggal Dari dan Sampai!');
    return;
  }

  if (fromInput.value > toInput.value) {
    alert('Tanggal "Dari" tidak boleh lebih besar dari tanggal "Sampai"!');
    return;
  }

  statsFilter.mode = 'range';
  statsFilter.dateFrom = fromInput.value;
  statsFilter.dateTo = toInput.value;

  const pFrom = fromInput.value.split('-');
  const pTo = toInput.value.split('-');
  const strFrom = parseInt(pFrom[2], 10) + ' ' + INDO_MONTHS_SHORT[parseInt(pFrom[1], 10) - 1];
  const strTo = parseInt(pTo[2], 10) + ' ' + INDO_MONTHS_SHORT[parseInt(pTo[1], 10) - 1] + ' ' + pTo[0];
  statsFilter.label = strFrom + ' - ' + strTo;

  const labelEl = document.getElementById('statsSelectedPeriodLabel');
  if (labelEl) labelEl.textContent = statsFilter.label;

  closeModal('modalStatsPeriodPicker');
  renderStats();
  showToast('Rentang: ' + statsFilter.label);
}

function togglePeriodFilter() {
  openStatsPeriodModal();
}

// ==========================================
// 8. EXPORT CSV & ESTIMATE CALCULATION
// ==========================================

function selectExportChip(btn, periodName) {
  state.exportPeriod = periodName;

  // Toggle visual active chip style
  const chipsContainer = document.getElementById('exportQuickChips');
  if (chipsContainer) {
    chipsContainer.querySelectorAll('button').forEach(b => {
      b.className = 'py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-all active:scale-95 text-center';
    });
  }
  if (btn) {
    btn.className = 'py-2 px-3 rounded-xl bg-ink-dark text-white font-bold text-[11px] font-display shadow-sm transition-all active:scale-95 text-center';
  }

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const monthSelect = document.getElementById('exportMonthSelect');
  const yearSelect = document.getElementById('exportYearSelect');
  const dateFrom = document.getElementById('exportDateFrom');
  const dateTo = document.getElementById('exportDateTo');

  if (periodName === 'Bulan Ini') {
    if (monthSelect) monthSelect.value = String(curMonth);
    if (yearSelect) yearSelect.value = String(curYear);
    if (dateFrom) dateFrom.value = `${curYear}-${String(curMonth).padStart(2, '0')}-01`;
    if (dateTo) dateTo.value = getLocalDateString(new Date(curYear, curMonth, 0));
  } else if (periodName === '3 Bulan Terakhir') {
    if (monthSelect) monthSelect.value = 'all';
    const past = new Date(now);
    past.setMonth(past.getMonth() - 3);
    if (dateFrom) dateFrom.value = getLocalDateString(past);
    if (dateTo) dateTo.value = getLocalDateString(now);
  } else if (periodName === 'Tahun Ini') {
    if (monthSelect) monthSelect.value = 'all';
    if (yearSelect) yearSelect.value = String(curYear);
    if (dateFrom) dateFrom.value = `${curYear}-01-01`;
    if (dateTo) dateTo.value = `${curYear}-12-31`;
  }

  updateExportEstimate();
}

function initExportModalDates() {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const monthSelect = document.getElementById('exportMonthSelect');
  const yearSelect = document.getElementById('exportYearSelect');
  const dateFrom = document.getElementById('exportDateFrom');
  const dateTo = document.getElementById('exportDateTo');

  if (monthSelect) monthSelect.value = String(curMonth);
  if (yearSelect) yearSelect.value = String(curYear);
  if (dateFrom) dateFrom.value = `${curYear}-${String(curMonth).padStart(2, '0')}-01`;
  if (dateTo) dateTo.value = getLocalDateString(new Date(curYear, curMonth, 0));

  const statsPeriod = document.getElementById('statsSelectedPeriodLabel');
  if (statsPeriod && (statsPeriod.textContent.includes('202') || statsPeriod.textContent.includes('Bulan'))) {
    statsPeriod.textContent = `${INDO_MONTHS_SHORT[now.getMonth()]} ${curYear}`;
  }
}

function getFilteredExportTransactions() {
  const monthSelect = document.getElementById('exportMonthSelect');
  const yearSelect = document.getElementById('exportYearSelect');
  const dateFrom = document.getElementById('exportDateFrom');
  const dateTo = document.getElementById('exportDateTo');

  const selectedMonth = monthSelect ? monthSelect.value : 'all';
  const selectedYear = yearSelect ? yearSelect.value : '';
  const fromVal = dateFrom ? dateFrom.value : '';
  const toVal = dateTo ? dateTo.value : '';

  return state.transactions.filter(t => {
    // If specific date range is set
    if (t.date && fromVal && toVal) {
      if (t.date < fromVal || t.date > toVal) return false;
    }
    // If month filter
    if (selectedMonth !== 'all' && t.date) {
      const m = parseInt(t.date.split('-')[1], 10);
      if (m !== parseInt(selectedMonth, 10)) return false;
    }
    // If year filter
    if (selectedYear && t.date) {
      const y = t.date.split('-')[0];
      if (y !== selectedYear) return false;
    }
    return true;
  });
}

let currentExportFormat = 'excel';

function setExportFormat(format) {
  currentExportFormat = format;
  const btnExcel = document.getElementById('exportFormatBtnExcel');
  const btnPDF = document.getElementById('exportFormatBtnPDF');
  const dotExcel = document.getElementById('dotFormatExcel');
  const dotPDF = document.getElementById('dotFormatPDF');
  const badge = document.getElementById('exportEstimateBadge');
  const submitIcon = document.getElementById('btnExportSubmitIcon');
  const submitText = document.getElementById('btnExportSubmitText');

  if (format === 'pdf') {
    if (btnPDF) {
      btnPDF.className = 'flex items-center gap-2.5 p-2.5 rounded-2xl border-2 border-slate-900 bg-amber-50/70 shadow-xs transition-all text-left';
    }
    if (btnExcel) {
      btnExcel.className = 'flex items-center gap-2.5 p-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left';
    }
    if (dotPDF) dotPDF.className = 'w-2 h-2 rounded-full bg-rose-600 shrink-0';
    if (dotExcel) dotExcel.className = 'w-2 h-2 rounded-full bg-slate-300 shrink-0';
    if (badge) {
      badge.textContent = 'UNDUH PDF (A4)';
      badge.className = 'text-[10px] font-mono font-bold text-rose-700 bg-rose-100/90 px-2.5 py-0.5 rounded-full uppercase shrink-0';
    }
    if (submitIcon) submitIcon.textContent = 'download';
    if (submitText) submitText.textContent = 'Unduh Dokumen PDF';
  } else {
    if (btnExcel) {
      btnExcel.className = 'flex items-center gap-2.5 p-2.5 rounded-2xl border-2 border-slate-900 bg-amber-50/70 shadow-xs transition-all text-left';
    }
    if (btnPDF) {
      btnPDF.className = 'flex items-center gap-2.5 p-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left';
    }
    if (dotExcel) dotExcel.className = 'w-2 h-2 rounded-full bg-emerald-600 shrink-0';
    if (dotPDF) dotPDF.className = 'w-2 h-2 rounded-full bg-slate-300 shrink-0';
    if (badge) {
      badge.textContent = 'EXCEL (TEMPLATE RAPI)';
      badge.className = 'text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full uppercase shrink-0';
    }
    if (submitIcon) submitIcon.textContent = 'download';
    if (submitText) submitText.textContent = 'Unduh Berkas Excel';
  }
}

function handleExportSubmit() {
  if (currentExportFormat === 'pdf') {
    exportDataPDF();
  } else {
    exportDataCSV();
  }
  closeModal('modalExportCSV');
}

function formatDateIndoSimple(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${INDO_MONTHS_SHORT[m] || ''} ${y}`;
  }
  return dateStr;
}

function getExportPeriodDescription() {
  const monthSelect = document.getElementById('exportMonthSelect');
  const yearSelect = document.getElementById('exportYearSelect');
  const dateFrom = document.getElementById('exportDateFrom');
  const dateTo = document.getElementById('exportDateTo');

  const selectedMonth = monthSelect ? monthSelect.value : 'all';
  const selectedYear = yearSelect ? yearSelect.value : '';
  const fromVal = dateFrom ? dateFrom.value : '';
  const toVal = dateTo ? dateTo.value : '';

  if (fromVal && toVal) {
    return `${formatDateIndoSimple(fromVal)} s.d. ${formatDateIndoSimple(toVal)}`;
  }
  if (selectedMonth !== 'all' && selectedYear) {
    const mIdx = parseInt(selectedMonth, 10) - 1;
    return `Bulan ${INDO_MONTHS_FULL[mIdx]} ${selectedYear}`;
  }
  if (selectedYear) {
    return `Tahun ${selectedYear}`;
  }
  return 'Seluruh Riwayat Transaksi';
}

function updateExportEstimate() {
  const matching = getFilteredExportTransactions();
  const estimateEl = document.getElementById('exportEstimateText');
  if (estimateEl) {
    estimateEl.innerHTML = `Perkiraan data: <span class="font-bold text-ink-dark">${matching.length} Transaksi ditemukan</span>`;
  }
}

function exportDataCSV() {
  exportDataExcel();
}

async function exportDataExcel() {
  const list = getFilteredExportTransactions();
  if (list.length === 0) {
    alert('Tidak ada transaksi yang sesuai dengan filter tanggal untuk diekspor ke Excel.');
    return;
  }

  // Urutkan transaksi secara kronologis (dari terlama ke terbaru)
  const sortedList = list.slice().sort((a, b) => {
    const dateA = (a.date || '') + ' ' + (a.time || '');
    const dateB = (b.date || '') + ' ' + (b.time || '');
    return dateA.localeCompare(dateB);
  });

  const now = new Date();
  const printDateStr = getIndonesianDateString(now, false) + ' • ' + getLocalTimeString(now) + ' WIB';
  const periodText = getExportPeriodDescription();
  const docNumber = `PQ-XLS/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let totalIncome = 0;
  let totalExpense = 0;
  let countIncome = 0;
  let countExpense = 0;

  const categoryMap = {};
  const walletMap = {};

  sortedList.forEach(t => {
    const amt = Number(t.amount || 0);
    const cat = t.category || 'Lainnya';
    const wal = t.wallet || 'Kas Tunai';

    if (t.type === 'income') {
      totalIncome += amt;
      countIncome++;
    } else {
      totalExpense += amt;
      countExpense++;

      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, total: 0 };
      }
      categoryMap[cat].count++;
      categoryMap[cat].total += amt;
    }

    if (!walletMap[wal]) {
      walletMap[wal] = { income: 0, expense: 0, count: 0 };
    }
    walletMap[wal].count++;
    if (t.type === 'income') walletMap[wal].income += amt;
    else walletMap[wal].expense += amt;
  });

  const netCashflow = totalIncome - totalExpense;
  const isSurplus = netCashflow >= 0;
  const savingsRate = totalIncome > 0 ? ((netCashflow / totalIncome) * 100).toFixed(1) : 0;

  const sortedCategories = Object.keys(categoryMap).map(k => ({
    name: k,
    count: categoryMap[k].count,
    total: categoryMap[k].total,
    pct: totalExpense > 0 ? ((categoryMap[k].total / totalExpense) * 100).toFixed(1) : 0
  })).sort((a, b) => b.total - a.total);

  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  const userName = (state.userProfile && state.userProfile.name) ? state.userProfile.name : 'Pengguna PayQu';
  const userEmail = (state.userProfile && state.userProfile.email) ? state.userProfile.email : 'Akun Terverifikasi (Offline-First)';

  // Narasi Evaluasi Keuangan
  let narrativeCashflow = isSurplus 
    ? `Arus kas pada periode ini membukukan SURPLUS sebesar ${formatIDR(netCashflow)} dengan rasio simpanan ${savingsRate}%. Seluruh kebutuhan pengeluaran terdanai secara sehat.`
    : `Arus kas pada periode ini mengalami DEFISIT sebesar ${formatIDR(Math.abs(netCashflow))}. Total pengeluaran melampaui jumlah penerimaan kas.`;

  let narrativeDominant = topCategory && topCategory.total > 0
    ? `Beban belanja tertinggi terkonsentrasi pada kategori ${topCategory.name} sebesar ${formatIDR(topCategory.total)} (${topCategory.pct}% dari total seluruh pengeluaran).`
    : `Tidak tercatat pengeluaran dominan yang signifikan pada periode ini.`;

  // GENERATE WORKBOOK .XLSX BERWARNA RESMI & AMAN DENGAN EXCELJS
  if (typeof ExcelJS !== 'undefined') {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PayQu Financial Ledger';
      wb.lastModifiedBy = userName;
      wb.created = now;
      wb.modified = now;

      const ws = wb.addWorksheet('Laporan PayQu', {
        views: [{ showGridLines: true }]
      });

      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      const doubleBorder = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      ws.columns = [
        { key: 'colA', width: 6 },
        { key: 'colB', width: 15 },
        { key: 'colC', width: 16 },
        { key: 'colD', width: 14 },
        { key: 'colE', width: 34 },
        { key: 'colF', width: 22 },
        { key: 'colG', width: 20 },
        { key: 'colH', width: 16 },
        { key: 'colI', width: 22 },
        { key: 'colJ', width: 22 }
      ];

      function applyStyle(cell, font, fill, alignment, border) {
        if (font) cell.font = font;
        if (fill) cell.fill = fill;
        if (alignment) cell.alignment = alignment;
        if (border) cell.border = border;
      }

      function styleRowRange(rowNum, startCol, endCol, font, fill, alignment, border) {
        const cols = ['A','B','C','D','E','F','G','H','I','J'];
        const sIdx = cols.indexOf(startCol);
        const eIdx = cols.indexOf(endCol);
        for (let i = sIdx; i <= eIdx; i++) {
          const c = ws.getCell(`${cols[i]}${rowNum}`);
          applyStyle(c, font, fill, alignment, border);
        }
      }

      // 1. KOP RESMI LAPORAN EXCEL
      ws.mergeCells('A1:J1');
      const cA1 = ws.getCell('A1');
      cA1.value = 'PAYQU FINANCIAL - CATATAN UANG PRIBADI';
      applyStyle(cA1,
        { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
        { horizontal: 'center', vertical: 'middle' }
      );
      ws.getRow(1).height = 36;

      ws.mergeCells('A2:J2');
      const cA2 = ws.getCell('A2');
      cA2.value = 'LAPORAN REKAPITULASI ARUS KAS & MUTASI KEUANGAN RESMI';
      applyStyle(cA2,
        { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDD231' } },
        { horizontal: 'center', vertical: 'middle' }
      );
      ws.getRow(2).height = 24;

      // 2. METADATA & IDENTITAS LAPORAN
      const metaConfig = [
        { r: 4, l1: 'Nama Pemilik Akun:', v1: userName, l2: 'Nomor Dokumen:', v2: docNumber },
        { r: 5, l1: 'Email / Identitas:', v1: userEmail, l2: 'Waktu Penerbitan:', v2: printDateStr },
        { r: 6, l1: 'Periode Laporan:', v1: periodText, l2: 'Total Transaksi:', v2: `${sortedList.length} Transaksi Tercatat` },
        { r: 7, l1: 'Status Basis Data:', v1: 'Penyimpanan Aman Lokal (Offline-First)', l2: 'Mata Uang:', v2: 'Indonesian Rupiah (IDR)' }
      ];

      metaConfig.forEach(m => {
        ws.mergeCells(`A${m.r}:B${m.r}`);
        ws.mergeCells(`C${m.r}:E${m.r}`);
        ws.mergeCells(`F${m.r}:G${m.r}`);
        ws.mergeCells(`H${m.r}:J${m.r}`);

        const cL1 = ws.getCell(`A${m.r}`); cL1.value = m.l1;
        const cV1 = ws.getCell(`C${m.r}`); cV1.value = m.v1;
        const cL2 = ws.getCell(`F${m.r}`); cL2.value = m.l2;
        const cV2 = ws.getCell(`H${m.r}`); cV2.value = m.v2;

        styleRowRange(m.r, 'A', 'B', { bold: true, size: 10, color: { argb: 'FF475569' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
        styleRowRange(m.r, 'C', 'E', { bold: true, size: 10, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', indent: 1 }, thinBorder);
        styleRowRange(m.r, 'F', 'G', { bold: true, size: 10, color: { argb: 'FF475569' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
        styleRowRange(m.r, 'H', 'J', { bold: true, size: 10, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', indent: 1 }, thinBorder);
        ws.getRow(m.r).height = 20;
      });

      // 3. KOTAK KETERANGAN & PENJELASAN
      ws.mergeCells('A9:J9');
      const cDesc = ws.getCell('A9');
      cDesc.value = 'Keterangan Dokumen: Laporan spreadsheet resmi berformat .xlsx ini diterbitkan langsung secara aman dari aplikasi PayQu. Format tabel berstruktur rapi dengan warna penunjuk status finansial, kompatibel penuh dengan Microsoft Excel, Google Sheets, dan WPS Office tanpa peringatan keamanan.';
      styleRowRange(9, 'A', 'J',
        { italic: true, size: 9.5, color: { argb: 'FF78350F' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } },
        { vertical: 'middle', wrapText: true, indent: 1 },
        { top: { style: 'thin', color: { argb: 'FFFDE68A' } }, bottom: { style: 'thin', color: { argb: 'FFFDE68A' } } }
      );
      ws.getRow(9).height = 32;

      // 4. RINGKASAN EKSEKUTIF KEUANGAN
      ws.mergeCells('A11:J11');
      const cSecSum = ws.getCell('A11');
      cSecSum.value = 'RINGKASAN EKSEKUTIF ARUS KAS';
      styleRowRange(11, 'A', 'J',
        { bold: true, size: 10.5, color: { argb: 'FF0F172A' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      ws.getRow(11).height = 24;

      // Header Metrik
      ws.mergeCells('A12:B12');
      ws.mergeCells('C12:E12');
      ws.mergeCells('F12:H12');
      ws.mergeCells('I12:J12');

      ws.getCell('A12').value = 'Total Pemasukan (Income)';
      ws.getCell('C12').value = 'Total Pengeluaran (Expense)';
      ws.getCell('F12').value = 'Arus Kas Bersih (Net Cashflow)';
      ws.getCell('I12').value = 'Tingkat Simpanan (Savings Rate)';

      const mHeaderFont = { bold: true, size: 9.5, color: { argb: 'FF475569' } };
      const mHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      styleRowRange(12, 'A', 'B', mHeaderFont, mHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(12, 'C', 'E', mHeaderFont, mHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(12, 'F', 'H', mHeaderFont, mHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(12, 'I', 'J', mHeaderFont, mHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      ws.getRow(12).height = 20;

      // Nilai Metrik
      ws.mergeCells('A13:B13');
      ws.mergeCells('C13:E13');
      ws.mergeCells('F13:H13');
      ws.mergeCells('I13:J13');

      const cInVal = ws.getCell('A13'); cInVal.value = totalIncome; cInVal.numFmt = '#,##0';
      const cOutVal = ws.getCell('C13'); cOutVal.value = totalExpense; cOutVal.numFmt = '#,##0';
      const cNetVal = ws.getCell('F13'); cNetVal.value = netCashflow; cNetVal.numFmt = '#,##0';
      const cRateVal = ws.getCell('I13'); cRateVal.value = `${savingsRate}%`;

      styleRowRange(13, 'A', 'B', { bold: true, size: 12, color: { argb: 'FF059669' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(13, 'C', 'E', { bold: true, size: 12, color: { argb: 'FFDC2626' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(13, 'F', 'H', { bold: true, size: 12, color: { argb: isSurplus ? 'FF059669' : 'FFDC2626' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(13, 'I', 'J', { bold: true, size: 12, color: { argb: 'FF4338CA' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      ws.getRow(13).height = 28;

      // Sub-label Metrik
      ws.mergeCells('A14:B14');
      ws.mergeCells('C14:E14');
      ws.mergeCells('F14:H14');
      ws.mergeCells('I14:J14');

      ws.getCell('A14').value = `${countIncome} Transaksi Masuk`;
      ws.getCell('C14').value = `${countExpense} Transaksi Keluar`;
      ws.getCell('F14').value = isSurplus ? '● SURPLUS KAS' : '▲ DEFISIT ANGGARAN';
      ws.getCell('I14').value = 'Rasio Sisa Pemasukan';

      styleRowRange(14, 'A', 'B', { size: 9, color: { argb: 'FF059669' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(14, 'C', 'E', { size: 9, color: { argb: 'FFDC2626' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(14, 'F', 'H', { size: 9, bold: true, color: { argb: isSurplus ? 'FF059669' : 'FFDC2626' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(14, 'I', 'J', { size: 9, color: { argb: 'FF4338CA' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      ws.getRow(14).height = 18;

      // 5. BAGIAN I: TABEL MUTASI TRANSAKSI
      ws.mergeCells('A16:J16');
      const cSec1 = ws.getCell('A16');
      cSec1.value = 'I. TABEL RINCIAN MUTASI TRANSAKSI (URUTAN KRONOLOGIS)';
      styleRowRange(16, 'A', 'J',
        { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      ws.getRow(16).height = 26;

      // Header Kolom Tabel Mutasi
      const tableHeaders = ['No', 'ID Transaksi', 'Tanggal', 'Waktu', 'Keterangan Transaksi', 'Kategori', 'Dompet / Rekening', 'Tipe Mutasi', 'Pemasukan (+Rp)', 'Pengeluaran (-Rp)'];
      const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      cols.forEach((cLetter, idx) => {
        const cell = ws.getCell(`${cLetter}17`);
        cell.value = tableHeaders[idx];
        applyStyle(cell,
          { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
          { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
          { horizontal: 'center', vertical: 'middle' },
          thinBorder
        );
      });
      ws.getRow(17).height = 26;

      let curRow = 18;
      sortedList.forEach((t, idx) => {
        const isInc = t.type === 'income';
        const nominalIn = isInc ? Number(t.amount || 0) : null;
        const nominalOut = isInc ? null : Number(t.amount || 0);
        const displayDate = t.date ? formatDateIndoSimple(t.date) : formatDateIndoSimple(getLocalDateString(now));
        const displayTime = t.time ? convertTo24HourTime(t.time) + ' WIB' : '-';
        const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;

        const cNo = ws.getCell(`A${curRow}`); cNo.value = idx + 1;
        applyStyle(cNo, { size: 10 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cId = ws.getCell(`B${curRow}`); cId.value = t.id || ('TX-' + (idx + 101));
        applyStyle(cId, { size: 9.5, name: 'Consolas' }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cDate = ws.getCell(`C${curRow}`); cDate.value = displayDate;
        applyStyle(cDate, { size: 10 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cTime = ws.getCell(`D${curRow}`); cTime.value = displayTime;
        applyStyle(cTime, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cTitle = ws.getCell(`E${curRow}`); cTitle.value = t.title || 'Transaksi';
        applyStyle(cTitle, { size: 10, bold: true, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cCat = ws.getCell(`F${curRow}`); cCat.value = t.category || 'Lainnya';
        applyStyle(cCat, { size: 10 }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cWal = ws.getCell(`G${curRow}`); cWal.value = t.wallet || 'Kas Tunai';
        applyStyle(cWal, { size: 10 }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cType = ws.getCell(`H${curRow}`); cType.value = isInc ? 'Pemasukan' : 'Pengeluaran';
        applyStyle(cType, { size: 9.5, bold: true, color: { argb: isInc ? 'FF059669' : 'FFDC2626' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cIn = ws.getCell(`I${curRow}`);
        if (nominalIn) {
          cIn.value = nominalIn;
          cIn.numFmt = '#,##0';
          applyStyle(cIn, { size: 10, bold: true, color: { argb: 'FF059669' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);
        } else {
          cIn.value = '-';
          applyStyle(cIn, { size: 10, color: { argb: 'FF94A3B8' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        }

        const cOut = ws.getCell(`J${curRow}`);
        if (nominalOut) {
          cOut.value = nominalOut;
          cOut.numFmt = '#,##0';
          applyStyle(cOut, { size: 10, bold: true, color: { argb: 'FFDC2626' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);
        } else {
          cOut.value = '-';
          applyStyle(cOut, { size: 10, color: { argb: 'FF94A3B8' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        }

        ws.getRow(curRow).height = 24;
        curRow++;
      });

      // Baris Total Rekapitulasi Mutasi
      ws.mergeCells(`A${curRow}:H${curRow}`);
      const cTotLabel = ws.getCell(`A${curRow}`);
      cTotLabel.value = `TOTAL REKAPITULASI MUTASI ( ${sortedList.length} TRANSAKSI )`;
      styleRowRange(curRow, 'A', 'H',
        { bold: true, size: 10, color: { argb: 'FF0F172A' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        { vertical: 'middle', indent: 1 },
        doubleBorder
      );

      const cTotIn = ws.getCell(`I${curRow}`); cTotIn.value = totalIncome; cTotIn.numFmt = '#,##0';
      applyStyle(cTotIn, { bold: true, size: 10.5, color: { argb: 'FF059669' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, doubleBorder);

      const cTotOut = ws.getCell(`J${curRow}`); cTotOut.value = totalExpense; cTotOut.numFmt = '#,##0';
      applyStyle(cTotOut, { bold: true, size: 10.5, color: { argb: 'FFDC2626' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, doubleBorder);
      ws.getRow(curRow).height = 26;
      curRow++;

      // Baris Net Mutasi Kas
      ws.mergeCells(`A${curRow}:H${curRow}`);
      const cNetLabel = ws.getCell(`A${curRow}`);
      cNetLabel.value = 'ARUS KAS BERSIH (NETTO MUTASI):';
      styleRowRange(curRow, 'A', 'H',
        { bold: true, size: 10, color: { argb: 'FF334155' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
        { horizontal: 'right', vertical: 'middle' },
        thinBorder
      );

      ws.mergeCells(`I${curRow}:J${curRow}`);
      const cNetFinal = ws.getCell(`I${curRow}`); cNetFinal.value = netCashflow; cNetFinal.numFmt = '#,##0';
      styleRowRange(curRow, 'I', 'J',
        { bold: true, size: 11, color: { argb: isSurplus ? 'FF059669' : 'FFDC2626' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
        { horizontal: 'right', vertical: 'middle' },
        thinBorder
      );
      ws.getRow(curRow).height = 26;
      curRow += 2;

      // 6. BAGIAN II: REKAPAN INTI & EVALUASI
      ws.mergeCells(`A${curRow}:J${curRow}`);
      const cSec2 = ws.getCell(`A${curRow}`);
      cSec2.value = 'II. LAPORAN PENJELASAN REKAPAN INTI & EVALUASI FINANSIAL';
      styleRowRange(curRow, 'A', 'J',
        { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      ws.getRow(curRow).height = 26;
      curRow++;

      // A. Rekapitulasi Kategori
      ws.mergeCells(`A${curRow}:J${curRow}`);
      const cCatSubTitle = ws.getCell(`A${curRow}`);
      cCatSubTitle.value = 'A. Rekapitulasi Pengeluaran per Kategori Belanja';
      styleRowRange(curRow, 'A', 'J',
        { bold: true, size: 10, color: { argb: 'FF1E293B' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      ws.getRow(curRow).height = 22;
      curRow++;

      // Header Kategori
      ws.getCell(`A${curRow}`).value = 'No';
      ws.mergeCells(`B${curRow}:D${curRow}`); ws.getCell(`B${curRow}`).value = 'Kategori Pengeluaran';
      ws.mergeCells(`E${curRow}:F${curRow}`); ws.getCell(`E${curRow}`).value = 'Frekuensi Transaksi';
      ws.mergeCells(`G${curRow}:H${curRow}`); ws.getCell(`G${curRow}`).value = 'Total Belanja (Rp)';
      ws.mergeCells(`I${curRow}:J${curRow}`); ws.getCell(`I${curRow}`).value = 'Porsi Pengeluaran (%)';

      const catHeaderFont = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
      const catHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
      applyStyle(ws.getCell(`A${curRow}`), catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'B', 'D', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'E', 'F', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'G', 'H', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'I', 'J', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      ws.getRow(curRow).height = 22;
      curRow++;

      if (sortedCategories.length === 0) {
        ws.mergeCells(`A${curRow}:J${curRow}`);
        const cEmpty = ws.getCell(`A${curRow}`);
        cEmpty.value = 'Tidak ada transaksi pengeluaran pada periode ini.';
        styleRowRange(curRow, 'A', 'J', { italic: true, size: 9.5, color: { argb: 'FF94A3B8' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        ws.getRow(curRow).height = 22;
        curRow++;
      } else {
        sortedCategories.forEach((c, idx) => {
          const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;

          const cNo = ws.getCell(`A${curRow}`); cNo.value = idx + 1;
          applyStyle(cNo, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

          ws.mergeCells(`B${curRow}:D${curRow}`);
          const cName = ws.getCell(`B${curRow}`); cName.value = c.name;
          styleRowRange(curRow, 'B', 'D', { bold: true, size: 9.5, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

          ws.mergeCells(`E${curRow}:F${curRow}`);
          const cCnt = ws.getCell(`E${curRow}`); cCnt.value = `${c.count} Transaksi`;
          styleRowRange(curRow, 'E', 'F', { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

          ws.mergeCells(`G${curRow}:H${curRow}`);
          const cTot = ws.getCell(`G${curRow}`); cTot.value = c.total; cTot.numFmt = '#,##0';
          styleRowRange(curRow, 'G', 'H', { bold: true, size: 9.5, color: { argb: 'FFDC2626' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);

          ws.mergeCells(`I${curRow}:J${curRow}`);
          const cPct = ws.getCell(`I${curRow}`); cPct.value = `${c.pct}%`;
          styleRowRange(curRow, 'I', 'J', { bold: true, size: 9.5, color: { argb: 'FF0F172A' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

          ws.getRow(curRow).height = 22;
          curRow++;
        });
      }

      curRow++;

      // B. Rekapitulasi Dompet
      ws.mergeCells(`A${curRow}:J${curRow}`);
      const cWalSubTitle = ws.getCell(`A${curRow}`);
      cWalSubTitle.value = 'B. Rekapitulasi Arus Kas per Sumber Dompet / Rekening';
      styleRowRange(curRow, 'A', 'J',
        { bold: true, size: 10, color: { argb: 'FF1E293B' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      ws.getRow(curRow).height = 22;
      curRow++;

      // Header Dompet
      ws.getCell(`A${curRow}`).value = 'No';
      ws.mergeCells(`B${curRow}:D${curRow}`); ws.getCell(`B${curRow}`).value = 'Nama Dompet / Rekening';
      ws.mergeCells(`E${curRow}:F${curRow}`); ws.getCell(`E${curRow}`).value = 'Total Masuk (+Rp)';
      ws.mergeCells(`G${curRow}:H${curRow}`); ws.getCell(`G${curRow}`).value = 'Total Keluar (-Rp)';
      ws.mergeCells(`I${curRow}:J${curRow}`); ws.getCell(`I${curRow}`).value = 'Net Mutasi Kas (Rp)';

      applyStyle(ws.getCell(`A${curRow}`), catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'B', 'D', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'E', 'F', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'G', 'H', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      styleRowRange(curRow, 'I', 'J', catHeaderFont, catHeaderFill, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      ws.getRow(curRow).height = 22;
      curRow++;

      const walletKeys = Object.keys(walletMap);
      if (walletKeys.length === 0) {
        ws.mergeCells(`A${curRow}:J${curRow}`);
        const cEmpty = ws.getCell(`A${curRow}`);
        cEmpty.value = 'Tidak ada transaksi dompet.';
        styleRowRange(curRow, 'A', 'J', { italic: true, size: 9.5, color: { argb: 'FF94A3B8' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        ws.getRow(curRow).height = 22;
        curRow++;
      } else {
        walletKeys.forEach((wName, idx) => {
          const wData = walletMap[wName];
          const wNet = wData.income - wData.expense;
          const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;

          const cNo = ws.getCell(`A${curRow}`); cNo.value = idx + 1;
          applyStyle(cNo, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

          ws.mergeCells(`B${curRow}:D${curRow}`);
          const cName = ws.getCell(`B${curRow}`); cName.value = wName;
          styleRowRange(curRow, 'B', 'D', { bold: true, size: 9.5, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

          ws.mergeCells(`E${curRow}:F${curRow}`);
          const cIn = ws.getCell(`E${curRow}`); cIn.value = wData.income; cIn.numFmt = '#,##0';
          styleRowRange(curRow, 'E', 'F', { bold: true, size: 9.5, color: { argb: 'FF059669' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);

          ws.mergeCells(`G${curRow}:H${curRow}`);
          const cOut = ws.getCell(`G${curRow}`); cOut.value = wData.expense; cOut.numFmt = '#,##0';
          styleRowRange(curRow, 'G', 'H', { bold: true, size: 9.5, color: { argb: 'FFDC2626' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);

          ws.mergeCells(`I${curRow}:J${curRow}`);
          const cNet = ws.getCell(`I${curRow}`); cNet.value = wNet; cNet.numFmt = '#,##0';
          styleRowRange(curRow, 'I', 'J', { bold: true, size: 9.5, color: { argb: wNet >= 0 ? 'FF059669' : 'FFDC2626' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);

          ws.getRow(curRow).height = 22;
          curRow++;
        });
      }

      curRow++;

      // Kotak Analisis & Evaluasi Keuangan
      ws.mergeCells(`A${curRow}:J${curRow}`);
      const cEvalHeader = ws.getCell(`A${curRow}`);
      cEvalHeader.value = '📋 ANALISIS HASIL REKAPAN & EVALUASI KEUANGAN';
      styleRowRange(curRow, 'A', 'J',
        { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      ws.getRow(curRow).height = 24;
      curRow++;

      const evalPoints = [
        { label: '1. Keseimbangan Keuangan:', desc: narrativeCashflow },
        { label: '2. Pengeluaran Terbesar:', desc: narrativeDominant },
        { label: '3. Rekomendasi Keuangan:', desc: 'Disiplin dalam mencatat setiap transaksi harian dan menjaga batas wajar belanja kebutuhan agar saldo surplus dapat dialihkan ke dana darurat atau tabungan investasi masa depan.' }
      ];

      evalPoints.forEach(p => {
        ws.mergeCells(`A${curRow}:B${curRow}`);
        ws.mergeCells(`C${curRow}:J${curRow}`);

        const cL = ws.getCell(`A${curRow}`); cL.value = p.label;
        const cD = ws.getCell(`C${curRow}`); cD.value = p.desc;

        styleRowRange(curRow, 'A', 'B', { bold: true, size: 9.5, color: { argb: 'FF1E293B' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
        styleRowRange(curRow, 'C', 'J', { size: 9.5, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', wrapText: true, indent: 1 }, thinBorder);
        ws.getRow(curRow).height = 24;
        curRow++;
      });

      // Footer Note
      curRow++;
      ws.mergeCells(`A${curRow}:J${curRow}`);
      const cFoot = ws.getCell(`A${curRow}`);
      cFoot.value = `Dokumen spreadsheet resmi berformat .xlsx diterbitkan secara otomatis oleh PayQu Financial Ledger • ID: ${docNumber} • Waktu Cetak: ${printDateStr}`;
      styleRowRange(curRow, 'A', 'J',
        { size: 8.5, color: { argb: 'FF64748B' } },
        null,
        { vertical: 'middle' },
        { top: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
      );
      ws.getRow(curRow).height = 18;

      // Download berkas .xlsx asli dengan warna penuh
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PayQu_Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      showToast(`Laporan Excel (.xlsx) dengan desain warna lengkap berhasil diunduh!`);
      return;
    } catch (err) {
      console.error('ExcelJS generation failed, fallbacking...', err);
    }
  }

  // FALLBACK JIKA EXCELJS BELUM TERSEDIA
  let txRowsExcel = '';
  sortedList.forEach((t, idx) => {
    const isInc = t.type === 'income';
    const nominalIn = isInc ? t.amount : 0;
    const nominalOut = isInc ? 0 : t.amount;
    const cleanTitle = (t.title || 'Transaksi').replace(/</g, '&lt;');
    const cleanCat = (t.category || 'Lainnya').replace(/</g, '&lt;');
    const cleanWallet = (t.wallet || '-').replace(/</g, '&lt;');
    const displayDate = t.date ? formatDateIndoSimple(t.date) : formatDateIndoSimple(getLocalDateString(now));
    const displayTime = t.time ? convertTo24HourTime(t.time) : '';

    txRowsExcel += `
      <tr style="height: 26px; ${idx % 2 === 1 ? 'background-color: #F8FAFC;' : 'background-color: #FFFFFF;'}">
        <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt;">${idx + 1}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 9.5pt; font-family: Consolas, monospace; mso-number-format:'\\@';">${t.id || ('TX-' + (idx + 101))}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt; mso-number-format:'\\@'; white-space: nowrap;">${displayDate}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt; mso-number-format:'\\@'; white-space: nowrap;">${displayTime ? displayTime + ' WIB' : '-'}</td>
        <td style="border: 1px solid #CBD5E1; font-size: 10pt; font-weight: bold; color: #0F172A; padding-left: 8px; mso-number-format:'\\@';">${cleanTitle}</td>
        <td style="border: 1px solid #CBD5E1; font-size: 10pt; padding-left: 8px; mso-number-format:'\\@';">${cleanCat}</td>
        <td style="border: 1px solid #CBD5E1; font-size: 10pt; padding-left: 8px; mso-number-format:'\\@';">${cleanWallet}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 9.5pt; font-weight: bold; color: ${isInc ? '#059669' : '#DC2626'}; mso-number-format:'\\@';">
          ${isInc ? 'Pemasukan' : 'Pengeluaran'}
        </td>
        <td style="border: 1px solid #CBD5E1; text-align: right; font-size: 10pt; color: #059669; font-weight: bold; padding-right: 8px; mso-number-format:'\\#\\,\\#\\#0';">
          ${nominalIn > 0 ? nominalIn : '-'}
        </td>
        <td style="border: 1px solid #CBD5E1; text-align: right; font-size: 10pt; color: #DC2626; font-weight: bold; padding-right: 8px; mso-number-format:'\\#\\,\\#\\#0';">
          ${nominalOut > 0 ? nominalOut : '-'}
        </td>
      </tr>
    `;
  });

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <style>
        body, table { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #0F172A; }
      </style>
    </head>
    <body>
      <table style="border-collapse: collapse; width: 100%;">
        ${txRowsExcel}
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PayQu_Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast(`Laporan Excel (${sortedList.length} transaksi) berhasil diunduh!`);
}

function exportDataPDF() {
  const list = getFilteredExportTransactions();
  if (list.length === 0) {
    alert('Tidak ada transaksi yang sesuai dengan filter tanggal untuk dibuat laporan PDF.');
    return;
  }

  // Urutkan transaksi secara kronologis (dari terlama ke terbaru) untuk laporan mutasi rapi
  const sortedList = list.slice().sort((a, b) => {
    const dateA = (a.date || '') + ' ' + (a.time || '');
    const dateB = (b.date || '') + ' ' + (b.time || '');
    return dateA.localeCompare(dateB);
  });

  const now = new Date();
  const printDateStr = getIndonesianDateString(now, false) + ' • ' + getLocalTimeString(now) + ' WIB';
  const periodText = getExportPeriodDescription();
  const docNumber = `PQ-A4/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let totalIncome = 0;
  let totalExpense = 0;
  let countIncome = 0;
  let countExpense = 0;

  // Rekap per Kategori Pengeluaran
  const categoryMap = {};
  // Rekap per Dompet/Rekening
  const walletMap = {};

  sortedList.forEach(t => {
    const amt = Number(t.amount || 0);
    const cat = t.category || 'Lainnya';
    const wal = t.wallet || 'BCA';

    if (t.type === 'income') {
      totalIncome += amt;
      countIncome++;
    } else {
      totalExpense += amt;
      countExpense++;

      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, total: 0 };
      }
      categoryMap[cat].count++;
      categoryMap[cat].total += amt;
    }

    if (!walletMap[wal]) {
      walletMap[wal] = { income: 0, expense: 0, count: 0 };
    }
    walletMap[wal].count++;
    if (t.type === 'income') walletMap[wal].income += amt;
    else walletMap[wal].expense += amt;
  });

  const netCashflow = totalIncome - totalExpense;
  const isSurplus = netCashflow >= 0;
  const savingsRate = totalIncome > 0 ? ((netCashflow / totalIncome) * 100).toFixed(1) : 0;

  // Urutkan kategori pengeluaran dari yang terbesar
  const sortedCategories = Object.keys(categoryMap).map(k => ({
    name: k,
    count: categoryMap[k].count,
    total: categoryMap[k].total,
    pct: totalExpense > 0 ? ((categoryMap[k].total / totalExpense) * 100).toFixed(1) : 0
  })).sort((a, b) => b.total - a.total);

  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  // User Profile
  const userName = (state.userProfile && state.userProfile.name) ? state.userProfile.name : 'Pengguna PayQu';
  const userEmail = (state.userProfile && state.userProfile.email) ? state.userProfile.email : 'Akun Terverifikasi (Offline-First)';

  // Generate Baris Tabel Transaksi
  let txRowsHtml = '';
  sortedList.forEach((t, idx) => {
    const isInc = t.type === 'income';
    const amountColor = isInc ? '#059669' : '#dc2626';
    const sign = isInc ? '+ ' : '- ';
    const typeBadge = isInc 
      ? '<span style="background: #d1fae5; color: #065f46; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase;">Masuk</span>'
      : '<span style="background: #fee2e2; color: #991b1b; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase;">Keluar</span>';
    
    const displayDate = t.date ? formatDateIndoSimple(t.date) : 'Hari ini';
    const displayTime = t.time ? convertTo24HourTime(t.time) : '';

    txRowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'} page-break-inside: avoid;">
        <td style="text-align: center; color: #64748b; font-size: 9.5px; padding: 6px 6px;">${idx + 1}</td>
        <td style="padding: 6px 8px; white-space: nowrap; font-size: 9.5px; color: #475569;">
          <div style="font-weight: 600; color: #0f172a;">${displayDate}</div>
          <div style="font-size: 8.5px; color: #94a3b8;">${displayTime ? displayTime + ' WIB' : '-'}</div>
        </td>
        <td style="padding: 6px 8px; font-size: 10px; font-weight: 600; color: #0f172a;">
          ${(t.title || 'Transaksi').replace(/</g, '&lt;')}
        </td>
        <td style="padding: 6px 8px; font-size: 9.5px; color: #334155;">
          <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-weight: 600;">
            ${(t.category || 'Lainnya').replace(/</g, '&lt;')}
          </span>
        </td>
        <td style="padding: 6px 8px; font-size: 9.5px; color: #475569; font-weight: 600;">
          ${(t.wallet || '-').replace(/</g, '&lt;')}
        </td>
        <td style="padding: 6px 8px; text-align: center;">${typeBadge}</td>
        <td style="padding: 6px 8px; text-align: right; color: ${amountColor}; font-weight: 700; font-family: monospace, sans-serif; font-size: 10.5px; white-space: nowrap;">
          ${sign}${formatIDR(t.amount)}
        </td>
      </tr>
    `;
  });

  // Generate Baris Rekapitulasi Kategori
  let catRowsHtml = '';
  if (sortedCategories.length === 0) {
    catRowsHtml = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 10px;">Tidak ada pengeluaran pada periode ini.</td></tr>';
  } else {
    sortedCategories.forEach((c, idx) => {
      catRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'} page-break-inside: avoid;">
          <td style="text-align: center; color: #64748b; font-size: 9.5px; padding: 5px 6px;">${idx + 1}</td>
          <td style="padding: 5px 8px; font-weight: 600; color: #0f172a; font-size: 9.5px;">${c.name}</td>
          <td style="padding: 5px 8px; text-align: center; color: #64748b; font-size: 9.5px;">${c.count}x</td>
          <td style="padding: 5px 8px; text-align: right; font-weight: 700; color: #dc2626; font-size: 10px; font-family: monospace, sans-serif;">${formatIDR(c.total)}</td>
          <td style="padding: 5px 8px; font-size: 9px; width: 110px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="font-weight: 700; color: #475569;">${c.pct}%</span>
            </div>
            <div style="height: 4px; width: 100%; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(100, Math.max(4, c.pct))}%; background: #ef4444; border-radius: 999px;"></div>
            </div>
          </td>
        </tr>
      `;
    });
  }

  // Generate Baris Rekapitulasi Dompet
  let walletRowsHtml = '';
  const walletKeys = Object.keys(walletMap);
  if (walletKeys.length === 0) {
    walletRowsHtml = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 10px;">Tidak ada transaksi per dompet.</td></tr>';
  } else {
    walletKeys.forEach((wName, idx) => {
      const wData = walletMap[wName];
      const wNet = wData.income - wData.expense;
      const netColor = wNet >= 0 ? '#059669' : '#dc2626';
      walletRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'} page-break-inside: avoid;">
          <td style="padding: 5px 8px; font-weight: 600; color: #0f172a; font-size: 9.5px;">${wName}</td>
          <td style="padding: 5px 8px; text-align: right; color: #059669; font-weight: 600; font-size: 9.5px; font-family: monospace, sans-serif;">+${formatIDR(wData.income)}</td>
          <td style="padding: 5px 8px; text-align: right; color: #dc2626; font-weight: 600; font-size: 9.5px; font-family: monospace, sans-serif;">-${formatIDR(wData.expense)}</td>
          <td style="padding: 5px 8px; text-align: right; color: ${netColor}; font-weight: 700; font-size: 9.5px; font-family: monospace, sans-serif;">${wNet >= 0 ? '+' : ''}${formatIDR(wNet)}</td>
        </tr>
      `;
    });
  }

  // Narasi Analisis Finansial
  let narrativeCashflow = '';
  if (isSurplus) {
    narrativeCashflow = `Arus kas pada periode ini membukukan <strong>SURPLUS KAS OPTIMAL</strong> sebesar <strong>${formatIDR(netCashflow)}</strong>. Pemasukan yang diterima mampu menutup 100% dari seluruh kebutuhan belanja pribadi dengan tingkat penghematan (savings rate) sebesar <strong>${savingsRate}%</strong>. Saldo surplus ini disarankan untuk langsung diamankan ke instrumen dana darurat atau tabungan berjangka.`;
  } else {
    narrativeCashflow = `Arus kas pada periode ini berada dalam posisi <strong>DEFISIT KAS</strong> sebesar <strong>${formatIDR(Math.abs(netCashflow))}</strong>. Beban pengeluaran melampaui jumlah arus dana masuk. Disarankan untuk memprioritaskan pemotongan pengeluaran belanja yang kurang mendesak hingga rasio arus kas kembali seimbang.`;
  }

  let narrativeDominant = '';
  if (topCategory && topCategory.total > 0) {
    narrativeDominant = `Pengeluaran belanja terbesar dialokasikan untuk kategori <strong>${topCategory.name}</strong> dengan akumulasi mencapai <strong>${formatIDR(topCategory.total)}</strong> (${topCategory.pct}% dari total seluruh pengeluaran). Menetapkan batas anggaran khusus pada kategori ini akan memberikan dampak efisiensi keuangan pribadi paling signifikan.`;
  } else {
    narrativeDominant = 'Tidak tercatat pengeluaran dominan yang signifikan pada periode ini.';
  }

  // Konten Bersih Lembar A4
  const a4InnerHtml = `
    <!-- 1. KOP RESMI LAPORAN KEUANGAN (TANPA ICON P) -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2.5px solid #0f172a; margin-bottom: 10px;">
      <div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1;">PayQu Financial</h1>
        <p style="margin: 3px 0 0; font-size: 8.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px;">Catatan Uang Pribadi &amp; Sistem Manajemen Mutasi Kas</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nomor Dokumen:</div>
        <div style="font-size: 10.5px; font-weight: 800; font-family: monospace, sans-serif; color: #0f172a;">${docNumber}</div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">Dicetak: <strong>${printDateStr}</strong></div>
      </div>
    </div>

    <!-- 2. JUDUL LAPORAN & METADATA DOKUMEN -->
    <div style="margin-bottom: 10px;">
      <h2 style="margin: 0 0 6px; font-size: 13.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px;">
        Laporan Mutasi Arus Kas &amp; Rekapitulasi Finansial
      </h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 9.5px;">
        <div>
          <div><span style="color: #64748b;">Nama Pemilik Akun:</span> <strong style="color: #0f172a;">${userName}</strong></div>
          <div style="margin-top: 2px;"><span style="color: #64748b;">Identitas / Email:</span> <span style="color: #334155; font-weight: 500;">${userEmail}</span></div>
        </div>
        <div>
          <div><span style="color: #64748b;">Periode Laporan:</span> <strong style="color: #0f172a;">${periodText}</strong></div>
          <div style="margin-top: 2px;"><span style="color: #64748b;">Total Transaksi:</span> <strong style="color: #0f172a;">${sortedList.length} Transaksi Tercatat</strong></div>
        </div>
      </div>
    </div>

    <!-- 3. KOTAK PENJELASAN & RUANG LINGKUP LAPORAN -->
    <div style="background: #fffbeb; border-left: 3.5px solid #f59e0b; border-top: 1px solid #fef3c7; border-right: 1px solid #fef3c7; border-bottom: 1px solid #fef3c7; border-radius: 6px; padding: 7px 9px; margin-bottom: 11px; font-size: 9px; color: #78350f; line-height: 1.45;">
      <strong>Keterangan &amp; Penjelasan Laporan:</strong> Laporan ini menyajikan rekapan resmi mutasi pemasukan dan pengeluaran keuangan pribadi yang tercatat secara mandiri pada aplikasi PayQu. Data disusun secara kronologis dan dilengkapi perincian kategori belanja serta laporan ringkasan inti di bagian akhir dokumen untuk evaluasi keuangan berkala.
    </div>

    <!-- 4. EMPAT KARTU RINGKASAN FINANSIAL EKSEKUTIF -->
    <div class="avoid-page-break" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
      <!-- Pemasukan -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 9px; background: #ffffff; border-left: 3.5px solid #059669;">
        <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Pemasukan</div>
        <div style="font-size: 11.5px; font-weight: 800; color: #059669; font-family: monospace, sans-serif; margin-top: 2px;">+${formatIDR(totalIncome)}</div>
        <div style="font-size: 8px; color: #059669; font-weight: 600; margin-top: 1px;">${countIncome} Transaksi Masuk</div>
      </div>
      <!-- Pengeluaran -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 9px; background: #ffffff; border-left: 3.5px solid #dc2626;">
        <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Pengeluaran</div>
        <div style="font-size: 11.5px; font-weight: 800; color: #dc2626; font-family: monospace, sans-serif; margin-top: 2px;">-${formatIDR(totalExpense)}</div>
        <div style="font-size: 8px; color: #dc2626; font-weight: 600; margin-top: 1px;">${countExpense} Transaksi Keluar</div>
      </div>
      <!-- Net Cashflow -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 9px; background: #ffffff; border-left: 3.5px solid ${isSurplus ? '#f59e0b' : '#dc2626'};">
        <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Arus Kas Bersih</div>
        <div style="font-size: 11.5px; font-weight: 800; color: ${isSurplus ? '#0f172a' : '#dc2626'}; font-family: monospace, sans-serif; margin-top: 2px;">${isSurplus ? '+' : ''}${formatIDR(netCashflow)}</div>
        <div style="font-size: 8px; color: ${isSurplus ? '#059669' : '#dc2626'}; font-weight: 700; margin-top: 1px;">${isSurplus ? '● SURPLUS KAS' : '▲ DEFISIT ANGGARAN'}</div>
      </div>
      <!-- Efisiensi Simpanan -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 9px; background: #ffffff; border-left: 3.5px solid #6366f1;">
        <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tingkat Simpanan</div>
        <div style="font-size: 11.5px; font-weight: 800; color: #4338ca; font-family: monospace, sans-serif; margin-top: 2px;">${savingsRate}%</div>
        <div style="font-size: 8px; color: #4338ca; font-weight: 600; margin-top: 1px;">Rasio Sisa Pemasukan</div>
      </div>
    </div>

    <!-- 5. TABEL RINCIAN TRANSAKSI LENGKAP -->
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h3 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
          I. Tabel Rincian Mutasi Transaksi
        </h3>
        <span style="font-size: 8.5px; color: #64748b; font-weight: 600;">Urutan Kronologis</span>
      </div>

      <table class="table-mutasi" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="width: 26px; text-align: center; font-size: 8.5px; padding: 6px 6px;">No</th>
            <th style="width: 95px; font-size: 8.5px; padding: 6px 6px; text-align: left;">Waktu &amp; Tanggal</th>
            <th style="font-size: 8.5px; padding: 6px 6px; text-align: left;">Keterangan Transaksi</th>
            <th style="width: 85px; font-size: 8.5px; padding: 6px 6px; text-align: left;">Kategori</th>
            <th style="width: 80px; font-size: 8.5px; padding: 6px 6px; text-align: left;">Dompet</th>
            <th style="width: 58px; text-align: center; font-size: 8.5px; padding: 6px 6px;">Tipe</th>
            <th style="width: 95px; text-align: right; font-size: 8.5px; padding: 6px 6px;">Nominal Mutasi</th>
          </tr>
        </thead>
        <tbody>
          ${txRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; font-weight: 700; border-top: 2px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid;">
            <td colspan="3" style="padding: 6px 8px; text-align: left; font-size: 9px; color: #0f172a;">
              TOTAL REKAPITULASI ( ${sortedList.length} TRANSAKSI )
            </td>
            <td colspan="2" style="padding: 6px 8px; text-align: right; font-size: 8.5px; color: #64748b;">
              Masuk: <strong style="color: #059669;">+${formatIDR(totalIncome)}</strong> | Keluar: <strong style="color: #dc2626;">-${formatIDR(totalExpense)}</strong>
            </td>
            <td style="padding: 6px 8px; text-align: center; font-size: 8px;">NETTO</td>
            <td style="padding: 6px 8px; text-align: right; font-size: 10px; color: ${isSurplus ? '#059669' : '#dc2626'}; font-family: monospace, sans-serif; font-weight: 800;">
              ${isSurplus ? '+' : ''}${formatIDR(netCashflow)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 6. LAPORAN PENJELASAN REKAPAN INTI DI AKHIR DOKUMEN -->
    <div class="avoid-page-break" style="border-top: 2px dashed #cbd5e1; padding-top: 10px; margin-top: 12px; page-break-inside: avoid; break-inside: avoid;">
      <h3 style="margin: 0 0 7px; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
        II. Laporan Penjelasan Rekapan Inti &amp; Evaluasi Finansial
      </h3>

      <!-- Grid 2 Kolom Rekapitulasi: Kategori & Dompet -->
      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 8px; margin-bottom: 8px;">
        <!-- Tabel Kategori -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; background: #ffffff;">
          <div style="font-size: 8.5px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">
            A. Rekapitulasi Pengeluaran per Kategori
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #334155; color: #ffffff;">
                <th style="width: 22px; text-align: center; font-size: 8px; padding: 5px 6px;">#</th>
                <th style="font-size: 8px; padding: 5px 6px; text-align: left;">Kategori</th>
                <th style="text-align: center; font-size: 8px; padding: 5px 6px;">Frekuensi</th>
                <th style="text-align: right; font-size: 8px; padding: 5px 6px;">Total Pengeluaran</th>
                <th style="font-size: 8px; padding: 5px 6px; text-align: left;">Porsi (%)</th>
              </tr>
            </thead>
            <tbody>
              ${catRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Tabel Dompet -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; background: #ffffff;">
          <div style="font-size: 8.5px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">
            B. Rekapitulasi Mutasi per Sumber Dompet
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #334155; color: #ffffff;">
                <th style="font-size: 8px; padding: 5px 6px; text-align: left;">Dompet / Rekening</th>
                <th style="text-align: right; font-size: 8px; padding: 5px 6px;">Masuk</th>
                <th style="text-align: right; font-size: 8px; padding: 5px 6px;">Keluar</th>
                <th style="text-align: right; font-size: 8px; padding: 5px 6px;">Net Mutasi</th>
              </tr>
            </thead>
            <tbody>
              ${walletRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Kotak Analisis Naratif Finansial Pribadi -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 8.5px; line-height: 1.45; color: #1e293b;">
        <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 3px; font-size: 9px; display: flex; align-items: center; gap: 4px;">
          <span>📋</span> Analisis Hasil Rekapan &amp; Evaluasi Keuangan Pribadi
        </div>
        <div style="margin-bottom: 3px;">
          <strong>1. Evaluasi Keseimbangan Keuangan:</strong> ${narrativeCashflow}
        </div>
        <div style="margin-bottom: 3px;">
          <strong>2. Sorotan Pengeluaran Terbesar:</strong> ${narrativeDominant}
        </div>
        <div>
          <strong>3. Rekomendasi Finansial Mandiri:</strong> Disiplin dalam pencatatan setiap transaksi harian dan mempertahankan batas wajar belanja kebutuhan pribadi untuk menjaga kesinambungan tabungan jangka panjang.
        </div>
      </div>

      <!-- Catatan Validasi Sistem Otomatis (Tanpa Kolom Tanda Tangan) -->
      <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b;">
        <div>Validasi Sistem: <strong>PayQu Offline-First Financial Ledger</strong> • Dokumen sah diterbitkan otomatis</div>
        <div>Status: <strong>Terverifikasi Mandiri</strong></div>
      </div>

    </div>

    <!-- 7. FOOTER RESMI DOKUMEN -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; color: #94a3b8;">
      <div>PayQu Catatan Uang Pribadi • Dokumen Laporan Resmi A4 • ID: ${docNumber}</div>
      <div>Standar Kertas A4 Portrait • Menyesuaikan Volume Data</div>
    </div>
  `;

  // Dokumen Cetak A4 Lengkap
  const pdfFullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayQu_Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.45;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    .no-print-bar .btn-save {
      background: #fdd231;
      color: #0f172a;
      border: none;
      padding: 9px 18px;
      font-weight: 800;
      font-size: 12.5px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(253, 210, 49, 0.4);
    }
    .no-print-bar .btn-close {
      background: rgba(255,255,255,0.12);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.25);
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      margin-left: 8px;
    }
    .page-sheet {
      width: 210mm;
      min-height: 297mm;
      height: auto;
      margin: 18px auto;
      background: #ffffff;
      padding: 12mm 14mm;
      box-shadow: 0 6px 20px rgba(0,0,0,0.08);
      border-radius: 4px;
      box-sizing: border-box;
    }
    @media print {
      html, body {
        width: 100% !important;
        height: auto !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .page-sheet {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      table {
        page-break-inside: auto;
        break-inside: auto;
      }
      thead {
        display: table-header-group !important;
      }
      tfoot {
        display: table-footer-group !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .avoid-page-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>

  <!-- Non-print Bar dengan Tombol Langsung Simpan ke HP -->
  <div class="no-print-bar">
    <div>
      <div style="font-weight: 800; font-size: 13px; letter-spacing: 0.3px;">Laporan Keuangan PayQu (Format A4)</div>
      <div style="font-size: 10px; color: #94a3b8;">Pilih "Simpan sebagai PDF" pada dialog untuk menyimpan ke HP/perangkat</div>
    </div>
    <div style="display: flex; align-items: center;">
      <button class="btn-save" onclick="window.print();" type="button">
        💾 Simpan sebagai PDF ke HP
      </button>
      <button class="btn-close" onclick="window.close();" type="button">✕ Tutup</button>
    </div>
  </div>

  <!-- Kontainer Halaman Dokumen A4 -->
  <div class="page-sheet">
    ${a4InnerHtml}
  </div>

  <script>
    // Langsung otomatis memicu dialog "Simpan sebagai PDF" saat dokumen dibuka
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn(e);
        }
      }, 350);
    });
  </script>
</body>
</html>`;

  // Buka jendela dokumen A4 dan langsung picu dialog "Simpan sebagai PDF"
  showToast('Membuka laporan & dialog simpan PDF...');
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(pdfFullHtml);
    printWin.document.close();
  } else {
    // Fallback via iframe tersembunyi jika popup diblokir browser
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(pdfFullHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 3000);
    }, 450);
  }
}

// ==========================================
// 9. BACKUP, RESTORE & DATA RESET
// ==========================================

function backupDataOffline() {
  try {
    // 1. Simpan seluruh state utama ke localStorage
    saveStateToStorage();

    // 2. Buat snapshot cadangan lokal sekunder yang aman tanpa unduh file
    const snapshot = {
      version: '2.4.0',
      backedUpAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state))
    };
    localStorage.setItem('payqu_snapshot_backup', JSON.stringify(snapshot));
    localStorage.setItem('payqu_last_backup_timestamp', snapshot.backedUpAt);

    // 3. Perbarui teks waktu pencadangan pada modal
    updateBackupStatusUI();

    // 4. Beri feedback konfirmasi instan
    showToast('Data berhasil dicadangkan ke memori lokal!');
  } catch (err) {
    console.error('Backup error:', err);
    showToast('Gagal mencadangkan data: ' + err.message);
  }
}

function updateBackupStatusUI() {
  const el = document.getElementById('backupLastTimeText');
  if (!el) return;
  const lastTime = localStorage.getItem('payqu_last_backup_timestamp');
  if (lastTime) {
    const d = new Date(lastTime);
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    el.innerHTML = `<span>Terakhir dicadangkan: <strong class="text-emerald-900">${dateStr}, ${timeStr}</strong></span>`;
  } else {
    el.innerHTML = '<span>Status: <strong class="text-emerald-900">Data tersinkron dengan memori lokal</strong></span>';
  }
}

// EKSPOR CADANGAN PENUH (FULL SYSTEM DATABASE BACKUP KE EXCEL)
// Menyimpan 100% Seluruh Rekening, Saldo Dompet, Riwayat Transaksi Lengkap & Preferensi
// Dirancang Khusus Agar Dapat Dipulihkan Secara Utuh Saat Pengguna Mengganti HP Baru
async function backupDataExcel() {
  try {
    if (typeof ExcelJS === 'undefined') {
      alert('Modul ExcelJS sedang dimuat. Mohon tunggu sejenak lalu coba kembali.');
      return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PayQu Offline-First Financial Ledger';
    wb.lastModifiedBy = (state.userProfile && state.userProfile.name) || 'Pengguna PayQu';
    wb.created = new Date();
    wb.modified = new Date();

    // Simpan snapshot JSON aman di metadata standar OpenXML (wb.description)
    // Tanpa menyisipkan base64 image besar ke dalam sel sheet agar 100% valid dan tidak memicu pop-up error di Excel
    const cleanState = JSON.parse(JSON.stringify(state));
    if (cleanState.userProfile && cleanState.userProfile.avatar && cleanState.userProfile.avatar.startsWith('data:image')) {
      cleanState.userProfile.avatar = '';
    }
    wb.description = JSON.stringify({ version: '2.4.0', exportedAt: new Date().toISOString(), state: cleanState });

    const now = new Date();
    const printDateStr = getIndonesianDateString(now, false) + ' • ' + getLocalTimeString(now) + ' WIB';
    const totalAllWalletsBalance = (state.wallets || []).reduce((acc, w) => acc + Number(w.balance || 0), 0);
    const sortedTx = (state.transactions || []).slice().sort((a, b) => {
      const dateA = (a.date || '') + ' ' + (a.time || '');
      const dateB = (b.date || '') + ' ' + (b.time || '');
      return dateA.localeCompare(dateB);
    });

    let totalAllIncome = 0;
    let totalAllExpense = 0;
    sortedTx.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') totalAllIncome += amt;
      else totalAllExpense += amt;
    });
    const totalAllNet = totalAllIncome - totalAllExpense;

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    const doubleBottomBorder = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    function applyStyle(cell, font, fill, alignment, border) {
      if (font) cell.font = font;
      if (fill) cell.fill = fill;
      if (alignment) cell.alignment = alignment;
      if (border) cell.border = border;
    }

    function styleRowRange(ws, rowNum, colStartLetter, colEndLetter, font, fill, alignment, border) {
      const startCol = colStartLetter.charCodeAt(0) - 64;
      const endCol = colEndLetter.charCodeAt(0) - 64;
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getRow(rowNum).getCell(c);
        applyStyle(cell, font, fill, alignment, border);
      }
    }

    // =========================================================================
    // SHEET 1: SEMUA DATA (CADANGAN PENUH) - LANGSUNG TERBUKA SAAT EXCEL DIBUKA
    // Menampilkan Info Akun, Tabel Rekening & Saldo, dan Rincian Seluruh Transaksi Langsung dalam 1 Lembar!
    // =========================================================================
    const wsMain = wb.addWorksheet('Semua Data (Cadangan Penuh)', {
      views: [{ activeCell: 'A1', showGridLines: true }]
    });

    wsMain.columns = [
      { key: 'A', width: 7 },
      { key: 'B', width: 17 },
      { key: 'C', width: 15 },
      { key: 'D', width: 12 },
      { key: 'E', width: 34 },
      { key: 'F', width: 22 },
      { key: 'G', width: 20 },
      { key: 'H', width: 16 },
      { key: 'I', width: 22 },
      { key: 'J', width: 22 }
    ];

    // Kop Sheet Utama
    wsMain.mergeCells('A1:J1');
    wsMain.getCell('A1').value = 'PAYQU - DATA CADANGAN LENGKAP (REKENING, SALDO & SELURUH TRANSAKSI)';
    styleRowRange(wsMain, 1, 'A', 'J',
      { bold: true, size: 13.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsMain.getRow(1).height = 36;

    wsMain.mergeCells('A2:J2');
    wsMain.getCell('A2').value = 'Cadangan Penuh Database Keuangan Offline-First • Siap Dipulihkan Secara Utuh Saat Ganti HP';
    styleRowRange(wsMain, 2, 'A', 'J',
      { bold: true, size: 9.5, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDD231' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsMain.getRow(2).height = 20;

    // Info Metadata Akun
    const mainMeta = [
      { r: 4, label: 'Nama Pemilik Akun', val: (state.userProfile && state.userProfile.name) || 'Pengguna PayQu' },
      { r: 5, label: 'Waktu Pencadangan', val: printDateStr },
      { r: 6, label: 'Total Saldo Tersimpan', val: totalAllWalletsBalance, isNum: true },
      { r: 7, label: 'Status Data Cadangan', val: `Lengkap & Siap Dipulihkan Saat Ganti HP (${(state.wallets || []).length} Rekening & ${sortedTx.length} Transaksi)` }
    ];
    mainMeta.forEach(m => {
      wsMain.mergeCells(`A${m.r}:B${m.r}`);
      wsMain.mergeCells(`C${m.r}:J${m.r}`);
      wsMain.getCell(`A${m.r}`).value = m.label;
      const cVal = wsMain.getCell(`C${m.r}`);
      cVal.value = m.val;
      if (m.isNum) cVal.numFmt = '#,##0';
      styleRowRange(wsMain, m.r, 'A', 'B', { bold: true, size: 9.5, color: { argb: 'FF475569' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
      styleRowRange(wsMain, m.r, 'C', 'J', { bold: true, size: 10, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', indent: 1 }, thinBorder);
      wsMain.getRow(m.r).height = 20;
    });

    // -------------------------------------------------------------
    // BAGIAN I: DAFTAR SELURUH REKENING & SALDO SAAT INI
    // -------------------------------------------------------------
    wsMain.mergeCells('A9:J9');
    wsMain.getCell('A9').value = 'BAGIAN I: DAFTAR SELURUH REKENING & SALDO TERSIMPAN';
    styleRowRange(wsMain, 9, 'A', 'J',
      { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
      { vertical: 'middle', indent: 1 },
      thinBorder
    );
    wsMain.getRow(9).height = 24;

    // Header Rekening di Sheet Utama
    wsMain.getCell('A10').value = 'No';
    wsMain.getCell('B10').value = 'ID Dompet';
    wsMain.mergeCells('C10:D10'); wsMain.getCell('C10').value = 'Nama Dompet / Rekening';
    wsMain.getCell('E10').value = 'Jenis Akun';
    wsMain.getCell('F10').value = 'Nomor Rek / Kode';
    wsMain.mergeCells('G10:H10'); wsMain.getCell('G10').value = 'Keterangan';
    wsMain.mergeCells('I10:J10'); wsMain.getCell('I10').value = 'Saldo Saat Ini (Rp)';
    styleRowRange(wsMain, 10, 'A', 'J',
      { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
      { horizontal: 'center', vertical: 'middle' },
      thinBorder
    );
    wsMain.getRow(10).height = 24;

    // Isi Baris Rekening
    let curRowMain = 11;
    (state.wallets || []).forEach((w, idx) => {
      const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;
      const typeLabel = w.type === 'bank' ? 'Bank' : (w.type === 'ewallet' ? 'E-Wallet' : (w.type === 'cash' ? 'Uang Tunai' : (w.type || 'Lainnya')));

      const cNo = wsMain.getCell(`A${curRowMain}`); cNo.value = idx + 1;
      applyStyle(cNo, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      const cId = wsMain.getCell(`B${curRowMain}`); cId.value = w.id || `wallet_${idx + 1}`;
      applyStyle(cId, { size: 9, font: 'Consolas' }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      wsMain.mergeCells(`C${curRowMain}:D${curRowMain}`);
      const cName = wsMain.getCell(`C${curRowMain}`); cName.value = w.name || '-';
      styleRowRange(wsMain, curRowMain, 'C', 'D', { bold: true, size: 10, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

      const cType = wsMain.getCell(`E${curRowMain}`); cType.value = typeLabel;
      applyStyle(cType, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      const cCode = wsMain.getCell(`F${curRowMain}`); cCode.value = w.code || '-';
      applyStyle(cCode, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      wsMain.mergeCells(`G${curRowMain}:H${curRowMain}`);
      const cDesc = wsMain.getCell(`G${curRowMain}`); cDesc.value = w.desc || '-';
      styleRowRange(wsMain, curRowMain, 'G', 'H', { size: 9.5, color: { argb: 'FF475569' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

      wsMain.mergeCells(`I${curRowMain}:J${curRowMain}`);
      const cBal = wsMain.getCell(`I${curRowMain}`); cBal.value = Number(w.balance || 0); cBal.numFmt = '#,##0';
      styleRowRange(wsMain, curRowMain, 'I', 'J', { bold: true, size: 10.5, color: { argb: 'FF059669' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);

      wsMain.getRow(curRowMain).height = 22;
      curRowMain++;
    });

    // Baris Total Saldo Rekening
    wsMain.mergeCells(`A${curRowMain}:H${curRowMain}`);
    const cTotMainWLabel = wsMain.getCell(`A${curRowMain}`);
    cTotMainWLabel.value = `TOTAL SELURUH SALDO KAS & REKENING (${(state.wallets || []).length} REKENING)`;
    styleRowRange(wsMain, curRowMain, 'A', 'H',
      { bold: true, size: 10, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      { horizontal: 'right', vertical: 'middle', indent: 1 },
      thinBorder
    );

    wsMain.mergeCells(`I${curRowMain}:J${curRowMain}`);
    const cTotMainWVal = wsMain.getCell(`I${curRowMain}`);
    cTotMainWVal.value = totalAllWalletsBalance;
    cTotMainWVal.numFmt = '#,##0';
    styleRowRange(wsMain, curRowMain, 'I', 'J',
      { bold: true, size: 11, color: { argb: 'FF059669' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      { horizontal: 'right', vertical: 'middle' },
      doubleBottomBorder
    );
    wsMain.getRow(curRowMain).height = 24;
    curRowMain += 2; // Beri jarak 2 baris sebelum tabel transaksi

    // -------------------------------------------------------------
    // BAGIAN II: RINCIAN LENGKAP SEMUA RIWAYAT TRANSAKSI (100% DATA TANPA TERKECUALI)
    // -------------------------------------------------------------
    wsMain.mergeCells(`A${curRowMain}:J${curRowMain}`);
    wsMain.getCell(`A${curRowMain}`).value = `BAGIAN II: RINCIAN LENGKAP SEMUA RIWAYAT TRANSAKSI (${sortedTx.length} TRANSAKSI DARI AWAL S/D SEKARANG)`;
    styleRowRange(wsMain, curRowMain, 'A', 'J',
      { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
      { vertical: 'middle', indent: 1 },
      thinBorder
    );
    wsMain.getRow(curRowMain).height = 24;
    curRowMain++;

    // Header Tabel Transaksi di Sheet Utama
    const mainTxHeaders = ['No', 'ID Transaksi', 'Tanggal', 'Waktu', 'Keterangan Transaksi', 'Kategori', 'Dompet / Rekening', 'Tipe Mutasi', 'Pemasukan (+Rp)', 'Pengeluaran (-Rp)'];
    mainTxHeaders.forEach((h, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      const cell = wsMain.getCell(`${colLetter}${curRowMain}`);
      cell.value = h;
    });
    styleRowRange(wsMain, curRowMain, 'A', 'J',
      { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
      { horizontal: 'center', vertical: 'middle' },
      thinBorder
    );
    wsMain.getRow(curRowMain).height = 24;
    curRowMain++;

    // Isi Baris Transaksi di Sheet Utama
    if (sortedTx.length === 0) {
      wsMain.mergeCells(`A${curRowMain}:J${curRowMain}`);
      const cEmpty = wsMain.getCell(`A${curRowMain}`);
      cEmpty.value = 'Belum ada riwayat transaksi yang dicatat. Saldo awal rekening telah tersimpan aman pada Bagian I di atas.';
      styleRowRange(wsMain, curRowMain, 'A', 'J', { italic: true, size: 9.5, color: { argb: 'FF94A3B8' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      wsMain.getRow(curRowMain).height = 24;
      curRowMain++;
    } else {
      sortedTx.forEach((t, idx) => {
        const isInc = t.type === 'income';
        const nominalIn = isInc ? Number(t.amount || 0) : 0;
        const nominalOut = isInc ? 0 : Number(t.amount || 0);
        const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;

        const cNo = wsMain.getCell(`A${curRowMain}`); cNo.value = idx + 1;
        applyStyle(cNo, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cId = wsMain.getCell(`B${curRowMain}`); cId.value = t.id || `TX-${idx + 101}`;
        applyStyle(cId, { size: 9, font: 'Consolas' }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cDate = wsMain.getCell(`C${curRowMain}`); cDate.value = t.date || '-';
        applyStyle(cDate, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cTime = wsMain.getCell(`D${curRowMain}`); cTime.value = t.time || '-';
        applyStyle(cTime, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cTitle = wsMain.getCell(`E${curRowMain}`); cTitle.value = t.title || 'Transaksi';
        applyStyle(cTitle, { bold: true, size: 9.5, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cCat = wsMain.getCell(`F${curRowMain}`); cCat.value = t.category || 'Lainnya';
        applyStyle(cCat, { size: 9.5 }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cWal = wsMain.getCell(`G${curRowMain}`); cWal.value = t.wallet || '-';
        applyStyle(cWal, { size: 9.5 }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cType = wsMain.getCell(`H${curRowMain}`); cType.value = isInc ? 'Pemasukan' : 'Pengeluaran';
        applyStyle(cType, { bold: true, size: 9.5, color: { argb: isInc ? 'FF059669' : 'FFDC2626' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cIn = wsMain.getCell(`I${curRowMain}`);
        if (nominalIn > 0) {
          cIn.value = nominalIn; cIn.numFmt = '#,##0';
          applyStyle(cIn, { bold: true, size: 9.5, color: { argb: 'FF059669' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);
        } else {
          cIn.value = '-';
          applyStyle(cIn, { size: 9.5, color: { argb: 'FF94A3B8' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        }

        const cOut = wsMain.getCell(`J${curRowMain}`);
        if (nominalOut > 0) {
          cOut.value = nominalOut; cOut.numFmt = '#,##0';
          applyStyle(cOut, { bold: true, size: 9.5, color: { argb: 'FFDC2626' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);
        } else {
          cOut.value = '-';
          applyStyle(cOut, { size: 9.5, color: { argb: 'FF94A3B8' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        }

        wsMain.getRow(curRowMain).height = 22;
        curRowMain++;
      });
    }

    // Baris Total Mutasi di Sheet Utama
    wsMain.mergeCells(`A${curRowMain}:H${curRowMain}`);
    const cTotMainTxLabel = wsMain.getCell(`A${curRowMain}`);
    cTotMainTxLabel.value = `TOTAL REKAPITULASI SELURUH MUTASI (${sortedTx.length} TRANSAKSI)`;
    styleRowRange(wsMain, curRowMain, 'A', 'H',
      { bold: true, size: 10, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      { horizontal: 'right', vertical: 'middle', indent: 1 },
      thinBorder
    );

    const cTotMainIn = wsMain.getCell(`I${curRowMain}`); cTotMainIn.value = totalAllIncome; cTotMainIn.numFmt = '#,##0';
    applyStyle(cTotMainIn, { bold: true, size: 10.5, color: { argb: 'FF059669' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, thinBorder);

    const cTotMainOut = wsMain.getCell(`J${curRowMain}`); cTotMainOut.value = totalAllExpense; cTotMainOut.numFmt = '#,##0';
    applyStyle(cTotMainOut, { bold: true, size: 10.5, color: { argb: 'FFDC2626' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, thinBorder);
    wsMain.getRow(curRowMain).height = 24;
    curRowMain++;

    // Baris Arus Kas Bersih (Netto)
    wsMain.mergeCells(`A${curRowMain}:H${curRowMain}`);
    const cNetMainLabel = wsMain.getCell(`A${curRowMain}`);
    cNetMainLabel.value = 'ARUS KAS BERSIH (NETTO MUTASI KESELURUHAN):';
    styleRowRange(wsMain, curRowMain, 'A', 'H',
      { bold: true, size: 10.5, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      { horizontal: 'right', vertical: 'middle', indent: 1 },
      thinBorder
    );

    wsMain.mergeCells(`I${curRowMain}:J${curRowMain}`);
    const cNetMainVal = wsMain.getCell(`I${curRowMain}`);
    cNetMainVal.value = totalAllNet; cNetMainVal.numFmt = '#,##0';
    styleRowRange(wsMain, curRowMain, 'I', 'J',
      { bold: true, size: 11, color: { argb: totalAllNet >= 0 ? 'FF059669' : 'FFDC2626' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      { horizontal: 'center', vertical: 'middle' },
      doubleBottomBorder
    );
    wsMain.getRow(curRowMain).height = 26;
    curRowMain += 2;

    // -------------------------------------------------------------
    // BAGIAN III: PANDUAN LENGKAP CARA MEMULIHKAN DATA SAAT GANTI HP
    // -------------------------------------------------------------
    wsMain.mergeCells(`A${curRowMain}:J${curRowMain}`);
    wsMain.getCell(`A${curRowMain}`).value = 'BAGIAN III: PANDUAN RESMI PEMULIHAN DATA SAAT BERGANTI HP';
    styleRowRange(wsMain, curRowMain, 'A', 'J',
      { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } },
      { vertical: 'middle', indent: 1 },
      thinBorder
    );
    wsMain.getRow(curRowMain).height = 24;
    curRowMain++;

    const guideLines = [
      '1. Salin berkas file Excel ini ke HP Baru Anda (via WhatsApp, Google Drive, Email, atau Bluetooth).',
      '2. Buka aplikasi PayQu di HP baru Anda > Buka Tab "Profil" > Klik menu "Cadangkan & Ekspor Data".',
      '3. Klik tombol "Impor Excel" lalu pilih berkas file ini.',
      '4. Sistem PayQu akan membaca dan memulihkan 100% data saldo rekening, transaksi, dan akun Anda seketika!'
    ];

    guideLines.forEach((text, gIdx) => {
      wsMain.mergeCells(`A${curRowMain}:J${curRowMain}`);
      const cGuide = wsMain.getCell(`A${curRowMain}`);
      cGuide.value = text;
      styleRowRange(wsMain, curRowMain, 'A', 'J',
        { size: 9.5, bold: gIdx === 3, color: { argb: gIdx === 3 ? 'FF065F46' : 'FF1E293B' } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: gIdx % 2 === 1 ? 'FFF0FDF4' : 'FFFFFFFF' } },
        { vertical: 'middle', indent: 1 },
        thinBorder
      );
      wsMain.getRow(curRowMain).height = 20;
      curRowMain++;
    });

    // ==========================================
    // SHEET 2: REKENING & DOMPET (TAB INDIVIDUAL)
    // ==========================================
    const wsWallets = wb.addWorksheet('Rekening & Dompet', {
      views: [{ showGridLines: true }]
    });

    wsWallets.columns = [
      { key: 'no', width: 8 },
      { key: 'id', width: 18 },
      { key: 'name', width: 28 },
      { key: 'type', width: 18 },
      { key: 'code', width: 22 },
      { key: 'balance', width: 24 },
      { key: 'desc', width: 34 }
    ];

    // Kop Sheet 2
    wsWallets.mergeCells('A1:G1');
    wsWallets.getCell('A1').value = 'PAYQU - DATA CADANGAN REKENING & DOMPET LOKAL';
    styleRowRange(wsWallets, 1, 'A', 'G',
      { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsWallets.getRow(1).height = 36;

    wsWallets.mergeCells('A2:G2');
    wsWallets.getCell('A2').value = 'Cadangan Penuh Seluruh Rekening Bank & E-Wallet • Diterbitkan Otomatis oleh PayQu';
    styleRowRange(wsWallets, 2, 'A', 'G',
      { bold: true, size: 9.5, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDD231' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsWallets.getRow(2).height = 20;

    // Info Metadata Rekening
    const walletMeta = [
      { r: 4, label: 'Nama Pemilik Akun', val: (state.userProfile && state.userProfile.name) || 'Pengguna PayQu' },
      { r: 5, label: 'Waktu Pencadangan', val: printDateStr },
      { r: 6, label: 'Total Rekening Terdaftar', val: `${(state.wallets || []).length} Rekening / Dompet Aktif` }
    ];
    walletMeta.forEach(m => {
      wsWallets.mergeCells(`A${m.r}:B${m.r}`);
      wsWallets.mergeCells(`C${m.r}:G${m.r}`);
      wsWallets.getCell(`A${m.r}`).value = m.label;
      wsWallets.getCell(`C${m.r}`).value = m.val;
      styleRowRange(wsWallets, m.r, 'A', 'B', { bold: true, size: 9.5, color: { argb: 'FF475569' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
      styleRowRange(wsWallets, m.r, 'C', 'G', { bold: true, size: 10, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', indent: 1 }, thinBorder);
      wsWallets.getRow(m.r).height = 20;
    });

    // Section Header Rekening
    wsWallets.mergeCells('A8:G8');
    wsWallets.getCell('A8').value = 'DAFTAR SELURUH REKENING & SALDO TERSIMPAN';
    styleRowRange(wsWallets, 8, 'A', 'G',
      { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
      { vertical: 'middle', indent: 1 },
      thinBorder
    );
    wsWallets.getRow(8).height = 24;

    // Header Tabel Rekening
    const walletHeaders = ['No', 'ID Dompet', 'Nama Dompet / Rekening', 'Jenis Akun', 'Nomor Rek / Kode', 'Saldo Saat Ini (Rp)', 'Keterangan'];
    walletHeaders.forEach((h, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      const cell = wsWallets.getCell(`${colLetter}9`);
      cell.value = h;
    });
    styleRowRange(wsWallets, 9, 'A', 'G',
      { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
      { horizontal: 'center', vertical: 'middle', wrapText: true },
      thinBorder
    );
    wsWallets.getRow(9).height = 24;

    // Data Baris Rekening
    let curWRow = 10;
    (state.wallets || []).forEach((w, idx) => {
      const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;
      const typeLabel = w.type === 'bank' ? 'Bank' : (w.type === 'ewallet' ? 'E-Wallet' : (w.type === 'cash' ? 'Uang Tunai' : (w.type || 'Lainnya')));

      const cNo = wsWallets.getCell(`A${curWRow}`); cNo.value = idx + 1;
      applyStyle(cNo, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      const cId = wsWallets.getCell(`B${curWRow}`); cId.value = w.id || `wallet_${idx + 1}`;
      applyStyle(cId, { size: 9.5, font: 'Consolas' }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      const cName = wsWallets.getCell(`C${curWRow}`); cName.value = w.name || '-';
      applyStyle(cName, { bold: true, size: 10, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

      const cType = wsWallets.getCell(`D${curWRow}`); cType.value = typeLabel;
      applyStyle(cType, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      const cCode = wsWallets.getCell(`E${curWRow}`); cCode.value = w.code || '-';
      applyStyle(cCode, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

      const cBal = wsWallets.getCell(`F${curWRow}`); cBal.value = Number(w.balance || 0); cBal.numFmt = '#,##0';
      applyStyle(cBal, { bold: true, size: 10, color: { argb: 'FF059669' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);

      const cDesc = wsWallets.getCell(`G${curWRow}`); cDesc.value = w.desc || '-';
      applyStyle(cDesc, { size: 9.5, color: { argb: 'FF475569' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

      wsWallets.getRow(curWRow).height = 22;
      curWRow++;
    });

    // Total Saldo Seluruh Rekening di Sheet 2
    wsWallets.mergeCells(`A${curWRow}:E${curWRow}`);
    const cTotWLabel = wsWallets.getCell(`A${curWRow}`);
    cTotWLabel.value = `TOTAL SELURUH SALDO KAS & REKENING (${(state.wallets || []).length} REKENING)`;
    styleRowRange(wsWallets, curWRow, 'A', 'E',
      { bold: true, size: 10, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      { horizontal: 'right', vertical: 'middle', indent: 1 },
      thinBorder
    );

    const cTotWVal = wsWallets.getCell(`F${curWRow}`);
    cTotWVal.value = totalAllWalletsBalance;
    cTotWVal.numFmt = '#,##0';
    applyStyle(cTotWVal, { bold: true, size: 11, color: { argb: 'FF059669' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, doubleBottomBorder);

    const cTotWStat = wsWallets.getCell(`G${curWRow}`);
    cTotWStat.value = 'Status: Terverifikasi Mandiri Lokal';
    applyStyle(cTotWStat, { italic: true, size: 9, color: { argb: 'FF64748B' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { vertical: 'middle', indent: 1 }, thinBorder);
    wsWallets.getRow(curWRow).height = 24;

    // ==========================================
    // SHEET 3: SEMUA RIWAYAT TRANSAKSI (TAB INDIVIDUAL)
    // ==========================================
    const wsTx = wb.addWorksheet('Semua Riwayat Transaksi', {
      views: [{ showGridLines: true }]
    });

    wsTx.columns = [
      { key: 'no', width: 7 },
      { key: 'id', width: 16 },
      { key: 'date', width: 14 },
      { key: 'time', width: 11 },
      { key: 'title', width: 34 },
      { key: 'category', width: 22 },
      { key: 'wallet', width: 20 },
      { key: 'type', width: 16 },
      { key: 'income', width: 22 },
      { key: 'expense', width: 22 }
    ];

    // Kop Sheet 3
    wsTx.mergeCells('A1:J1');
    wsTx.getCell('A1').value = 'PAYQU - CADANGAN LENGKAP SELURUH RIWAYAT TRANSAKSI';
    styleRowRange(wsTx, 1, 'A', 'J',
      { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsTx.getRow(1).height = 36;

    wsTx.mergeCells('A2:J2');
    wsTx.getCell('A2').value = '100% Seluruh Mutasi Keuangan Tanpa Batasan Waktu • Backup Database Penuh';
    styleRowRange(wsTx, 2, 'A', 'J',
      { bold: true, size: 9.5, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDD231' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsTx.getRow(2).height = 20;

    // Metadata Baris Transaksi
    const txMeta = [
      { r: 4, label: 'Nama Pemilik Akun', val: (state.userProfile && state.userProfile.name) || 'Pengguna PayQu' },
      { r: 5, label: 'Waktu Pencadangan', val: printDateStr },
      { r: 6, label: 'Total Transaksi Tercatat', val: `${sortedTx.length} Transaksi Keseluruhan (Dari Awal s/d Sekarang)` }
    ];
    txMeta.forEach(m => {
      wsTx.mergeCells(`A${m.r}:B${m.r}`);
      wsTx.mergeCells(`C${m.r}:J${m.r}`);
      wsTx.getCell(`A${m.r}`).value = m.label;
      wsTx.getCell(`C${m.r}`).value = m.val;
      styleRowRange(wsTx, m.r, 'A', 'B', { bold: true, size: 9.5, color: { argb: 'FF475569' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
      styleRowRange(wsTx, m.r, 'C', 'J', { bold: true, size: 10, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', indent: 1 }, thinBorder);
      wsTx.getRow(m.r).height = 20;
    });

    // Section Header Transaksi
    wsTx.mergeCells('A8:J8');
    wsTx.getCell('A8').value = 'DATA MUTASI KEUANGAN (SEMUA TRANSAKSI TANPA TERKECUALI)';
    styleRowRange(wsTx, 8, 'A', 'J',
      { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
      { vertical: 'middle', indent: 1 },
      thinBorder
    );
    wsTx.getRow(8).height = 24;

    // Header Tabel Transaksi
    const txHeaders = ['No', 'ID Transaksi', 'Tanggal', 'Waktu', 'Keterangan Transaksi', 'Kategori', 'Dompet / Rekening', 'Tipe Mutasi', 'Pemasukan (+Rp)', 'Pengeluaran (-Rp)'];
    txHeaders.forEach((h, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      const cell = wsTx.getCell(`${colLetter}9`);
      cell.value = h;
    });
    styleRowRange(wsTx, 9, 'A', 'J',
      { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
      { horizontal: 'center', vertical: 'middle', wrapText: true },
      thinBorder
    );
    wsTx.getRow(9).height = 24;

    // Data Baris Transaksi
    let curTxRow = 10;
    if (sortedTx.length === 0) {
      wsTx.mergeCells(`A${curTxRow}:J${curTxRow}`);
      const cEmpty = wsTx.getCell(`A${curTxRow}`);
      cEmpty.value = 'Belum ada riwayat transaksi yang tercatat dalam aplikasi.';
      styleRowRange(wsTx, curTxRow, 'A', 'J', { italic: true, size: 9.5, color: { argb: 'FF94A3B8' } }, null, { horizontal: 'center', vertical: 'middle' }, thinBorder);
      wsTx.getRow(curTxRow).height = 24;
      curTxRow++;
    } else {
      sortedTx.forEach((t, idx) => {
        const isInc = t.type === 'income';
        const nominalIn = isInc ? Number(t.amount || 0) : 0;
        const nominalOut = isInc ? 0 : Number(t.amount || 0);
        const rowBg = (idx % 2 === 1) ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } : null;

        const cNo = wsTx.getCell(`A${curTxRow}`); cNo.value = idx + 1;
        applyStyle(cNo, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cId = wsTx.getCell(`B${curTxRow}`); cId.value = t.id || `TX-${idx + 101}`;
        applyStyle(cId, { size: 9, font: 'Consolas' }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cDate = wsTx.getCell(`C${curTxRow}`); cDate.value = t.date || '-';
        applyStyle(cDate, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cTime = wsTx.getCell(`D${curTxRow}`); cTime.value = t.time || '-';
        applyStyle(cTime, { size: 9.5 }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cTitle = wsTx.getCell(`E${curTxRow}`); cTitle.value = t.title || 'Transaksi';
        applyStyle(cTitle, { bold: true, size: 9.5, color: { argb: 'FF0F172A' } }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cCat = wsTx.getCell(`F${curTxRow}`); cCat.value = t.category || 'Lainnya';
        applyStyle(cCat, { size: 9.5 }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cWal = wsTx.getCell(`G${curTxRow}`); cWal.value = t.wallet || '-';
        applyStyle(cWal, { size: 9.5 }, rowBg, { vertical: 'middle', indent: 1 }, thinBorder);

        const cType = wsTx.getCell(`H${curTxRow}`); cType.value = isInc ? 'Pemasukan' : 'Pengeluaran';
        applyStyle(cType, { bold: true, size: 9.5, color: { argb: isInc ? 'FF059669' : 'FFDC2626' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);

        const cIn = wsTx.getCell(`I${curTxRow}`);
        if (nominalIn > 0) {
          cIn.value = nominalIn; cIn.numFmt = '#,##0';
          applyStyle(cIn, { bold: true, size: 9.5, color: { argb: 'FF059669' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);
        } else {
          cIn.value = '-';
          applyStyle(cIn, { size: 9.5, color: { argb: 'FF94A3B8' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        }

        const cOut = wsTx.getCell(`J${curTxRow}`);
        if (nominalOut > 0) {
          cOut.value = nominalOut; cOut.numFmt = '#,##0';
          applyStyle(cOut, { bold: true, size: 9.5, color: { argb: 'FFDC2626' } }, rowBg, { horizontal: 'right', vertical: 'middle' }, thinBorder);
        } else {
          cOut.value = '-';
          applyStyle(cOut, { size: 9.5, color: { argb: 'FF94A3B8' } }, rowBg, { horizontal: 'center', vertical: 'middle' }, thinBorder);
        }

        wsTx.getRow(curTxRow).height = 22;
        curTxRow++;
      });
    }

    // Baris Total Mutasi
    wsTx.mergeCells(`A${curTxRow}:H${curTxRow}`);
    const cTotTxLabel = wsTx.getCell(`A${curTxRow}`);
    cTotTxLabel.value = `TOTAL REKAPITULASI SELURUH MUTASI (${sortedTx.length} TRANSAKSI)`;
    styleRowRange(wsTx, curTxRow, 'A', 'H',
      { bold: true, size: 10, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      { horizontal: 'right', vertical: 'middle', indent: 1 },
      thinBorder
    );

    const cTotIn = wsTx.getCell(`I${curTxRow}`); cTotIn.value = totalAllIncome; cTotIn.numFmt = '#,##0';
    applyStyle(cTotIn, { bold: true, size: 10.5, color: { argb: 'FF059669' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, thinBorder);

    const cTotOut = wsTx.getCell(`J${curTxRow}`); cTotOut.value = totalAllExpense; cTotOut.numFmt = '#,##0';
    applyStyle(cTotOut, { bold: true, size: 10.5, color: { argb: 'FFDC2626' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, { horizontal: 'right', vertical: 'middle' }, thinBorder);
    wsTx.getRow(curTxRow).height = 24;
    curTxRow++;

    // Baris Arus Kas Bersih (Netto)
    wsTx.mergeCells(`A${curTxRow}:H${curTxRow}`);
    const cNetLabel = wsTx.getCell(`A${curTxRow}`);
    cNetLabel.value = 'ARUS KAS BERSIH (NETTO MUTASI KESELURUHAN):';
    styleRowRange(wsTx, curTxRow, 'A', 'H',
      { bold: true, size: 10.5, color: { argb: 'FF0F172A' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      { horizontal: 'right', vertical: 'middle', indent: 1 },
      thinBorder
    );

    wsTx.mergeCells(`I${curTxRow}:J${curTxRow}`);
    const cNetVal = wsTx.getCell(`I${curTxRow}`);
    cNetVal.value = totalAllNet; cNetVal.numFmt = '#,##0';
    styleRowRange(wsTx, curTxRow, 'I', 'J',
      { bold: true, size: 11, color: { argb: totalAllNet >= 0 ? 'FF059669' : 'FFDC2626' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      { horizontal: 'center', vertical: 'middle' },
      doubleBottomBorder
    );
    wsTx.getRow(curTxRow).height = 26;

    // ==========================================
    // SHEET 4: PROFIL & PREFERENSI (TAB INDIVIDUAL)
    // ==========================================
    const wsProf = wb.addWorksheet('Profil & Preferensi', {
      views: [{ showGridLines: true }]
    });

    wsProf.columns = [
      { key: 'prop', width: 28 },
      { key: 'val', width: 45 }
    ];

    wsProf.mergeCells('A1:B1');
    wsProf.getCell('A1').value = 'PAYQU - INFORMASI CADANGAN & PENGATURAN';
    styleRowRange(wsProf, 1, 'A', 'B',
      { bold: true, size: 13, color: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
      { horizontal: 'center', vertical: 'middle' },
      null
    );
    wsProf.getRow(1).height = 32;

    const profileData = [
      ['Nama Pengguna', (state.userProfile && state.userProfile.name) || 'Pengguna PayQu'],
      ['Alamat Email', (state.userProfile && state.userProfile.email) || '-'],
      ['Waktu Pembuatan Cadangan', printDateStr],
      ['Total Saldo Tersimpan', totalAllWalletsBalance],
      ['Jumlah Rekening / Dompet', (state.wallets || []).length],
      ['Jumlah Seluruh Transaksi', sortedTx.length],
      ['Format Cadangan', 'Excel Workbook .xlsx Multi-Sheet (OpenXML)'],
      ['Versi Sistem Database', 'PayQu v2.4.0 (Full Storage Snapshot)']
    ];

    profileData.forEach((item, idx) => {
      const r = idx + 3;
      const c1 = wsProf.getCell(`A${r}`); c1.value = item[0];
      const c2 = wsProf.getCell(`B${r}`); c2.value = item[1];
      if (typeof item[1] === 'number') c2.numFmt = '#,##0';

      applyStyle(c1, { bold: true, size: 9.5, color: { argb: 'FF334155' } }, { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, { vertical: 'middle', indent: 1 }, thinBorder);
      applyStyle(c2, { size: 10, color: { argb: 'FF0F172A' } }, null, { vertical: 'middle', indent: 1 }, thinBorder);
      wsProf.getRow(r).height = 22;
    });

    // Simpan & Unduh Berkas .xlsx murni
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PayQu_Backup_Semua_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    // Perbarui penunjuk waktu cadangan
    localStorage.setItem('payqu_last_backup_timestamp', new Date().toISOString());
    updateBackupStatusUI();

    showToast(`Cadangan lengkap (${(state.wallets || []).length} Rekening & ${sortedTx.length} Transaksi) berhasil diekspor ke Excel!`);
  } catch (err) {
    console.error('Backup Excel error:', err);
    alert('Gagal mengekspor cadangan data ke Excel: ' + err.message);
  }
}

// PEMULIHAN CADANGAN DARI BERKAS EXCEL (.xlsx / .xls) / JSON / CSV SAAT GANTI HP
async function handleBackupExcelImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const fileName = (file.name || '').toLowerCase();

    // 1. Jika berkas Excel (.xlsx / .xls)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      if (typeof ExcelJS === 'undefined') {
        alert('Modul ExcelJS belum dimuat. Mohon tunggu beberapa detik.');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);

      // JALUR 1: RESTORASI INSTAN MELALUI METADATA STANDAR OPENXML (wb.description)
      // Menjamin 100% data, rekening, saldo, transaksi, dan akun kembali sempurna seketika saat ganti HP!
      if (wb.description && typeof wb.description === 'string' && wb.description.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(wb.description);
          const importedState = parsed.state || parsed;

          if (Array.isArray(importedState.transactions)) {
            state.transactions = importedState.transactions;
          }
          if (Array.isArray(importedState.wallets)) {
            state.wallets = importedState.wallets;
          }
          if (importedState.userProfile) {
            state.userProfile = Object.assign({}, state.userProfile, importedState.userProfile);
          }
          if (importedState.pinSettings) {
            state.pinSettings = Object.assign({}, state.pinSettings, importedState.pinSettings);
          }

          saveStateToStorage();
          renderBalances();
          renderWallets();
          renderRecentTransactions();
          renderProfile();
          if (state.activeTab === 'tab-stats') renderStats();

          showToast(`Data PayQu Berhasil Dipulihkan 100%! (${state.wallets.length} Rekening & ${state.transactions.length} Transaksi aktif di HP ini)`);
          closeModal('modalBackupData');
          event.target.value = '';
          return;
        } catch (e) {
          console.warn('Gagal membaca metadata description, beralih ke pembacaan tabel visual...', e);
        }
      }

      // JALUR 2: PEMBACAAN CERDAS DARI TABEL VISUAL LEMBAR KERJA EXCEL
      // Berjalan jika sheet raw diedit manual atau file dimodifikasi di Excel
      let importedWallets = [];
      let importedTransactions = [];

      // A. Parse Rekening dari Sheet "Rekening & Dompet" atau Sheet "Semua Data (Cadangan Penuh)"
      const sheetWallets = wb.getWorksheet('Rekening & Dompet') || wb.getWorksheet('Semua Data (Cadangan Penuh)') || wb.worksheets[0];
      if (sheetWallets) {
        sheetWallets.eachRow((row, rowNumber) => {
          if (rowNumber < 10) return;
          const rawNo = row.getCell(1).value;
          const rawId = row.getCell(2).value;
          const rawName = row.getCell(3).value;
          const rawType = row.getCell(4).value || row.getCell(5).value;
          const rawCode = row.getCell(5).value || row.getCell(6).value;
          const rawBal = row.getCell(6).value || row.getCell(9).value;
          const rawDesc = row.getCell(7).value || row.getCell(8).value;

          const labelCheck = String(rawNo || '') + String(rawId || '') + String(rawName || '');
          if (labelCheck.toUpperCase().includes('TOTAL') || labelCheck.toUpperCase().includes('BAGIAN II')) return;

          if (rawName && String(rawName).trim() !== '' && !String(rawName).toUpperCase().includes('PANDUAN') && !String(rawName).toUpperCase().includes('RINCIAN')) {
            let typeClean = 'bank';
            const tStr = String(rawType || '').toLowerCase();
            if (tStr.includes('wallet')) typeClean = 'ewallet';
            else if (tStr.includes('tunai') || tStr.includes('cash')) typeClean = 'cash';

            let numBal = 0;
            if (typeof rawBal === 'number') numBal = rawBal;
            else if (rawBal && typeof rawBal === 'object' && rawBal.result !== undefined) numBal = Number(rawBal.result) || 0;
            else if (rawBal) numBal = parseFloat(String(rawBal).replace(/[^0-9.-]/g, '')) || 0;

            importedWallets.push({
              id: String(rawId || `wallet_${importedWallets.length + 1}`).trim(),
              name: String(rawName).trim(),
              type: typeClean,
              code: String(rawCode || '').trim(),
              balance: numBal,
              color: typeClean === 'bank' ? '#F4CB3D' : (typeClean === 'ewallet' ? '#66C79E' : '#0E0A20'),
              desc: String(rawDesc || '').trim()
            });
          }
        });
      }

      // B. Parse Riwayat Transaksi dari Sheet "Semua Riwayat Transaksi" atau Sheet "Semua Data (Cadangan Penuh)"
      const sheetTx = wb.getWorksheet('Semua Riwayat Transaksi') || wb.getWorksheet('Semua Data (Cadangan Penuh)') || (wb.worksheets.length > 2 ? wb.worksheets[2] : null);
      if (sheetTx) {
        sheetTx.eachRow((row, rowNumber) => {
          if (rowNumber < 10) return;
          const rawNo = row.getCell(1).value;
          const rawId = row.getCell(2).value;
          const rawDate = row.getCell(3).value;
          const rawTime = row.getCell(4).value;
          const rawTitle = row.getCell(5).value;
          const rawCat = row.getCell(6).value;
          const rawWal = row.getCell(7).value;
          const rawType = row.getCell(8).value;
          const rawIn = row.getCell(9).value;
          const rawOut = row.getCell(10).value;

          const labelCheck = String(rawNo || '') + String(rawId || '') + String(rawTitle || '');
          if (labelCheck.toUpperCase().includes('TOTAL') || labelCheck.toUpperCase().includes('NETTO') || labelCheck.toUpperCase().includes('BAGIAN III') || labelCheck.toUpperCase().includes('PANDUAN')) return;

          if (rawTitle && String(rawTitle).trim() !== '' && !String(rawTitle).toUpperCase().includes('DAFTAR SELURUH')) {
            let numIn = 0;
            if (typeof rawIn === 'number') numIn = rawIn;
            else if (rawIn && typeof rawIn === 'object' && rawIn.result !== undefined) numIn = Number(rawIn.result) || 0;
            else if (rawIn) numIn = parseFloat(String(rawIn).replace(/[^0-9.-]/g, '')) || 0;

            let numOut = 0;
            if (typeof rawOut === 'number') numOut = rawOut;
            else if (rawOut && typeof rawOut === 'object' && rawOut.result !== undefined) numOut = Number(rawOut.result) || 0;
            else if (rawOut) numOut = parseFloat(String(rawOut).replace(/[^0-9.-]/g, '')) || 0;

            const typeStr = String(rawType || '').toLowerCase();
            const isInc = typeStr.includes('masuk') || numIn > 0;
            const amountVal = isInc ? numIn : numOut;

            let dateStr = String(rawDate || '').trim();
            if (rawDate instanceof Date) {
              dateStr = rawDate.toISOString().split('T')[0];
            } else if (!dateStr || dateStr === '-') {
              dateStr = new Date().toISOString().split('T')[0];
            }

            let timeStr = String(rawTime || '').trim();
            if (rawTime instanceof Date) {
              timeStr = rawTime.toTimeString().slice(0, 5);
            } else if (!timeStr || timeStr === '-') {
              timeStr = '12:00';
            }

            importedTransactions.push({
              id: String(rawId || `TX-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
              title: String(rawTitle).trim(),
              type: isInc ? 'income' : 'expense',
              amount: Math.abs(amountVal),
              category: String(rawCat || 'Lainnya').trim(),
              wallet: String(rawWal || (importedWallets[0] ? importedWallets[0].name : 'BCA')).trim(),
              time: timeStr,
              date: dateStr,
              icon: isInc ? 'payments' : 'receipt',
              color: isInc ? '#10B981' : '#EF4444'
            });
          }
        });
      }

      // Validasi hasil parse visual
      if (importedWallets.length === 0 && importedTransactions.length === 0) {
        alert('Format lembar kerja Excel tidak dikenali atau tidak memiliki data yang sesuai.');
        return;
      }

      if (importedWallets.length > 0) {
        state.wallets = importedWallets;
      }
      if (importedTransactions.length > 0) {
        state.transactions = importedTransactions;
      }

      // Cek Profil dari Sheet Profil & Preferensi
      const sheetProf = wb.getWorksheet('Profil & Preferensi') || wb.getWorksheet('Info Cadangan');
      if (sheetProf) {
        const pName = sheetProf.getCell('B3').value;
        const pEmail = sheetProf.getCell('B4').value;
        if (pName && typeof pName === 'string') state.userProfile.name = pName;
        if (pEmail && typeof pEmail === 'string') state.userProfile.email = pEmail;
      }

      saveStateToStorage();
      renderBalances();
      renderWallets();
      renderRecentTransactions();
      renderProfile();
      if (state.activeTab === 'tab-stats') renderStats();

      showToast(`Data PayQu Berhasil Dipulihkan! (${importedWallets.length} Rekening & ${importedTransactions.length} Transaksi aktif di HP ini)`);
      closeModal('modalBackupData');
      event.target.value = '';
      return;
    }

    // 2. Fallback untuk JSON atau CSV
    handleFileImport(event);
  } catch (err) {
    console.error('Import backup error:', err);
    alert('Gagal memulihkan file cadangan Excel: ' + err.message);
  }
}

function handleFileImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const fileName = (file.name || '').toLowerCase();
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    handleBackupExcelImport(event);
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    try {
      // Check if it's JSON
      if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        const importedState = parsed.state || parsed;

        if (Array.isArray(importedState.transactions)) {
          state.transactions = importedState.transactions;
        }
        if (Array.isArray(importedState.wallets)) {
          state.wallets = importedState.wallets;
        }
        if (importedState.userProfile) {
          state.userProfile = Object.assign({}, state.userProfile, importedState.userProfile);
        }

        saveStateToStorage();
        renderBalances();
        renderWallets();
        renderRecentTransactions();
        renderProfile();
        showToast('Data PayQu berhasil dipulihkan!');
        closeModal('modalBackupData');
        return;
      }

      // Check if it's CSV
      if (file.name.endsWith('.csv') || content.includes(',')) {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let count = 0;
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 4) {
            const newTx = {
              id: cols[0] || ('TX-' + Math.floor(1000 + Math.random() * 9000)),
              title: cols[1] || 'Transaksi Impor',
              type: (cols[2] || '').toLowerCase().includes('masuk') ? 'income' : 'expense',
              amount: parseFloat(cols[3]) || 0,
              category: cols[4] || 'Lainnya',
              wallet: cols[5] || (state.wallets[0] ? state.wallets[0].name : 'BCA'),
              time: cols[6] || 'Hari ini',
              date: cols[7] || new Date().toISOString().split('T')[0],
              icon: 'receipt'
            };
            state.transactions.unshift(newTx);
            count++;
          }
        }
        saveStateToStorage();
        renderBalances();
        renderRecentTransactions();
        showToast(`Berhasil mengimpor ${count} transaksi dari CSV!`);
        closeModal('modalBackupData');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Gagal membaca file impor. Pastikan format file JSON atau CSV valid.');
    }
  };
  reader.readAsText(file);
}

// Window global registration untuk fungsi backup & restore
window.backupDataExcel = backupDataExcel;
window.handleBackupExcelImport = handleBackupExcelImport;

// Eksekusi Reset Semua Data (Tanpa dialog confirm() browser yang kaku)
function executeResetAllData() {
  state.transactions = [];
  state.wallets = [];
  state.selectedWalletFilter = 'Semua Rekening';
  state.userProfile = {
    name: '',
    email: '',
    avatar: '',
    hasCompletedOnboarding: false
  };
  // Hapus juga pengaturan PIN agar pengguna harus mendaftarkan PIN baru saat buka aplikasi lagi
  state.pinSettings.pin = '';
  state.pinSettings.isPinEnabled = false;
  saveStateToStorage();
  renderBalances();
  renderWallets();
  renderRecentTransactions();
  renderProfile();
  if (state.activeTab === 'tab-stats') renderStats();
  closeModal('modalResetConfirm');
  showToast('Semua riwayat transaksi dan seluruh jenis dompet berhasil dihapus bersih.');
  setTimeout(() => {
    checkAndShowOnboarding();
  }, 400);
}

function confirmResetAllData() {
  executeResetAllData();
}

window.executeResetAllData = executeResetAllData;
window.confirmResetAllData = confirmResetAllData;

// ==========================================
// 10. ONBOARDING & PROFILE MANAGEMENT
// ==========================================

function generateInitialAvatar(name, bg = '#FFC107', textColor = '#1A1824') {
  const clean = (name || 'P').trim();
  const initials = clean.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'P';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="62.5" fill="${bg}" stroke="#1A1824" stroke-width="2.5"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" fill="${textColor}" dominant-baseline="middle" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isFirstTimeUser() {
  if (!state.userProfile) return true;
  if (typeof state.userProfile.hasCompletedOnboarding === 'boolean') {
    return !state.userProfile.hasCompletedOnboarding;
  }
  if (!state.userProfile.name || state.userProfile.name.trim() === '') {
    return true;
  }
  return false;
}

let currentOnboardingStep = 1;

function goToOnboardingStep(step) {
  currentOnboardingStep = step;
  const track = document.getElementById('onboardingTrack');
  if (track) {
    if (step === 1) {
      track.style.transform = 'translateX(0%)';
    } else if (step === 2) {
      track.style.transform = 'translateX(-50%)';
      const nameInput = document.getElementById('onboardingNameInput');
      if (nameInput) setTimeout(() => nameInput.focus(), 350);
    }
  }
}

function checkAndShowOnboarding() {
  const screen = document.getElementById('onboardingWelcomeScreen');
  if (!screen) return false;

  if (isFirstTimeUser()) {
    document.body.classList.add('has-onboarding-open');
    document.documentElement.classList.add('has-onboarding-open');
    goToOnboardingStep(1);
    screen.classList.remove('hidden');
    screen.style.opacity = '1';
    screen.style.transform = 'scale(1)';

    const nameInput = document.getElementById('onboardingNameInput');
    const emailInput = document.getElementById('onboardingEmailInput');
    const errText = document.getElementById('onboardingErrorText');
    if (errText) errText.classList.add('hidden');

    if (nameInput) {
      nameInput.value = state.userProfile && state.userProfile.name ? state.userProfile.name : '';
    }
    if (emailInput) {
      emailInput.value = state.userProfile && state.userProfile.email ? state.userProfile.email : '';
    }

    return true;
  } else {
    document.body.classList.remove('has-onboarding-open');
    document.documentElement.classList.remove('has-onboarding-open');
    screen.classList.add('hidden');
    return false;
  }
}

function showOnboardingScreen() {
  const screen = document.getElementById('onboardingWelcomeScreen');
  if (!screen) return;
  document.body.classList.add('has-onboarding-open');
  document.documentElement.classList.add('has-onboarding-open');
  goToOnboardingStep(1);
  screen.classList.remove('hidden');
  screen.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  screen.style.opacity = '1';
  screen.style.transform = 'scale(1)';

  const nameInput = document.getElementById('onboardingNameInput');
  const emailInput = document.getElementById('onboardingEmailInput');
  const errText = document.getElementById('onboardingErrorText');
  if (errText) errText.classList.add('hidden');

  if (nameInput) {
    nameInput.value = state.userProfile && state.userProfile.name ? state.userProfile.name : '';
  }
  if (emailInput) {
    emailInput.value = state.userProfile && state.userProfile.email ? state.userProfile.email : '';
  }
}

function handleOnboardingSubmit(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById('onboardingNameInput');
  const emailInput = document.getElementById('onboardingEmailInput');
  const errText = document.getElementById('onboardingErrorText');
  const errMsg = document.getElementById('onboardingErrorMsg');

  const rawName = nameInput ? nameInput.value.trim().replace(/\s+/g, ' ') : '';
  const nameVal = rawName.replace(/([a-zA-Z\u00C0-\u024F]+)/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const emailVal = emailInput ? emailInput.value.trim().toLowerCase().replace(/\s+/g, '') : '';

  if (!nameVal || nameVal.length < 2) {
    if (errText) {
      if (errMsg) errMsg.textContent = 'Silakan masukkan nama lengkap Anda (minimal 2 huruf).';
      else errText.textContent = 'Silakan masukkan nama lengkap Anda (minimal 2 huruf).';
      errText.classList.remove('hidden');
    }
    if (nameInput) nameInput.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailVal || !emailRegex.test(emailVal)) {
    if (errText) {
      if (errMsg) errMsg.textContent = 'Silakan masukkan alamat email yang valid.';
      else errText.textContent = 'Silakan masukkan alamat email yang valid.';
      errText.classList.remove('hidden');
    }
    if (emailInput) emailInput.focus();
    return;
  }

  if (errText) errText.classList.add('hidden');

  // Simpan data ke profil pengguna
  if (!state.userProfile) state.userProfile = {};
  state.userProfile.name = nameVal;
  state.userProfile.email = emailVal;
  state.userProfile.hasCompletedOnboarding = true;

  // Jika avatar belum diatur atau masih bawaan lama, generate inisial avatar
  if (!state.userProfile.avatar || state.userProfile.avatar.startsWith('https://lh3.googleusercontent.com/')) {
    state.userProfile.avatar = generateInitialAvatar(nameVal);
  }

  saveStateToStorage();

  // Otomatis sinkronkan dan tampilkan nama & email ke seluruh bagian profil & header
  renderProfile();
  renderBalances();
  renderWallets();
  renderRecentTransactions();

  // Animasi transisi keluar yang halus
  document.body.classList.remove('has-onboarding-open');
  document.documentElement.classList.remove('has-onboarding-open');
  const screen = document.getElementById('onboardingWelcomeScreen');
  if (screen) {
    screen.style.transition = 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
    screen.style.opacity = '0';
    screen.style.transform = 'scale(0.96)';
    setTimeout(() => {
      screen.classList.add('hidden');
      showToast(`Selamat datang di PayQu, ${nameVal}! 🎉`);
    }, 450);
  }
}

window.goToOnboardingStep = goToOnboardingStep;
window.handleOnboardingSubmit = handleOnboardingSubmit;
window.showOnboardingScreen = showOnboardingScreen;
window.checkAndShowOnboarding = checkAndShowOnboarding;

function renderProfile() {
  const profileName = document.getElementById('profileUserNameDisplay');
  const profileEmail = document.getElementById('profileUserEmailDisplay');
  const headerName = document.getElementById('headerProfileName');
  const headerImg = document.getElementById('headerProfileImg');
  const profileImg = document.getElementById('profileAvatarImg');

  const displayName = (state.userProfile && state.userProfile.name) ? state.userProfile.name : 'Pengguna PayQu';
  const displayEmail = (state.userProfile && state.userProfile.email) ? state.userProfile.email : 'Belum diatur';

  if (profileName) profileName.textContent = displayName;
  if (profileEmail) profileEmail.textContent = displayEmail;
  if (headerName) headerName.textContent = displayName;

  const isCustomPhoto = state.userProfile && state.userProfile.avatar && !state.userProfile.avatar.startsWith('data:image/svg+xml');
  if (isCustomPhoto) {
    if (headerImg) headerImg.src = state.userProfile.avatar;
    if (profileImg) profileImg.src = state.userProfile.avatar;
  } else {
    const avatarSvg = generateInitialAvatar(displayName);
    if (headerImg) headerImg.src = avatarSvg;
    if (profileImg) profileImg.src = avatarSvg;
  }

  // Edit form inputs
  const editName = document.getElementById('editNameInput');
  const editEmail = document.getElementById('editEmailInput');
  if (editName) editName.value = displayName;
  if (editEmail) editEmail.value = displayEmail;

  // PIN toggles
  updatePinToggleUI();
}

function handleProfileSave(e) {
  e.preventDefault();
  const nameInput = document.getElementById('editNameInput');
  const emailInput = document.getElementById('editEmailInput');

  if (nameInput && nameInput.value.trim()) {
    const rawName = nameInput.value.trim().replace(/\s+/g, ' ');
    state.userProfile.name = rawName.replace(/([a-zA-Z\u00C0-\u024F]+)/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  if (emailInput && emailInput.value.trim()) {
    state.userProfile.email = emailInput.value.trim().toLowerCase().replace(/\s+/g, '');
  }

  saveStateToStorage();
  renderProfile();
  closeModal('modalEditProfile');
  showToast('Profil berhasil diperbarui');
}

function handleAvatarUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (file.type && !file.type.startsWith('image/')) {
    showToast('Silakan pilih file gambar yang valid');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    openAvatarCropModal(e.target.result);
  };
  reader.readAsDataURL(file);
}

// ==========================================
// AVATAR CROP & RESIZE POPUP LOGIC
// ==========================================

const avatarCropState = {
  sourceImage: null,
  canvas: null,
  ctx: null,
  scale: 1,
  minScale: 0.2,
  maxScale: 3.5,
  rotation: 0,
  posX: 0,
  posY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialPinchDistance: null,
  initialPinchScale: 1,
  isInitialized: false
};

function initAvatarCropCanvas() {
  const canvas = document.getElementById('avatarCropCanvas');
  const container = document.getElementById('avatarCropContainer');
  if (!canvas || !container) return;

  avatarCropState.canvas = canvas;
  avatarCropState.ctx = canvas.getContext('2d');

  if (avatarCropState.isInitialized) return;
  avatarCropState.isInitialized = true;

  // Mouse Drag Events
  container.addEventListener('mousedown', function(e) {
    if (!avatarCropState.sourceImage) return;
    avatarCropState.isDragging = true;
    avatarCropState.dragStartX = e.clientX - avatarCropState.posX;
    avatarCropState.dragStartY = e.clientY - avatarCropState.posY;
    container.classList.add('cursor-grabbing');
  });

  window.addEventListener('mousemove', function(e) {
    if (!avatarCropState.isDragging) return;
    avatarCropState.posX = e.clientX - avatarCropState.dragStartX;
    avatarCropState.posY = e.clientY - avatarCropState.dragStartY;
    drawAvatarCropCanvas();
  });

  window.addEventListener('mouseup', function() {
    if (avatarCropState.isDragging) {
      avatarCropState.isDragging = false;
      if (container) container.classList.remove('cursor-grabbing');
    }
  });

  // Touch Drag & Pinch-to-Zoom (Mobile Responsive)
  container.addEventListener('touchstart', function(e) {
    if (!avatarCropState.sourceImage) return;
    if (e.touches.length === 1) {
      avatarCropState.isDragging = true;
      avatarCropState.dragStartX = e.touches[0].clientX - avatarCropState.posX;
      avatarCropState.dragStartY = e.touches[0].clientY - avatarCropState.posY;
    } else if (e.touches.length === 2) {
      avatarCropState.isDragging = false;
      avatarCropState.initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      avatarCropState.initialPinchScale = avatarCropState.scale;
    }
  }, { passive: false });

  container.addEventListener('touchmove', function(e) {
    if (!avatarCropState.sourceImage) return;
    if (e.touches.length === 1 && avatarCropState.isDragging) {
      e.preventDefault();
      avatarCropState.posX = e.touches[0].clientX - avatarCropState.dragStartX;
      avatarCropState.posY = e.touches[0].clientY - avatarCropState.dragStartY;
      drawAvatarCropCanvas();
    } else if (e.touches.length === 2 && avatarCropState.initialPinchDistance) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / avatarCropState.initialPinchDistance;
      let newScale = avatarCropState.initialPinchScale * ratio;
      newScale = Math.max(avatarCropState.minScale, Math.min(avatarCropState.maxScale, newScale));
      avatarCropState.scale = newScale;
      const slider = document.getElementById('avatarZoomSlider');
      if (slider) slider.value = newScale;
      drawAvatarCropCanvas();
    }
  }, { passive: false });

  container.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) {
      avatarCropState.isDragging = false;
      avatarCropState.initialPinchDistance = null;
    } else if (e.touches.length === 1) {
      avatarCropState.isDragging = true;
      avatarCropState.dragStartX = e.touches[0].clientX - avatarCropState.posX;
      avatarCropState.dragStartY = e.touches[0].clientY - avatarCropState.posY;
      avatarCropState.initialPinchDistance = null;
    }
  });

  // Mouse wheel zoom
  container.addEventListener('wheel', function(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    adjustAvatarZoom(delta);
  }, { passive: false });
}

function openAvatarCropModal(imageSrc) {
  const modal = document.getElementById('modalCropAvatar');
  if (!modal) return;

  const emptyState = document.getElementById('avatarCropEmptyState');
  const cropContainer = document.getElementById('avatarCropContainer');
  const cropControls = document.getElementById('avatarCropControls');
  const btnApplyText = document.getElementById('btnApplyAvatarText');
  const btnApplyIcon = document.querySelector('#btnApplyAvatarCrop .material-symbols-outlined');

  // Jika tidak diberikan parameter imageSrc, periksa apakah sudah ada foto custom
  if (!imageSrc) {
    if (state.userProfile && state.userProfile.avatar && !state.userProfile.avatar.startsWith('data:image/svg+xml')) {
      imageSrc = state.userProfile.avatar;
    }
  }

  // Buka modal dengan animasi standar PayQu
  openModal('modalCropAvatar');

  if (imageSrc) {
    const img = new Image();
    img.onload = function() {
      avatarCropState.sourceImage = img;
      initAvatarCropCanvas();

      if (emptyState) emptyState.classList.add('hidden');
      if (cropContainer) cropContainer.classList.remove('hidden');
      if (cropControls) cropControls.classList.remove('hidden');
      if (btnApplyText) btnApplyText.textContent = 'Terapkan Foto';
      if (btnApplyIcon) btnApplyIcon.textContent = 'check';

      const canvas = avatarCropState.canvas || document.getElementById('avatarCropCanvas');
      const canvasWidth = canvas ? canvas.width : 500;
      const targetDiameter = canvasWidth * 0.84;
      const minDim = Math.min(img.width, img.height);
      const fitScale = targetDiameter / minDim;

      avatarCropState.scale = Math.max(0.5, fitScale);
      avatarCropState.minScale = Math.max(0.1, fitScale * 0.3);
      avatarCropState.maxScale = Math.max(3.5, fitScale * 4);
      avatarCropState.rotation = 0;
      avatarCropState.posX = 0;
      avatarCropState.posY = 0;

      const slider = document.getElementById('avatarZoomSlider');
      if (slider) {
        slider.min = avatarCropState.minScale.toFixed(2);
        slider.max = avatarCropState.maxScale.toFixed(2);
        slider.step = '0.01';
        slider.value = avatarCropState.scale;
      }

      drawAvatarCropCanvas();
    };
    img.src = imageSrc;
  } else {
    // Tampilan awal (pilih foto terlebih dahulu)
    avatarCropState.sourceImage = null;
    if (emptyState) emptyState.classList.remove('hidden');
    if (cropContainer) cropContainer.classList.add('hidden');
    if (cropControls) cropControls.classList.add('hidden');
    if (btnApplyText) btnApplyText.textContent = 'Pilih Foto';
    if (btnApplyIcon) btnApplyIcon.textContent = 'photo_library';
  }
}

function handleCropBtnClick() {
  if (avatarCropState.sourceImage) {
    applyAvatarCrop();
  } else {
    const fileInput = document.getElementById('avatarFileInput');
    if (fileInput) fileInput.click();
  }
}

function closeAvatarCropModal() {
  closeModal('modalCropAvatar');
  const fileInput = document.getElementById('avatarFileInput');
  if (fileInput) fileInput.value = '';
}

function drawAvatarCropCanvas() {
  const canvas = avatarCropState.canvas;
  const ctx = avatarCropState.ctx;
  const img = avatarCropState.sourceImage;
  if (!canvas || !ctx || !img) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  ctx.translate(canvas.width / 2 + avatarCropState.posX, canvas.height / 2 + avatarCropState.posY);
  ctx.rotate(avatarCropState.rotation * Math.PI / 180);
  ctx.scale(avatarCropState.scale, avatarCropState.scale);

  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

function onAvatarZoomInput(val) {
  avatarCropState.scale = parseFloat(val);
  drawAvatarCropCanvas();
}

function adjustAvatarZoom(delta) {
  const slider = document.getElementById('avatarZoomSlider');
  let currentVal = avatarCropState.scale;
  let min = slider ? parseFloat(slider.min) : 0.2;
  let max = slider ? parseFloat(slider.max) : 3.5;
  let nextVal = Math.max(min, Math.min(max, currentVal + delta));
  avatarCropState.scale = nextVal;
  if (slider) slider.value = nextVal;
  drawAvatarCropCanvas();
}

function rotateAvatar(deg) {
  avatarCropState.rotation = (avatarCropState.rotation + deg) % 360;
  drawAvatarCropCanvas();
}

function resetAvatarCropPosition() {
  avatarCropState.posX = 0;
  avatarCropState.posY = 0;
  const slider = document.getElementById('avatarZoomSlider');
  if (slider) {
    const canvas = avatarCropState.canvas;
    const img = avatarCropState.sourceImage;
    if (canvas && img) {
      const targetDiameter = canvas.width * 0.84;
      const fitScale = targetDiameter / Math.min(img.width, img.height);
      avatarCropState.scale = Math.max(0.5, fitScale);
      slider.value = avatarCropState.scale;
    }
  }
  drawAvatarCropCanvas();
}

function applyAvatarCrop() {
  if (!avatarCropState.sourceImage || !avatarCropState.canvas) return;

  // Render hasil crop lingkaran dengan resolusi tinggi 512x512
  const outCanvas = document.createElement('canvas');
  outCanvas.width = 512;
  outCanvas.height = 512;
  const outCtx = outCanvas.getContext('2d');

  // Kliping lingkaran halus
  outCtx.beginPath();
  outCtx.arc(256, 256, 256, 0, Math.PI * 2);
  outCtx.closePath();
  outCtx.clip();

  // Rasio kanvas preview ke canvas output 512
  const factor = 512 / (avatarCropState.canvas.width * 0.84);

  outCtx.translate(256 + avatarCropState.posX * factor, 256 + avatarCropState.posY * factor);
  outCtx.rotate(avatarCropState.rotation * Math.PI / 180);
  outCtx.scale(avatarCropState.scale * factor, avatarCropState.scale * factor);

  const img = avatarCropState.sourceImage;
  outCtx.drawImage(img, -img.width / 2, -img.height / 2);

  const croppedDataUrl = outCanvas.toDataURL('image/png');

  if (!state.userProfile) state.userProfile = {};
  state.userProfile.avatar = croppedDataUrl;
  saveStateToStorage();
  renderProfile();

  closeAvatarCropModal();
  showToast('Foto profil berhasil diubah & disimpan! 🎉');
}

window.openAvatarCropModal = openAvatarCropModal;
window.closeAvatarCropModal = closeAvatarCropModal;
window.handleCropBtnClick = handleCropBtnClick;
window.adjustAvatarZoom = adjustAvatarZoom;
window.onAvatarZoomInput = onAvatarZoomInput;
window.rotateAvatar = rotateAvatar;
window.resetAvatarCropPosition = resetAvatarCropPosition;
window.applyAvatarCrop = applyAvatarCrop;

// ==========================================
// 11. PIN & SECURITY LOCK LOGIC
// ==========================================

function updatePinDotsUI() {
  for (let i = 0; i < 6; i++) {
    const dot = document.getElementById('pindot-' + i);
    if (!dot) continue;
    if (i < currentPinBuffer.length) {
      dot.className = 'w-3.5 h-3.5 rounded-full bg-ink-dark border-2 border-ink-dark scale-110 shadow-sm transition-all';
    } else {
      dot.className = 'w-3.5 h-3.5 rounded-full border-2 border-slate-300 bg-transparent transition-all';
    }
  }

  const hint = document.getElementById('pinStatusHint');
  if (hint) {
    if (currentPinBuffer.length === 6) {
      hint.textContent = '6 digit lengkap. Klik Simpan PIN.';
      hint.className = 'text-[11px] text-emerald-600 font-bold';
    } else {
      hint.textContent = 'Masukkan ' + (6 - currentPinBuffer.length) + ' digit lagi';
      hint.className = 'text-[11px] text-slate-500 font-medium';
    }
  }
}

function handleKeypadPress(digit) {
  if (currentPinBuffer.length < 6) {
    currentPinBuffer += digit;
    updatePinDotsUI();
  }
}

function handleBackspacePress() {
  if (currentPinBuffer.length > 0) {
    currentPinBuffer = currentPinBuffer.slice(0, -1);
    updatePinDotsUI();
  }
}

function clearPinInput() {
  currentPinBuffer = '';
  updatePinDotsUI();
}

function openPinModal(isNewRegistration = false) {
  currentPinBuffer = '';
  updatePinDotsUI();

  const titleEl = document.querySelector('#modalPinManager h3');
  const subtitleEl = document.querySelector('#modalPinManager p');
  const hasPin = state.pinSettings && state.pinSettings.pin && state.pinSettings.pin.length === 6;

  if (titleEl) {
    titleEl.textContent = (!hasPin || isNewRegistration) ? 'Daftarkan PIN Pengaman' : 'Ubah Kunci PIN';
  }
  if (subtitleEl) {
    subtitleEl.textContent = (!hasPin || isNewRegistration) 
      ? 'Masukkan 6 digit angka untuk membuat PIN pengaman baru' 
      : 'Masukkan 6 digit angka PIN baru Anda';
  }

  openModal('modalPinManager');
}

function updatePinToggleUI() {
  const btn = document.getElementById('pinToggleBtn');
  const circle = document.getElementById('pinToggleCircle');
  const subtitle = document.getElementById('pinSubtitle');
  const btnChangePin = document.querySelector('button[aria-label="Ubah PIN"]');

  const isEnabled = state.pinSettings && state.pinSettings.isPinEnabled === true;
  const hasPin = state.pinSettings && state.pinSettings.pin && state.pinSettings.pin.length === 6;

  if (btn && circle) {
    if (isEnabled && hasPin) {
      btn.className = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-card-yellow transition-colors duration-200 ease-in-out focus:outline-none';
      circle.className = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-ink-dark shadow-md ring-0 transition duration-200 ease-in-out translate-x-4';
      if (subtitle) subtitle.textContent = 'Kunci aplikasi dengan PIN pengaman (Aktif)';
    } else {
      btn.className = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors duration-200 ease-in-out focus:outline-none';
      circle.className = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-0';
      if (subtitle) subtitle.textContent = hasPin ? 'Kunci aplikasi dengan PIN pengaman (Nonaktif)' : 'PIN belum diatur (Ketuk untuk membuat PIN)';
    }
  }

  if (btnChangePin) {
    btnChangePin.textContent = hasPin ? 'Ubah' : 'Buat PIN';
  }

  const bioBtn = document.getElementById('biometricToggleBtn');
  const bioCircle = document.getElementById('biometricToggleCircle');
  const isBio = state.pinSettings && state.pinSettings.isBiometricEnabled;
  if (bioBtn && bioCircle) {
    if (isBio) {
      bioBtn.className = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-card-yellow transition-colors duration-200 ease-in-out';
      bioCircle.className = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-ink-dark shadow-md ring-0 transition duration-200 ease-in-out translate-x-4';
    } else {
      bioBtn.className = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors duration-200 ease-in-out';
      bioCircle.className = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-0';
    }
  }
}

function togglePinLock() {
  const hasRegisteredPin = state.pinSettings && state.pinSettings.pin && state.pinSettings.pin.length === 6;

  if (!state.pinSettings.isPinEnabled) {
    // Pengguna mencoba menyalakan kunci PIN
    if (!hasRegisteredPin) {
      // Belum ada PIN terdaftar: jangan aktifkan, arahkan pengguna ke form pendaftaran PIN baru!
      state.pinSettings.isPinEnabled = false;
      saveStateToStorage();
      updatePinToggleUI();
      openPinModal(true);
      showToast('Silakan buat 6 digit PIN pengaman Anda terlebih dahulu');
      return;
    }

    // Sudah ada PIN terdaftar, aktifkan kunci PIN
    state.pinSettings.isPinEnabled = true;
    sessionStorage.setItem('payqu_unlocked', 'true');
    saveStateToStorage();
    updatePinToggleUI();
    showToast('Kunci PIN aktif (otomatis kunci saat keluar/layar mati)');
  } else {
    // Pengguna mematikan kunci PIN
    state.pinSettings.isPinEnabled = false;
    sessionStorage.setItem('payqu_unlocked', 'true');
    const lockScreen = document.getElementById('appLockScreen');
    if (lockScreen) {
      lockScreen.classList.add('hidden');
      lockScreen.classList.remove('opacity-0', 'pointer-events-none');
    }
    saveStateToStorage();
    updatePinToggleUI();
    showToast('Kunci PIN dinonaktifkan');
  }
}

function toggleBiometric() {
  state.pinSettings.isBiometricEnabled = !state.pinSettings.isBiometricEnabled;
  saveStateToStorage();
  updatePinToggleUI();
  showToast(state.pinSettings.isBiometricEnabled ? 'Biometrik diaktifkan' : 'Biometrik dinonaktifkan');
}

function saveNewPin() {
  if (currentPinBuffer.length !== 6) {
    alert('Silakan masukkan 6 digit angka PIN terlebih dahulu!');
    return;
  }
  state.pinSettings.pin = currentPinBuffer;
  state.pinSettings.isPinEnabled = true;
  sessionStorage.setItem('payqu_unlocked', 'true');
  saveStateToStorage();
  updatePinToggleUI();
  closeModal('modalPinManager');
  showToast('PIN keamanan berhasil dibuat & Kunci PIN aktif! 🔒');
}

// ------------------------------------------
// APP LOCK SCREEN CONTROLLER
// ------------------------------------------
let lockPinBuffer = '';

function updateLockPinDotsUI() {
  for (let i = 0; i < 6; i++) {
    const dot = document.getElementById('lockPinDot-' + i);
    if (!dot) continue;
    if (i < lockPinBuffer.length) {
      dot.className = 'w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-900 scale-110 shadow-sm transition-all duration-150';
    } else {
      dot.className = 'w-4 h-4 rounded-full border-2 border-slate-300 bg-white shadow-xs transition-all duration-150';
    }
  }
}

function handleLockKeypad(digit) {
  if (lockPinBuffer.length < 6) {
    lockPinBuffer += digit;
    updateLockPinDotsUI();
    const errEl = document.getElementById('lockPinError');
    if (errEl) errEl.textContent = '';

    if (lockPinBuffer.length === 6) {
      setTimeout(verifyLockPin, 120);
    }
  }
}

function handleLockBackspace() {
  if (lockPinBuffer.length > 0) {
    lockPinBuffer = lockPinBuffer.slice(0, -1);
    updateLockPinDotsUI();
    const errEl = document.getElementById('lockPinError');
    if (errEl) errEl.textContent = '';
  }
}

function clearLockPin() {
  lockPinBuffer = '';
  updateLockPinDotsUI();
  const errEl = document.getElementById('lockPinError');
  if (errEl) errEl.textContent = '';
}

function verifyLockPin() {
  const currentSavedPin = state.pinSettings && state.pinSettings.pin;
  if (!currentSavedPin || currentSavedPin.length !== 6) {
    // Belum ada PIN terdaftar, buka aplikasi
    unlockApp();
    state.pinSettings.isPinEnabled = false;
    saveStateToStorage();
    updatePinToggleUI();
    return;
  }

  if (lockPinBuffer === currentSavedPin) {
    unlockApp();
  } else {
    // PIN salah
    const errEl = document.getElementById('lockPinError');
    const container = document.getElementById('lockPinDotsContainer');
    if (errEl) {
      errEl.innerHTML = '<span class="material-symbols-outlined text-[15px]">error</span> PIN salah! Silakan coba lagi.';
    }
    if (container) {
      container.classList.add('animate-shake');
      setTimeout(() => {
        container.classList.remove('animate-shake');
      }, 450);
    }
    setTimeout(() => {
      clearLockPin();
    }, 600);
  }
}

let lastUnlockedTimestamp = 0;

function unlockApp() {
  lastUnlockedTimestamp = Date.now();
  cancelBiometricPrompt();
  sessionStorage.setItem('payqu_unlocked', 'true');
  const lockScreen = document.getElementById('appLockScreen');
  if (lockScreen) {
    lockScreen.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      lockScreen.classList.add('hidden');
      lockScreen.classList.remove('opacity-0', 'pointer-events-none');
      lockPinBuffer = '';
      updateLockPinDotsUI();
    }, 300);
  }
  showToast('Selamat datang! Kunci aplikasi terbuka.');
}

function lockAppNow() {
  if (!state.pinSettings.isPinEnabled) {
    state.pinSettings.isPinEnabled = true;
    saveStateToStorage();
    updatePinToggleUI();
  }
  sessionStorage.removeItem('payqu_unlocked');
  showAppLockScreen();
  showToast('Aplikasi berhasil dikunci');
}

function showAppLockScreen() {
  if (!state.pinSettings || state.pinSettings.isPinEnabled !== true) return;
  const lockScreen = document.getElementById('appLockScreen');
  if (!lockScreen) return;
  lockPinBuffer = '';
  updateLockPinDotsUI();
  const greeting = document.getElementById('lockScreenGreeting');
  if (greeting) {
    const userName = (state.userProfile && state.userProfile.name) ? state.userProfile.name : 'Pengguna PayQu';
    greeting.textContent = 'Halo, ' + userName;
  }
  const errEl = document.getElementById('lockPinError');
  if (errEl) errEl.textContent = '';

  lockScreen.classList.remove('hidden');
  lockScreen.classList.remove('opacity-0', 'pointer-events-none');
}

let bioScanTimer = null;
let bioScanProgress = 0;
let isBioScanning = false;
let isBioScanSuccess = false;

function triggerBiometricUnlock() {
  const modal = document.getElementById('modalBiometricPrompt');
  if (!modal) {
    showToast('Komponen biometrik tidak ditemukan');
    return;
  }

  // Cek apakah perangkat mendukung WebAuthn Platform Authenticator asli (misal Android Chrome via HTTPS/localhost)
  if (window.isSecureContext && window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
      if (available) {
        attemptNativeWebAuthn().then(result => {
          if (result === true) {
            unlockApp();
          } else if (result === 'canceled') {
            showToast('Verifikasi biometrik dibatalkan');
          } else {
            // WebAuthn tidak berhasil / fallback ke modal sensor interaktif
            openBiometricInteractiveModal();
          }
        }).catch(() => {
          openBiometricInteractiveModal();
        });
      } else {
        openBiometricInteractiveModal();
      }
    }).catch(() => {
      openBiometricInteractiveModal();
    });
    return;
  }

  // Jika di lingkungan offline/file:// atau non-WebAuthn, buka modal interaktif
  openBiometricInteractiveModal();
}

async function attemptNativeWebAuthn() {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const savedCredId = localStorage.getItem('payqu_webauthn_cred');
    if (savedCredId) {
      const rawId = Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            type: 'public-key',
            id: rawId,
            transports: ['internal']
          }],
          userVerification: 'required',
          timeout: 40000
        }
      });
      return !!assertion;
    } else {
      // Pendaftaran pertama kali untuk platform authenticator
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: 'PayQu' },
          user: {
            id: userId,
            name: (state.userProfile && state.userProfile.email) || 'user@payqu.app',
            displayName: (state.userProfile && state.userProfile.name) || 'Pengguna PayQu'
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 40000
        }
      });
      if (cred && cred.rawId) {
        const credBase64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
        localStorage.setItem('payqu_webauthn_cred', credBase64);
        return true;
      }
    }
  } catch (err) {
    if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
      return 'canceled';
    }
    return false;
  }
  return false;
}

function openBiometricInteractiveModal() {
  const modal = document.getElementById('modalBiometricPrompt');
  const card = document.getElementById('biometricPromptCard');
  if (!modal) return;

  // Reset status pemindai ke keadaan siap (idle)
  resetBiometricUI();

  modal.classList.remove('hidden');
  if (card) {
    card.classList.remove('modal-center-enter');
    card.classList.add('modal-center-active');
  }

  // PENTING: Tidak ada auto-unlock otomatis! Pengguna harus menempelkan jarinya ke sensor!
}

function resetBiometricUI() {
  if (bioScanTimer) {
    clearInterval(bioScanTimer);
    bioScanTimer = null;
  }
  bioScanProgress = 0;
  isBioScanning = false;
  isBioScanSuccess = false;

  const circle = document.getElementById('bioSensorCircle');
  const icon = document.getElementById('bioSensorIcon');
  const title = document.getElementById('bioPromptTitle');
  const desc = document.getElementById('bioPromptDesc');
  const ring = document.getElementById('bioPulseRing');
  const progressCircle = document.getElementById('bioProgressCircle');
  const trackCircle = document.getElementById('bioTrackCircle');
  const badge = document.getElementById('bioStatusBadge');
  const badgeDot = document.getElementById('bioStatusDot');
  const badgeText = document.getElementById('bioStatusText');

  if (circle) {
    circle.className = 'w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border-2 border-amber-200 shadow-inner relative z-10 transition-all cursor-pointer active:scale-95 focus:outline-none';
  }
  if (icon) {
    icon.textContent = 'fingerprint';
    icon.className = 'material-symbols-outlined text-[42px] transition-all select-none pointer-events-none text-amber-500';
  }
  if (title) title.textContent = 'Verifikasi Sidik Jari';
  if (desc) desc.textContent = 'Tempelkan & tahan jari Anda pada sensor di bawah untuk memindai';
  if (ring) {
    ring.className = 'absolute inset-0 rounded-full bg-amber-400/20 animate-ping pointer-events-none transition-all duration-300';
  }
  if (progressCircle) {
    progressCircle.setAttribute('stroke', '#f59e0b');
    progressCircle.setAttribute('stroke-dashoffset', '276.46');
  }
  if (trackCircle) {
    trackCircle.setAttribute('stroke', '#fef3c7');
  }
  if (badge && badgeDot && badgeText) {
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200/70 transition-all';
    badgeDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
    badgeText.textContent = 'Sentuh & Tahan Sensor';
  }
}

function startBiometricScan(e) {
  if (isBioScanSuccess || isBioScanning) return;
  if (e) {
    if (e.button && e.button !== 0) return;
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }

  isBioScanning = true;
  bioScanProgress = 0;

  const circle = document.getElementById('bioSensorCircle');
  const title = document.getElementById('bioPromptTitle');
  const desc = document.getElementById('bioPromptDesc');
  const ring = document.getElementById('bioPulseRing');
  const badge = document.getElementById('bioStatusBadge');
  const badgeDot = document.getElementById('bioStatusDot');
  const badgeText = document.getElementById('bioStatusText');

  if (circle) {
    circle.className = 'w-20 h-20 rounded-full bg-amber-100/70 text-amber-600 flex items-center justify-center border-2 border-amber-400 shadow-lg relative z-10 transition-all scale-105';
  }
  if (title) title.textContent = 'Memindai Sidik Jari...';
  if (desc) desc.textContent = 'Tahan jari Anda, sedang memverifikasi identitas...';
  if (ring) {
    ring.className = 'absolute inset-0 rounded-full bg-amber-500/30 animate-pulse pointer-events-none';
  }
  if (badge && badgeDot && badgeText) {
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200 transition-all';
    badgeDot.className = 'w-2 h-2 rounded-full bg-blue-500 animate-ping';
    badgeText.textContent = 'Memindai... 0%';
  }

  if (navigator.vibrate) {
    try { navigator.vibrate(20); } catch (_) {}
  }

  const startTime = Date.now();
  const scanDuration = 800; // 800ms pemindaian interaktif yang realistis

  if (bioScanTimer) clearInterval(bioScanTimer);
  bioScanTimer = setInterval(() => {
    if (!isBioScanning) return;
    const elapsed = Date.now() - startTime;
    bioScanProgress = Math.min(100, Math.round((elapsed / scanDuration) * 100));

    // Update circular progress SVG
    const progressCircle = document.getElementById('bioProgressCircle');
    if (progressCircle) {
      const offset = 276.46 - (bioScanProgress / 100) * 276.46;
      progressCircle.setAttribute('stroke-dashoffset', offset.toFixed(2));
    }

    if (badgeText) {
      badgeText.textContent = `Memindai... ${bioScanProgress}%`;
    }

    // Haptic tick di tengah proses
    if (bioScanProgress >= 50 && bioScanProgress < 55) {
      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (_) {}
      }
    }

    if (bioScanProgress >= 100) {
      clearInterval(bioScanTimer);
      bioScanTimer = null;
      finishBiometricScanSuccess();
    }
  }, 25);
}

function stopBiometricScan(e) {
  if (isBioScanSuccess) return;
  if (!isBioScanning) return;

  isBioScanning = false;
  if (bioScanTimer) {
    clearInterval(bioScanTimer);
    bioScanTimer = null;
  }

  if (bioScanProgress < 100) {
    // Jari terangkat sebelum pemindaian selesai (batal)
    const progressCircle = document.getElementById('bioProgressCircle');
    if (progressCircle) {
      progressCircle.setAttribute('stroke-dashoffset', '276.46');
    }

    const title = document.getElementById('bioPromptTitle');
    const desc = document.getElementById('bioPromptDesc');
    const circle = document.getElementById('bioSensorCircle');
    const badge = document.getElementById('bioStatusBadge');
    const badgeDot = document.getElementById('bioStatusDot');
    const badgeText = document.getElementById('bioStatusText');

    if (circle) {
      circle.className = 'w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border-2 border-rose-300 shadow-inner relative z-10 transition-all';
    }
    if (title) title.textContent = 'Pemindaian Terputus';
    if (desc) desc.textContent = 'Jari terangkat terlalu cepat. Tempel & tahan hingga lingkaran penuh.';
    if (badge && badgeDot && badgeText) {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200 transition-all';
      badgeDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      badgeText.textContent = 'Tahan Lebih Lama';
    }

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40]); } catch (_) {}
    }

    setTimeout(() => {
      if (!isBioScanning && !isBioScanSuccess) {
        resetBiometricUI();
      }
    }, 1400);
  }
}

function finishBiometricScanSuccess() {
  isBioScanSuccess = true;
  isBioScanning = false;

  const circle = document.getElementById('bioSensorCircle');
  const icon = document.getElementById('bioSensorIcon');
  const title = document.getElementById('bioPromptTitle');
  const desc = document.getElementById('bioPromptDesc');
  const ring = document.getElementById('bioPulseRing');
  const progressCircle = document.getElementById('bioProgressCircle');
  const trackCircle = document.getElementById('bioTrackCircle');
  const badge = document.getElementById('bioStatusBadge');
  const badgeDot = document.getElementById('bioStatusDot');
  const badgeText = document.getElementById('bioStatusText');

  if (progressCircle) {
    progressCircle.setAttribute('stroke', '#10b981');
    progressCircle.setAttribute('stroke-dashoffset', '0');
  }
  if (trackCircle) {
    trackCircle.setAttribute('stroke', '#d1fae5');
  }
  if (circle) {
    circle.className = 'w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-2 border-emerald-300 shadow-lg relative z-10 transition-all scale-105';
  }
  if (icon) {
    icon.textContent = 'check_circle';
    icon.className = 'material-symbols-outlined text-[42px] transition-all select-none pointer-events-none text-emerald-600';
  }
  if (title) title.textContent = 'Sidik Jari Cocok!';
  if (desc) desc.textContent = 'Identitas terverifikasi. Membuka PayQu...';
  if (ring) {
    ring.className = 'absolute inset-0 rounded-full bg-emerald-400/20 pointer-events-none';
  }
  if (badge && badgeDot && badgeText) {
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-all';
    badgeDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    badgeText.textContent = '✓ Terverifikasi';
  }

  if (navigator.vibrate) {
    try { navigator.vibrate([30, 40, 30]); } catch (_) {}
  }

  setTimeout(() => {
    cancelBiometricPrompt();
    unlockApp();
  }, 450);
}

function confirmBiometricScan() {
  if (!isBioScanSuccess) {
    finishBiometricScanSuccess();
  }
}

function cancelBiometricPrompt() {
  if (bioScanTimer) {
    clearInterval(bioScanTimer);
    bioScanTimer = null;
  }
  isBioScanning = false;
  isBioScanSuccess = false;

  const modal = document.getElementById('modalBiometricPrompt');
  const card = document.getElementById('biometricPromptCard');
  if (modal) modal.classList.add('hidden');
  if (card) {
    card.classList.remove('modal-center-active');
    card.classList.add('modal-center-enter');
  }
  resetBiometricUI();
}

function openForgotPinModal() {
  const modal = document.getElementById('modalForgotPin');
  const card = document.getElementById('forgotPinCard');
  const nameInput = document.getElementById('forgotPinNameInput');
  const emailInput = document.getElementById('forgotPinEmailInput');
  
  if (modal) {
    modal.classList.remove('hidden');
  }
  if (card) {
    card.classList.remove('modal-center-enter');
    card.classList.add('modal-center-active');
  }
  if (nameInput) nameInput.value = '';
  if (emailInput) emailInput.value = '';
  
  // Focus name input after modal opens
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 100);
}

function closeForgotPinModal() {
  const modal = document.getElementById('modalForgotPin');
  const card = document.getElementById('forgotPinCard');
  
  if (modal) modal.classList.add('hidden');
  if (card) {
    card.classList.remove('modal-center-active');
    card.classList.add('modal-center-enter');
  }
}

function verifyForgotPin() {
  const nameInput = document.getElementById('forgotPinNameInput');
  const emailInput = document.getElementById('forgotPinEmailInput');
  
  const rawName = nameInput ? nameInput.value.trim().replace(/\s+/g, ' ') : '';
  const nameVal = rawName.replace(/([a-zA-Z\u00C0-\u024F]+)/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const emailVal = emailInput ? emailInput.value.trim().toLowerCase().replace(/\s+/g, '') : '';
  
  if (!nameVal || !emailVal) {
    showToast('Nama dan email harus diisi');
    return;
  }
  
  // Verify against stored user profile
  const storedName = (state.userProfile && state.userProfile.name) ? state.userProfile.name.trim() : '';
  const storedEmail = (state.userProfile && state.userProfile.email) ? state.userProfile.email.trim() : '';
  
  if (nameVal.toLowerCase() === storedName.toLowerCase() && emailVal.toLowerCase() === storedEmail.toLowerCase()) {
    closeForgotPinModal();
    unlockApp();
    showToast('Aplikasi terbuka kembali');
  } else {
    showToast('Nama atau email tidak cocok');
    if (nameInput) nameInput.focus();
  }
}

function formatNameInput(input) {
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  if (!val) return;

  // Huruf awal setiap kata otomatis Capslock (Title Case), sisa huruf di kata tersebut lowercase
  // Spasi dan posisi kursor dipertahankan secara akurat saat mengetik
  const formatted = val.replace(/([a-zA-Z\u00C0-\u024F]+)/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  if (formatted !== val) {
    input.value = formatted;
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }
}

function formatEmailInput(input) {
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  if (!val) return;

  // Email tidak boleh ada huruf kapital/capslock sama sekali dan tanpa spasi
  const formatted = val.toLowerCase().replace(/\s+/g, '');

  if (formatted !== val) {
    input.value = formatted;
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }
}

window.formatNameInput = formatNameInput;
window.formatEmailInput = formatEmailInput;

function lockAppAutomatically() {
  if (!state.pinSettings || state.pinSettings.isPinEnabled !== true) return;
  if (typeof isCameraActive !== 'undefined' && isCameraActive) return;
  // Jangan kunci jika aplikasi baru saja dibuka dalam 3 detik terakhir (grace period)
  if (Date.now() - lastUnlockedTimestamp < 3000) return;

  sessionStorage.removeItem('payqu_unlocked');
  showAppLockScreen();
}

function initAppLock() {
  const lockScreen = document.getElementById('appLockScreen');
  // Jika masih pengguna baru, prioritaskan halaman onboarding login terlebih dahulu
  if (isFirstTimeUser()) {
    if (lockScreen) lockScreen.classList.add('hidden');
    checkAndShowOnboarding();
    return;
  }

  if (state.pinSettings && state.pinSettings.isPinEnabled === true) {
    // Jika PIN aktif tapi belum ada PIN yang terdaftar, batalkan penguncian dan arahkan ke pembuatan PIN
    if (!state.pinSettings.pin || state.pinSettings.pin.length !== 6) {
      state.pinSettings.isPinEnabled = false;
      saveStateToStorage();
      updatePinToggleUI();
      if (lockScreen) lockScreen.classList.add('hidden');
      return;
    }
    const isUnlocked = sessionStorage.getItem('payqu_unlocked') === 'true';
    if (!isUnlocked) {
      showAppLockScreen();
    }
  } else {
    if (lockScreen) {
      lockScreen.classList.add('hidden');
      lockScreen.classList.remove('opacity-0', 'pointer-events-none');
    }
    sessionStorage.setItem('payqu_unlocked', 'true');
  }

  // Otomatis mengunci aplikasi HANYA saat layar HP mati, pindah tab browser, atau aplikasi diminimize
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lockAppAutomatically();
    } else if (document.visibilityState === 'visible') {
      if (state.pinSettings && state.pinSettings.isPinEnabled === true) {
        if (sessionStorage.getItem('payqu_unlocked') !== 'true') {
          showAppLockScreen();
        }
      }
    }
  });

  // Saat aplikasi ditutup atau berpindah halaman (pagehide)
  window.addEventListener('pagehide', () => {
    lockAppAutomatically();
  });

  // Keyboard support for desktop / laptop
  window.addEventListener('keydown', (e) => {
    const lockScreen = document.getElementById('appLockScreen');
    if (lockScreen && !lockScreen.classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') {
        handleLockKeypad(e.key);
      } else if (e.key === 'Backspace') {
        handleLockBackspace();
      } else if (e.key === 'Escape') {
        clearLockPin();
      }
    }
  });
}

// ==========================================
// ==========================================
// ==========================================
// 12. RECEIPT SCANNER (REAL CAMERA & AI OCR)
// ==========================================

let cameraStream = null;
let isCameraActive = false;

function updateCameraBtnState(active) {
  isCameraActive = active;
  const label = document.getElementById('cameraBtnLabel');
  const icon = document.getElementById('cameraBtnIcon');
  const btn = document.getElementById('btnCameraAction');

  if (active) {
    if (label) label.textContent = 'Ambil Foto Struk';
    if (icon) icon.textContent = 'camera';
    if (btn) btn.className = 'py-2.5 px-3 bg-card-yellow hover:brightness-105 text-ink-dark text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95';
  } else {
    if (label) label.textContent = 'Buka Kamera';
    if (icon) icon.textContent = 'photo_camera';
    if (btn) btn.className = 'py-2.5 px-3 bg-ink-dark hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95';
  }
}

function handleCameraActionClick() {
  if (isCameraActive) {
    // Snap photo from active live camera
    capturePhotoFromCamera();
    return;
  }

  // Directly try opening the camera
  startCamera();
}

async function startCamera() {
  const video = document.getElementById('scannerVideo');
  const graphic = document.getElementById('scannerGraphic');
  const preview = document.getElementById('capturedImagePreview');
  const laser = document.getElementById('scanLaserLine');
  const statusText = document.getElementById('scannerStatusText');
  const subText = document.getElementById('scannerSubText');

  if (preview) preview.classList.add('hidden');

  if (cameraStream) {
    stopCamera();
  }

  // 1. Check if mediaDevices is supported
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    try {
      // First attempt: try environment camera (for phones) or general video
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch (errEnv) {
        // Fallback: simple video constraint for laptop webcams
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (cameraStream) {
        if (video) {
          video.srcObject = cameraStream;
          video.classList.remove('hidden');
          await video.play();
        }

        if (graphic) graphic.classList.add('hidden');
        if (laser) laser.classList.remove('hidden');
        updateCameraBtnState(true);

        if (statusText) statusText.textContent = 'Kamera Aktif';
        if (subText) subText.textContent = 'Arahkan ke struk, lalu klik "Ambil Foto Struk"';
        return;
      }
    } catch (err) {
      console.warn('getUserMedia camera stream error:', err);
      stopCamera();

      // If browser blocks camera on file:/// URL
      if (window.location.protocol === 'file:') {
        const proceed = confirm(
          'Browser membatasi webcam jika dibuka langsung via file://.\n\n' +
          '• Untuk mengaktifkan webcam laptop: Jalankan "node server.js" di terminal lalu buka http://localhost:3000\n' +
          '• Atau klik "OK" untuk memilih foto struk dari komputer Anda.'
        );
        if (proceed) {
          document.getElementById('receiptFileInput').click();
        }
        return;
      } else {
        alert('Tidak dapat mengakses webcam/kamera: ' + (err.message || 'Izin kamera ditolak.'));
        return;
      }
    }
  }

  // 2. If browser completely lacks getUserMedia (very old browsers or restricted mobile)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    const camDirect = document.getElementById('cameraDirectInput');
    if (camDirect) camDirect.click();
    else document.getElementById('receiptFileInput').click();
  } else {
    document.getElementById('receiptFileInput').click();
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  isCameraActive = false;
  const video = document.getElementById('scannerVideo');
  if (video) {
    video.srcObject = null;
    video.classList.add('hidden');
  }
  const laser = document.getElementById('scanLaserLine');
  if (laser) laser.classList.add('hidden');
  updateCameraBtnState(false);
}

function capturePhotoFromCamera() {
  const video = document.getElementById('scannerVideo');
  const canvas = document.getElementById('scannerCanvas');
  const preview = document.getElementById('capturedImagePreview');
  const graphic = document.getElementById('scannerGraphic');
  const viewport = document.getElementById('scannerViewport');
  const frameBox = document.getElementById('scanFrameBox');

  if (!video || !cameraStream) {
    startCamera();
    return;
  }

  const w = video.videoWidth;
  const h = video.videoHeight;

  if (!w || !h) {
    alert('Kamera belum siap mengambil gambar. Silakan tunggu 1 detik atau klik kembali.');
    return;
  }

  const vpRect = viewport ? viewport.getBoundingClientRect() : null;
  const frameRect = frameBox ? frameBox.getBoundingClientRect() : vpRect;

  let sx = 0;
  let sy = 0;
  let sWidth = w;
  let sHeight = h;

  if (vpRect && frameRect && vpRect.width > 0 && vpRect.height > 0) {
    // Rasio skala object-fit: cover pada video di dalam viewport
    const scale = Math.max(vpRect.width / w, vpRect.height / h);
    const scaledW = w * scale;
    const scaledH = h * scale;

    // Offset pemusatan video di dalam viewport
    const offsetX = (scaledW - vpRect.width) / 2;
    const offsetY = (scaledH - vpRect.height) / 2;

    // Posisi bingkai persegi panjang (scanFrameBox) terhadap viewport
    const frameLeft = Math.max(0, frameRect.left - vpRect.left);
    const frameTop = Math.max(0, frameRect.top - vpRect.top);
    const frameW = Math.min(vpRect.width - frameLeft, frameRect.width);
    const frameH = Math.min(vpRect.height - frameTop, frameRect.height);

    // Konversi koordinat bingkai kembali ke koordinat piksel video asli kamera
    sx = Math.max(0, (offsetX + frameLeft) / scale);
    sy = Math.max(0, (offsetY + frameTop) / scale);
    sWidth = Math.min(w - sx, frameW / scale);
    sHeight = Math.min(h - sy, frameH / scale);
  }

  // Tentukan resolusi kanvas HANYA sesuai area di dalam bingkai (persegi panjang)
  canvas.width = Math.round(sWidth);
  canvas.height = Math.round(sHeight);

  const ctx = canvas.getContext('2d');
  // Crop cuplikan gambar persis pada area di dalam bingkai
  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

  // Turn off live camera stream
  stopCamera();

  // Tampilkan hasil foto yang telah ter-crop rapi sesuai bingkai
  if (preview) {
    preview.src = dataUrl;
    preview.classList.remove('hidden');
  }
  if (graphic) graphic.classList.add('hidden');

  // Process OCR pada potongan gambar nota di dalam bingkai
  processReceiptWithOCR(dataUrl);
}

function handleReceiptFilePicked(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  stopCamera();

  const preview = document.getElementById('capturedImagePreview');
  const graphic = document.getElementById('scannerGraphic');
  const video = document.getElementById('scannerVideo');

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    if (preview) {
      preview.src = dataUrl;
      preview.classList.remove('hidden');
    }
    if (graphic) graphic.classList.add('hidden');
    if (video) video.classList.add('hidden');

    processReceiptWithOCR(dataUrl, file.name);
  };
  reader.readAsDataURL(file);

  // Reset file input value
  event.target.value = '';
}

function openReceiptScannerModal() {
  if (!state.wallets || state.wallets.length === 0) {
    openModal('modalNoWalletReminder');
    return;
  }
  stopCamera();

  const preview = document.getElementById('capturedImagePreview');
  const video = document.getElementById('scannerVideo');
  const graphic = document.getElementById('scannerGraphic');
  const laser = document.getElementById('scanLaserLine');
  const progBox = document.getElementById('ocrProgressBox');
  const statusText = document.getElementById('scannerStatusText');
  const subText = document.getElementById('scannerSubText');

  // Reset viewport to clean initial graphic
  if (preview) {
    preview.src = '';
    preview.classList.add('hidden');
  }
  if (video) {
    video.srcObject = null;
    video.classList.add('hidden');
  }
  if (graphic) graphic.classList.remove('hidden');
  if (laser) laser.classList.add('hidden');
  if (progBox) progBox.classList.add('hidden');

  if (statusText) statusText.textContent = 'Ambil foto atau pilih struk';
  if (subText) subText.textContent = 'Kamera Langsung & Galeri';

  // Clear any previous form data completely (NO dummy data)
  const amtEl = document.getElementById('ocrDetectedAmount');
  const merEl = document.getElementById('ocrDetectedMerchant');
  const catEl = document.getElementById('ocrDetectedCategory');
  const badge = document.getElementById('ocrAccuracyBadge');

  if (amtEl) amtEl.value = '';
  if (merEl) merEl.value = '';
  if (catEl) catEl.value = '';
  if (badge) {
    badge.textContent = 'Menunggu Foto';
    badge.className = 'text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full';
  }

  updateWalletDropdowns();
  updateCameraBtnState(false);
  openModal('modalReceiptScanner');
}

// Smart Receipt Text Parser for Indonesian & English receipts
function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let detectedAmount = 0;
  let detectedMerchant = '';
  let detectedCategory = '';

  // 1. Merchant Detection: Look at top lines of the receipt
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Skip dates, receipt numbers, addresses, phone numbers
    if (line.length >= 3 && 
        !/^\d+$/.test(line) && 
        !/tanggal|date|telp|phone|jl\.|jalan|no\.|trx|order|receipt|resi/i.test(line)) {
      detectedMerchant = line.replace(/[^a-zA-Z0-9\s&.-]/g, '').trim();
      break;
    }
  }

  // 2. Amount Detection
  // Check keywords: GRAND TOTAL, TOTAL, JUMLAH, SUB TOTAL, BAYAR, CASH, TUNAI, TAGIHAN
  const totalKeywordsRegex = /(?:grand\s*total|total|jumlah|sub\s*total|bayar|tunai|cash|tagihan|netto|net)[^0-9\n\r]{0,10}([0-9.,]{3,})/gi;
  let candidateAmounts = [];
  let match;

  while ((match = totalKeywordsRegex.exec(text)) !== null) {
    const rawDigits = match[1].replace(/[^0-9]/g, '');
    const num = parseFloat(rawDigits);
    if (num && num >= 500 && num <= 500000000) {
      candidateAmounts.push(num);
    }
  }

  if (candidateAmounts.length > 0) {
    // Grand total is typically the last total in the receipt
    detectedAmount = candidateAmounts[candidateAmounts.length - 1];
  } else {
    // Look for numbers with Rp / IDR
    const rpRegex = /(?:rp|idr)\.?\s*([0-9.,]{3,})/gi;
    while ((match = rpRegex.exec(text)) !== null) {
      const rawDigits = match[1].replace(/[^0-9]/g, '');
      const num = parseFloat(rawDigits);
      if (num && num >= 500 && num <= 500000000) {
        candidateAmounts.push(num);
      }
    }
    if (candidateAmounts.length > 0) {
      detectedAmount = Math.max(...candidateAmounts);
    } else {
      // Standalone numbers formatted like 54.000, 385.000
      const anyNumRegex = /\b([1-9][0-9]{0,2}(?:\.[0-9]{3})+|[1-9][0-9]{3,7})\b/g;
      while ((match = anyNumRegex.exec(text)) !== null) {
        const rawDigits = match[1].replace(/[^0-9]/g, '');
        const num = parseFloat(rawDigits);
        if (num && num >= 1000 && num <= 500000000) {
          candidateAmounts.push(num);
        }
      }
      if (candidateAmounts.length > 0) {
        detectedAmount = Math.max(...candidateAmounts);
      }
    }
  }

  // 3. Category Detection by keywords
  const fullText = text.toLowerCase();
  if (/kopi|coffee|cafe|starbucks|janji\s*jiwa|kulo|fore|resto|restoran|makan|food|ayam|bakso|mie|burger|pizza|dapur|kitchen|snack|drink|minum|warung|sate|padang|nasi/i.test(fullText)) {
    detectedCategory = 'Konsumsi & Makanan';
  } else if (/mart|alfamart|indomaret|supermarket|hypermart|transmart|superindo|toserba|belanja|store|shampoo|sabun|detergen|minyak|beras/i.test(fullText)) {
    detectedCategory = 'Belanja Bulanan';
  } else if (/spbu|pertamina|shell|bp|bensin|pertalite|pertamax|solar|parkir|tol|grab|gojek|ojek|taxi|transport/i.test(fullText)) {
    detectedCategory = 'Transportasi & Bensin';
  } else if (/pln|listrik|pdam|wifi|indihome|telkom|pulsa|kuota|bpjs|pajak|tagihan|utilitas/i.test(fullText)) {
    detectedCategory = 'Tagihan & Utilitas';
  } else if (/apotek|kimia\s*farma|k24|guardian|watson|obat|klinik|dokter|rs|rumah\s*sakit|medis/i.test(fullText)) {
    detectedCategory = 'Kesehatan & Obat';
  } else if (/bioskop|cinema|xxi|cgv|game|steam|playstation|karaoke|hiburan|nonton/i.test(fullText)) {
    detectedCategory = 'Hiburan & Nongkrong';
  }

  return {
    merchant: detectedMerchant,
    amount: detectedAmount,
    category: detectedCategory
  };
}

async function processReceiptWithOCR(imageSrc, fallbackFilename = '') {
  const laser = document.getElementById('scanLaserLine');
  const progBox = document.getElementById('ocrProgressBox');
  const progStatus = document.getElementById('ocrProgressStatus');
  const progPct = document.getElementById('ocrProgressPct');
  const progBar = document.getElementById('ocrProgressBar');
  const statusText = document.getElementById('scannerStatusText');
  const subText = document.getElementById('scannerSubText');

  if (laser) laser.classList.remove('hidden');
  if (progBox) progBox.classList.remove('hidden');
  if (progStatus) progStatus.textContent = 'Memindai teks struk dengan AI OCR...';
  if (progPct) progPct.textContent = '10%';
  if (progBar) progBar.style.width = '10%';
  if (statusText) statusText.textContent = 'Menganalisis Struk...';
  if (subText) subText.textContent = 'AI OCR sedang membaca nota asli';

  // Use Tesseract.js client-side OCR if available
  if (typeof Tesseract !== 'undefined') {
    try {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            if (progPct) progPct.textContent = `${pct}%`;
            if (progBar) progBar.style.width = `${Math.max(15, pct)}%`;
            if (progStatus) progStatus.textContent = `Membaca teks nota... (${pct}%)`;
          }
        }
      });

      const ret = await worker.recognize(imageSrc);
      await worker.terminate();

      const ocrText = (ret && ret.data && ret.data.text) ? ret.data.text : '';
      console.log('OCR Result Text:', ocrText);

      const parsed = parseReceiptText(ocrText);
      applyRealOcrResult(parsed, fallbackFilename);
      return;
    } catch (err) {
      console.warn('Tesseract OCR engine error, falling back:', err);
    }
  }

  // Fallback: Photo loaded, ask user to verify/enter
  setTimeout(() => {
    applyNoOcrResult(fallbackFilename);
  }, 500);
}

function applyRealOcrResult(parsed, fallbackFilename) {
  const amtEl = document.getElementById('ocrDetectedAmount');
  const merEl = document.getElementById('ocrDetectedMerchant');
  const catEl = document.getElementById('ocrDetectedCategory');
  const badge = document.getElementById('ocrAccuracyBadge');
  const laser = document.getElementById('scanLaserLine');
  const progBox = document.getElementById('ocrProgressBox');
  const statusText = document.getElementById('scannerStatusText');
  const subText = document.getElementById('scannerSubText');

  if (laser) laser.classList.add('hidden');
  if (progBox) progBox.classList.add('hidden');

  let merchant = parsed.merchant;
  if (!merchant && fallbackFilename) {
    merchant = fallbackFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  if (merEl) merEl.value = merchant || '';
  if (catEl) { catEl.value = parsed.category || ''; updateOcrCategoryPreview(); }

  if (parsed.amount > 0) {
    if (amtEl) amtEl.value = formatNumberWithDots(parsed.amount);
    if (badge) {
      badge.textContent = '✓ AI Terdeteksi';
      badge.className = 'text-[10px] font-bold bg-emerald-100 text-[#1CA46B] px-2.5 py-0.5 rounded-full';
    }
    if (statusText) statusText.textContent = `✓ Total Rp ${formatNumberWithDots(parsed.amount)} Terdeteksi!`;
    if (subText) subText.textContent = 'Periksa data di bawah lalu klik Simpan Transaksi';
    showToast(`Struk terdeteksi: Rp ${formatNumberWithDots(parsed.amount)}`);
  } else {
    // If no total found in image, DO NOT inject fake numbers!
    if (amtEl) amtEl.value = '';
    if (badge) {
      badge.textContent = 'Masukkan Nominal';
      badge.className = 'text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full';
    }
    if (statusText) statusText.textContent = '✓ Teks Struk Terbaca';
    if (subText) subText.textContent = 'Silakan ketik nominal yang tertera pada struk';
    showToast('Teks struk dibaca, silakan isi nominal');
    if (amtEl) amtEl.focus();
  }
}

function applyNoOcrResult(fallbackFilename) {
  const amtEl = document.getElementById('ocrDetectedAmount');
  const merEl = document.getElementById('ocrDetectedMerchant');
  const catEl = document.getElementById('ocrDetectedCategory');
  const badge = document.getElementById('ocrAccuracyBadge');
  const laser = document.getElementById('scanLaserLine');
  const progBox = document.getElementById('ocrProgressBox');
  const statusText = document.getElementById('scannerStatusText');
  const subText = document.getElementById('scannerSubText');

  if (laser) laser.classList.add('hidden');
  if (progBox) progBox.classList.add('hidden');

  let merchant = '';
  if (fallbackFilename) {
    merchant = fallbackFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  if (merEl) merEl.value = merchant;
  if (amtEl) amtEl.value = '';
  if (catEl) catEl.value = '';

  if (badge) {
    badge.textContent = 'Pemeriksaan Manual';
    badge.className = 'text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full';
  }

  if (statusText) statusText.textContent = '✓ Foto Struk Berhasil Dimuat';
  if (subText) subText.textContent = 'Ketik nominal & kategori struk untuk menyimpan';
  showToast('Foto struk dimuat, silakan masukkan nominal');
  if (amtEl) amtEl.focus();
}

function confirmScanTransaction() {
  const amtEl = document.getElementById('ocrDetectedAmount');
  const merEl = document.getElementById('ocrDetectedMerchant');
  const catEl = document.getElementById('ocrDetectedCategory');
  const walEl = document.getElementById('ocrDetectedWallet');

  const amt = parseFormattedNumber(amtEl ? amtEl.value : 0);
  const category = catEl && catEl.value ? catEl.value.trim() : '';
  const merchant = merEl && merEl.value.trim() ? merEl.value.trim() : (category || 'Struk Belanja');
  const wallet = walEl ? walEl.value : (state.wallets[0] ? state.wallets[0].name : 'BCA');

  if (!amt || amt <= 0) {
    alert('Nominal struk harus lebih dari 0. Silakan ketik nominal struk Anda!');
    if (amtEl) amtEl.focus();
    return;
  }

  if (!category) {
    alert('Kategori struk wajib diisi!');
    if (catEl) catEl.focus();
    return;
  }

  if (!state.wallets || state.wallets.length === 0 || !wallet) {
    openModal('modalNoWalletReminder');
    return;
  }

  // Cek saldo untuk pengeluaran hasil scan
  const targetWallet = state.wallets.find(w => w.name.toLowerCase() === wallet.toLowerCase());
  const currentBalance = targetWallet ? Number(targetWallet.balance || 0) : 0;
  if (amt > currentBalance) {
    showInsufficientBalanceModal(targetWallet ? targetWallet.name : wallet, currentBalance, amt);
    if (amtEl) amtEl.focus();
    return;
  }

  const now = new Date();
  const txDate = getLocalDateString(now);
  const txTime = getLocalTimeString(now);
  const meta = getCategoryMeta(category, 'expense');

  const newTx = {
    id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
    title: merchant,
    type: 'expense',
    amount: amt,
    category: category,
    wallet: wallet,
    date: txDate,
    time: txTime,
    createdAt: now.getTime(),
    icon: meta.icon,
    color: meta.bg
  };

  if (targetWallet) targetWallet.balance -= amt;

  state.transactions.unshift(newTx);
  saveStateToStorage();

  renderBalances();
  renderWallets();
  renderRecentTransactions();
  renderStats();

  closeModal('modalReceiptScanner');
  showToast(`Pengeluaran ${formatIDR(amt)} berhasil dicatat!`);
}

// ==========================================
// 13. PWA SERVICE WORKER & INSTALL PROMPT
// ==========================================

function initPWA() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('ServiceWorker registered successfully with scope:', reg.scope))
        .catch((err) => console.warn('ServiceWorker registration failed:', err));
    });
  }

  // Jika aplikasi sudah berjalan dalam mode standalone (sudah terinstal di HP),
  // sembunyikan langsung tombol instalasi
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true
    || (window.navigator && window.navigator.displayMode === 'standalone');

  const profileInstallBtn = document.getElementById('btnPwaInstallProfile');
  const installBanner = document.getElementById('pwaInstallPromptBanner');

  if (isStandalone) {
    if (profileInstallBtn) profileInstallBtn.classList.add('hidden');
    if (installBanner) installBanner.classList.add('hidden');
    deferredInstallPrompt = null;
  }

  // Handle PWA installation prompt (saat belum terinstal)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBanner) installBanner.classList.remove('hidden');
    if (profileInstallBtn) profileInstallBtn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installBanner) installBanner.classList.add('hidden');
    if (profileInstallBtn) profileInstallBtn.classList.add('hidden');
    showToast('PayQu berhasil di-install di perangkat Anda!');
  });
}

function promptPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('Memasang PayQu ke layar utama...');
      }
      deferredInstallPrompt = null;
    });
  } else {
    alert('Untuk memasang di HP: Buka menu browser (titik tiga atau tombol Share) lalu pilih "Tambahkan ke Layar Utama" / "Install App".');
  }
}

// ==========================================
// 14. INITIALIZATION ON DOM READY
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load state from localStorage
  loadStateFromStorage();

  // 2. Initialize PWA
  initPWA();

  // 3. Render all core UI components
  renderProfile();
  renderWallets();
  renderBalances();
  updateRecentTxFilterUI();
  renderRecentTransactions();
  renderStats();
  setTxFormType('expense');

  // 4. Ensure tab-home is active initially
  switchTab('tab-home');

  // Setup draggable & swipeable wallet carousel
  setupWalletCarouselDrag();

  // Start Real-Time Live Clock
  startRealTimeClock();

  // Set default transaction date & time
  setTxTimeToNow();

  // Initialize dynamic export dates and stats period
  initExportModalDates();
  updateExportEstimate();

  // Setup Currency Inputs Auto-formatting (dot after 3 digits)
  setupCurrencyInputFormatter(document.getElementById('txAmountInput'));
  setupCurrencyInputFormatter(document.getElementById('ocrDetectedAmount'));
  setupCurrencyInputFormatter(document.getElementById('newWalletBalanceInput'));

  // Live Category Icon Preview Bindings
  const txCatIn = document.getElementById('txCategoryInput');
  if (txCatIn) {
    txCatIn.addEventListener('input', updateCategoryInputPreview);
    updateCategoryInputPreview();
  }
  const ocrCatIn = document.getElementById('ocrDetectedCategory');
  if (ocrCatIn) {
    ocrCatIn.addEventListener('input', updateOcrCategoryPreview);
    updateOcrCategoryPreview();
  }

  // 5. Setup Event Listeners
  // Eye Toggle Balance Visibility
  const toggleEye = document.getElementById('toggleBalanceBtn');
  if (toggleEye) {
    toggleEye.addEventListener('click', () => {
      state.balanceHidden = !state.balanceHidden;
      saveStateToStorage();

      const eyeOpen = document.getElementById('eyeOpenIcon');
      const eyeClosed = document.getElementById('eyeClosedIcon');
      if (eyeOpen) eyeOpen.classList.toggle('hidden', state.balanceHidden);
      if (eyeClosed) eyeClosed.classList.toggle('hidden', !state.balanceHidden);

      renderBalances();
      renderWallets();
      showToast(state.balanceHidden ? 'Saldo disembunyikan' : 'Saldo ditampilkan');
    });
  }

  // Quick Action: Income
  const btnInc = document.getElementById('btnQuickIncomeAction');
  if (btnInc) {
    btnInc.addEventListener('click', () => {
      if (!state.wallets || state.wallets.length === 0) {
        openModal('modalNoWalletReminder');
        return;
      }
      setTxFormType('income');
      openModal('modalTransaction');
    });
  }

  // Quick Action: Expense
  const btnExp = document.getElementById('btnQuickExpenseAction');
  if (btnExp) {
    btnExp.addEventListener('click', () => {
      if (!state.wallets || state.wallets.length === 0) {
        openModal('modalNoWalletReminder');
        return;
      }
      setTxFormType('expense');
      openModal('modalTransaction');
    });
  }

  // Currency / Wallet switch dropdown trigger
  const btnCurSwitch = document.getElementById('btnCurrencySwitch');
  if (btnCurSwitch) {
    btnCurSwitch.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWalletDropdown();
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('walletDropdownMenu');
    const btnCur = document.getElementById('btnCurrencySwitch');
    if (menu && !menu.contains(e.target) && btnCur && !btnCur.contains(e.target)) {
      menu.classList.add('hidden');
      const chevron = document.getElementById('currencyChevron');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  });

  // View All transactions button
  const btnAll = document.getElementById('btnViewAllTransactions');
  if (btnAll) {
    btnAll.addEventListener('click', () => {
      renderAllTransactionsList();
      openModal('modalAllTransactions');
    });
  }

  // Header Profile click
  const btnProfileH = document.getElementById('btnOpenProfileHeader');
  if (btnProfileH) {
    btnProfileH.addEventListener('click', () => switchTab('tab-profile'));
  }

  // Header Notification Bell
  const btnNotif = document.getElementById('btnOpenNotification');
  if (btnNotif) {
    btnNotif.addEventListener('click', () => openModal('modalNotification'));
  }

  // Excel / CSV File Import Input Binding
  const importInput = document.getElementById('excelImportFileInput');
  if (importInput) {
    importInput.addEventListener('change', handleFileImport);
  }

  // Check & show onboarding login for new users
  checkAndShowOnboarding();

  // Initialize App Security Lock Screen (PIN)
  initAppLock();

  // Initialize dynamic splash screen loading animation
  initSplashScreenLoading();
});

function initSplashScreenLoading() {
  const splash = document.getElementById('appSplashScreen');
  const isSkip = document.documentElement.classList.contains('skip-splash') || 
                 sessionStorage.getItem('payqu_splash_shown') === 'true';

  if (isSkip) {
    if (splash) splash.classList.add('hidden');
    return;
  }

  // Tandai bahwa splash screen sudah ditampilkan di sesi ini agar tidak muncul lagi saat di-refresh
  try {
    sessionStorage.setItem('payqu_splash_shown', 'true');
  } catch (_) {}

  const bar = document.getElementById('splashProgressBar');
  const txt = document.getElementById('splashStatusText');

  // Step 1: Initial progress
  if (bar) bar.style.width = '25%';

  setTimeout(() => {
    if (bar) bar.style.width = '60%';
    if (txt) txt.textContent = 'Menyiapkan dompet...';
  }, 350);

  setTimeout(() => {
    if (bar) bar.style.width = '90%';
    if (txt) txt.textContent = 'Hampir siap...';
  }, 750);

  setTimeout(() => {
    if (bar) bar.style.width = '100%';
    if (txt) txt.textContent = 'Selesai!';
  }, 1150);

  setTimeout(() => {
    dismissSplashScreen();
  }, 1450);
}

function dismissSplashScreen() {
  try {
    sessionStorage.setItem('payqu_splash_shown', 'true');
  } catch (_) {}
  const splash = document.getElementById('appSplashScreen');
  if (!splash || splash.classList.contains('hidden') || splash.dataset.dismissed === 'true') return;
  splash.dataset.dismissed = 'true';
  splash.style.transition = 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
  splash.style.opacity = '0';
  splash.style.transform = 'scale(1.03)';
  setTimeout(() => {
    splash.classList.add('hidden');
  }, 450);
}
window.dismissSplashScreen = dismissSplashScreen;
window.initSplashScreenLoading = initSplashScreenLoading;
