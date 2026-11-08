/* Hilfsfunktionen */

/** HTML-sicheres Einsetzen von Text */
function h(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmt = {
  euro(v) {
    return v == null || v === '' ? '' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  },
  euroRound(v) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
  },
  date(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  /** „in 3 Tagen“, „vor 2 Monaten“ */
  relative(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
    const days = Math.round((d - today()) / 86400000);
    if (Math.abs(days) < 31) return rtf.format(days, 'day');
    const months = Math.round(days / 30.4);
    if (Math.abs(months) < 12) return rtf.format(months, 'month');
    return rtf.format(Math.round(days / 365), 'year');
  },
  percent(v) { return this.num(v) + ' %'; },
  num(v) { return Number(v || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 }); },
  inputNumber(v) { return v == null ? '' : String(v).replace('.', ','); }
};

function today() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

function isoDate(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function addMonths(iso, months) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  d.setMonth(d.getMonth() + months);
  return isoDate(d);
}

/** Akzeptiert „59,99“, „59.99“, „1.299,00 €“ */
function parseNumber(text) {
  let t = String(text ?? '').trim().replace(/€/g, '').replace(/\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(text) {
  const n = parseInt(String(text ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Stabile Farbe aus einem Text (für Platzhalter-Cover) */
function hueFor(text) {
  let hash = 5381;
  for (const ch of String(text || '?')) hash = ((hash * 33) ^ ch.codePointAt(0)) >>> 0;
  return hash % 360;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'de', { numeric: true, sensitivity: 'base' });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Fortschritt: Regler (1er-Schritte) + Eingabefeld (z. B. 81,2) */
function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function pctMarkup(value, { name = '', quick = false, color = '' } = {}) {
  const v = clampPct(value) ?? 0;
  return `<div class="pct">
    <input type="range" min="0" max="100" step="1" value="${v}" data-pct="range" ${quick ? 'data-quick="progress"' : ''} ${color ? `style="accent-color:${color}"` : ''} aria-label="Fortschritt">
    <label class="pct-box"><input type="text" inputmode="decimal" value="${fmt.num(v)}" data-pct="text" ${name ? `name="${name}"` : ''} ${quick ? 'data-quick="progress-text"' : ''} aria-label="Fortschritt in Prozent"><span>%</span></label>
  </div>`;
}

// Regler und Feld synchron halten (gilt überall in der App)
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.pct === 'range') {
    const box = t.closest('.pct')?.querySelector('[data-pct="text"]');
    if (box) box.value = fmt.num(t.value);
  }
}, true);
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.pct === 'text') {
    const v = clampPct(parseNumber(t.value)) ?? 0;
    t.value = fmt.num(v);
    const range = t.closest('.pct')?.querySelector('[data-pct="range"]');
    if (range) range.value = v;
  }
}, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pct === 'text') {
    e.preventDefault();
    e.target.blur();
  }
}, true);
