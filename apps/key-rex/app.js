// app.js — UI, history, theme, QR

const HISTORY_KEY = 'passmake-history';
const THEME_KEY   = 'passmake-theme';
const MAX_HISTORY = 10;

let appHistory = [];
let comboParts = [];

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  document.getElementById('themeIcon').className =
    theme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const sys    = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(stored || sys);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
  });
}

// ─── Strength meter ───────────────────────────────────────────────────────────
const STRENGTH_LEVELS = [
  { min: 0,   label: 'Weak',        color: '#ef4444' },
  { min: 40,  label: 'Fair',        color: '#f97316' },
  { min: 60,  label: 'Good',        color: '#eab308' },
  { min: 80,  label: 'Strong',      color: '#22c55e' },
  { min: 100, label: 'Very Strong', color: '#6366f1' },
];

function strengthInfo(entropy) {
  let level = STRENGTH_LEVELS[0];
  for (const s of STRENGTH_LEVELS) { if (entropy >= s.min) level = s; }
  const pct = Math.min(100, (entropy / 128) * 100);
  return { ...level, pct };
}

function renderStrength(containerId, entropy) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const { label, color, pct } = strengthInfo(entropy);
  el.style.display = 'block';
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-1">
      <small class="fw-semibold" style="color:${color}">${label}</small>
      <small class="text-muted">${Math.round(entropy)} bits of entropy</small>
    </div>
    <div class="strength-track">
      <div class="strength-fill" style="width:${pct}%;background:${color}"></div>
    </div>`;
}

// ─── Clipboard helper ─────────────────────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
    btn.classList.replace('btn-outline-secondary', 'btn-success');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.replace('btn-success', 'btn-outline-secondary');
    }, 1500);
  });
}

// ─── QR Code modal ────────────────────────────────────────────────────────────
let qrModal = null;

function showQR(text) {
  document.getElementById('qrValue').textContent = text;
  const canvas = document.getElementById('qrCanvas');
  canvas.innerHTML = '';
  new QRCode(canvas, { text, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
  if (!qrModal) qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
  qrModal.show();
}

// Expose for inline onclick in history items
window.showQR = showQR;

// ─── History ──────────────────────────────────────────────────────────────────
function loadHistory() {
  try { appHistory = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { appHistory = []; }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(appHistory));
}

function addHistory(type, value) {
  appHistory.unshift({ type, value });
  if (appHistory.length > MAX_HISTORY) appHistory.length = MAX_HISTORY;
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('historyList');
  if (appHistory.length === 0) {
    el.innerHTML = '<p class="text-muted small fst-italic mb-0">Nothing generated yet.</p>';
    return;
  }
  el.innerHTML = appHistory.map((entry, i) => `
    <div class="history-item d-flex align-items-center gap-2 flex-wrap">
      <span class="badge bg-secondary-subtle text-secondary-emphasis flex-shrink-0">${entry.type}</span>
      <code class="history-value flex-grow-1">${escHtml(entry.value)}</code>
      <button class="btn btn-sm btn-outline-secondary flex-shrink-0"
        onclick="copyText(appHistory[${i}].value, this)" title="Copy">
        <i class="bi bi-clipboard"></i>
      </button>
      <button class="btn btn-sm btn-outline-secondary flex-shrink-0"
        onclick="showQR(appHistory[${i}].value)" title="QR Code">
        <i class="bi bi-qr-code"></i>
      </button>
    </div>`).join('');
}

// Expose for history item onclick
window.copyText  = copyText;
window.appHistory = appHistory;

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Common result display ────────────────────────────────────────────────────
function displayResult({ resultId, copyBtnId, qrBtnId, strengthId, tabLabel, gen }) {
  const resultEl   = document.getElementById(resultId);
  const copyBtn    = document.getElementById(copyBtnId);
  const qrBtn      = document.getElementById(qrBtnId);

  const { value, entropy } = gen();
  resultEl.textContent = value;
  resultEl.classList.add('has-value');
  copyBtn.disabled = false;
  qrBtn.disabled   = false;

  copyBtn.onclick = () => copyText(value, copyBtn);
  qrBtn.onclick   = () => showQR(value);

  renderStrength(strengthId, entropy);
  addHistory(tabLabel, value);
  // keep window ref in sync
  window.appHistory = appHistory;
}

// ─── Tab: Simple Phrase ───────────────────────────────────────────────────────
function initPhrase() {
  document.getElementById('phraseGenerate').addEventListener('click', () => {
    displayResult({
      resultId: 'phraseResult', copyBtnId: 'phraseCopy',
      qrBtnId: 'phraseQR', strengthId: 'phraseStrength',
      tabLabel: 'Phrase',
      gen: () => generateSimplePhrase({
        capitalize:    document.getElementById('phraseCapitalize').checked,
        includeNumber: document.getElementById('phraseNumber').checked,
        includeSymbol: document.getElementById('phraseSymbol').checked,
      }),
    });
  });
}

// ─── Tab: True Random ────────────────────────────────────────────────────────
function initRandom() {
  const slider  = document.getElementById('randomLength');
  const display = document.getElementById('randomLengthVal');
  const updateDisplay = () => { display.textContent = slider.value; };
  slider.addEventListener('input', updateDisplay);
  updateDisplay();

  document.getElementById('randomGenerate').addEventListener('click', () => {
    displayResult({
      resultId: 'randomResult', copyBtnId: 'randomCopy',
      qrBtnId: 'randomQR', strengthId: 'randomStrength',
      tabLabel: 'Random',
      gen: () => generateTrueRandom({
        useUpper:   document.getElementById('randomUpper').checked,
        useLower:   document.getElementById('randomLower').checked,
        useDigits:  document.getElementById('randomDigits').checked,
        useSymbols: document.getElementById('randomSymbols').checked,
        length:     parseInt(slider.value),
      }),
    });
  });
}

// ─── Tab: Diceware ───────────────────────────────────────────────────────────
function initDiceware() {
  const SEP_MAP = { space: ' ', hyphen: '-', dot: '.', none: '' };

  document.getElementById('dicewareGenerate').addEventListener('click', () => {
    displayResult({
      resultId: 'dicewareResult', copyBtnId: 'dicewareCopy',
      qrBtnId: 'dicewareQR', strengthId: 'dicewareStrength',
      tabLabel: 'Diceware',
      gen: () => generateDiceware({
        wordCount: parseInt(document.getElementById('dicewareCount').value),
        separator: SEP_MAP[document.getElementById('dicewareSep').value] ?? ' ',
      }),
    });
  });
}

// ─── Tab: Combination ────────────────────────────────────────────────────────
function initCombo() {
  document.querySelectorAll('.combo-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      comboParts.push(btn.dataset.part);
      renderComboParts();
    });
  });

  document.getElementById('comboClear').addEventListener('click', () => {
    comboParts = [];
    renderComboParts();
  });

  document.getElementById('comboGenerate').addEventListener('click', () => {
    if (!comboParts.length) return;
    const sep = document.getElementById('comboSep').value;
    displayResult({
      resultId: 'comboResult', copyBtnId: 'comboCopy',
      qrBtnId: 'comboQR', strengthId: 'comboStrength',
      tabLabel: 'Combo',
      gen: () => generateCombination({
        parts: [...comboParts],
        separator: sep,
        capitalize: document.getElementById('comboCapitalize').checked,
      }),
    });
  });
}

function renderComboParts() {
  const el = document.getElementById('comboPartsDisplay');
  if (!comboParts.length) {
    el.innerHTML = '<span class="text-muted small">Add parts above to build your password structure.</span>';
    return;
  }
  el.innerHTML = comboParts.map((part, i) => `
    <span class="combo-chip">
      ${part}
      <button class="combo-chip-remove" onclick="removeComboPartAt(${i})" aria-label="Remove">&times;</button>
    </span>`).join('');
}

window.removeComboPartAt = function(i) {
  comboParts.splice(i, 1);
  renderComboParts();
};

// ─── Tab: Encryption Key ─────────────────────────────────────────────────────
function initKey() {
  document.getElementById('keyGenerate').addEventListener('click', () => {
    displayResult({
      resultId: 'keyResult', copyBtnId: 'keyCopy',
      qrBtnId: 'keyQR', strengthId: 'keyStrength',
      tabLabel: 'Key',
      gen: () => generateEncryptionKey({
        bits:   parseInt(document.getElementById('keyBits').value),
        format: document.getElementById('keyFormat').value,
      }),
    });
  });
}

// ─── Tab: BIP39 ───────────────────────────────────────────────────────────────
function initBIP39() {
  document.getElementById('bip39Generate').addEventListener('click', () => {
    const checked = document.querySelector('input[name="bip39Count"]:checked');
    const wordCount = parseInt(checked ? checked.value : '12');
    const { value, entropy } = generateBIP39({ wordCount });

    // Render word grid
    const words = value.split(' ');
    const gridEl = document.getElementById('bip39Grid');
    gridEl.innerHTML = words.map((w, i) => `
      <div class="bip39-word">
        <span class="bip39-idx">${i + 1}</span>
        <span class="bip39-txt">${w}</span>
      </div>`).join('');

    // Populate hidden result for copy/QR
    const resultEl = document.getElementById('bip39Result');
    resultEl.textContent = value;
    resultEl.classList.add('has-value');

    const copyBtn = document.getElementById('bip39Copy');
    const qrBtn   = document.getElementById('bip39QR');
    copyBtn.disabled = false;
    qrBtn.disabled   = false;
    copyBtn.onclick  = () => copyText(value, copyBtn);
    qrBtn.onclick    = () => showQR(value);

    renderStrength('bip39Strength', entropy);
    addHistory('BIP39', value);
    window.appHistory = appHistory;
  });
}

// ─── Tab: Strength Checker ────────────────────────────────────────────────────
const TIER_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#6366f1'];
const TIER_LABELS = ['Instant','Weak','Moderate','Good','Excellent'];

function initChecker() {
  const input    = document.getElementById('checkerInput');
  const toggle   = document.getElementById('checkerToggle');
  const clearBtn = document.getElementById('checkerClear');
  const eyeIcon  = document.getElementById('checkerEyeIcon');
  const lenEl    = document.getElementById('checkerLength');

  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eyeIcon.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input'));
  });

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderCheckerResults(input.value), 120);
  });
}

function renderCheckerResults(pwd) {
  const lenEl = document.getElementById('checkerLength');
  lenEl.textContent = `${pwd.length} character${pwd.length !== 1 ? 's' : ''}`;

  const hide = id => { document.getElementById(id).style.display = 'none'; };
  const show = id => { document.getElementById(id).style.display = ''; };

  if (!pwd.length) {
    ['checkerStrength','checkerCompositionWrap','checkerCrackWrap','checkerWarningsWrap'].forEach(hide);
    return;
  }

  const result = analyzePassword(pwd);
  if (!result) return;

  // Strength meter
  show('checkerStrength');
  renderStrength('checkerStrength', result.entropy);

  // Composition badges
  show('checkerCompositionWrap');
  const compEl = document.getElementById('checkerComposition');
  const checks = [
    { flag: result.composition.hasLower,    icon: 'bi-fonts',        label: 'Lowercase'  },
    { flag: result.composition.hasUpper,    icon: 'bi-type-bold',    label: 'Uppercase'  },
    { flag: result.composition.hasDigit,    icon: 'bi-123',          label: 'Digits'     },
    { flag: result.composition.hasSymbol,   icon: 'bi-asterisk',     label: 'Symbols'    },
    { flag: result.composition.hasSpace,    icon: 'bi-text-indent-left', label: 'Spaces' },
    { flag: result.composition.hasExtended, icon: 'bi-globe',        label: 'Extended'   },
  ];
  compEl.innerHTML = checks.map(c => `
    <span class="comp-badge ${c.flag ? 'comp-badge--yes' : 'comp-badge--no'}">
      <i class="bi ${c.icon} me-1"></i>${c.label}
      <i class="bi ${c.flag ? 'bi-check-lg' : 'bi-x-lg'} ms-1"></i>
    </span>`).join('') +
    `<span class="comp-badge comp-badge--info">
      <i class="bi bi-grid me-1"></i>Pool: ${result.composition.pool} chars
    </span>`;

  // Crack time table
  show('checkerCrackWrap');
  const tableEl = document.getElementById('checkerCrackTable');
  tableEl.innerHTML = result.crackTimes.map(row => {
    const color = TIER_COLORS[Math.min(row.tier, 4)];
    const tierLabel = TIER_LABELS[Math.min(row.tier, 4)];
    return `
      <div class="crack-row">
        <div class="crack-scenario">
          <span class="crack-label">${row.label}</span>
          <span class="crack-context">${row.context}</span>
        </div>
        <div class="crack-result">
          <span class="crack-time" style="color:${color}">${row.text}</span>
          <span class="crack-tier" style="background:${color}22;color:${color}">${tierLabel}</span>
        </div>
      </div>`;
  }).join('');

  // Warnings
  if (result.warnings.length) {
    show('checkerWarningsWrap');
    document.getElementById('checkerWarnings').innerHTML = result.warnings.map(w => `
      <div class="checker-warning">
        <i class="bi ${w.icon} me-2 flex-shrink-0"></i>${w.text}
      </div>`).join('');
  } else {
    hide('checkerWarningsWrap');
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  initTheme();
  initPhrase();
  initRandom();
  initDiceware();
  initCombo();
  initKey();
  initBIP39();
  initChecker();
  renderComboParts();
  renderHistory();
});
