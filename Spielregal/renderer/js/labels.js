/* Inventar-Etiketten mit QR-Code (60 × 30 mm) */

/** QR-Inhalt – die spätere Handy-App öffnet darüber den passenden Eintrag */
function qrPayload(item) {
  return `spielregal://item/${encodeURIComponent(item.inventory || '')}?id=${item.id}`;
}

function labelFor(item, type) {
  const isGame = type === 'game';
  const isAcc = type === 'accessory';
  return {
    id: item.id,
    type,
    kind: isGame ? 'Spiel' : isAcc ? 'Zubehör' : 'Konsole',
    title: (isGame ? item.title : item.name) || 'Ohne Titel',
    subtitle: isGame
      ? [item.platform, item.edition !== 'standard' ? EDITION[item.edition]?.label : ''].filter(Boolean).join(' · ')
      : isAcc ? [ACCESSORY_TYPES[item.type]?.label, item.edition].filter(Boolean).join(' · ')
      : [item.model, item.edition].filter(Boolean).join(' · '),
    inventory: item.inventory || '',
    payload: qrPayload(item)
  };
}

const LABEL_CSS = `
.lbl { width: 60mm; height: 30mm; box-sizing: border-box; display: flex; align-items: center; gap: 2.4mm;
  padding: 2mm 2.6mm 2mm 2mm; background: #fff; color: #000; overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
.lbl .qr { width: 25.5mm; height: 25.5mm; flex: none; }
.lbl .qr svg { width: 100%; height: 100%; display: block; }
.lbl .tx { display: flex; flex-direction: column; height: 25mm; min-width: 0; padding-top: .6mm; }
.lbl .inv { font: 700 10.5pt/1.1 ui-monospace, "SF Mono", Consolas, monospace; letter-spacing: -.02em; }
.lbl .ti { font-size: 7pt; font-weight: 650; line-height: 1.2; margin-top: 1.2mm;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lbl .su { font-size: 5.6pt; color: #555; margin-top: .6mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lbl .br { margin-top: auto; font-size: 4.4pt; font-weight: 700; letter-spacing: .18em; color: #888; }
`;

function labelMarkup(l) {
  return `<div class="lbl">
    <div class="qr">${qrSvg(l.payload)}</div>
    <div class="tx">
      <div class="inv">${h(l.inventory || '—')}</div>
      <div class="ti">${h(l.title)}</div>
      ${l.subtitle ? `<div class="su">${h(l.subtitle)}</div>` : ''}
      <div class="br">SPIELREGAL</div>
    </div>
  </div>`;
}

const SHEET = { cols: 3, rows: 8, get perPage() { return this.cols * this.rows; } };

const SHEET_CSS = `
.sheet { width: 210mm; height: 297mm; box-sizing: border-box; padding: 13.5mm 12mm; background: #fff;
  display: grid; grid-template-columns: repeat(3, 60mm); grid-auto-rows: 30mm; gap: 3mm; align-content: start; }
.sheet .lbl { outline: .2mm dashed #c4c4c4; outline-offset: 0; }
`;

function sheetMarkup(labels) {
  return `<div class="sheet">${labels.map(labelMarkup).join('')}</div>`;
}

/** Vollständiges HTML-Dokument für PDF und Druck */
function printDocument(labels, layout) {
  const pages = layout === 'single'
    ? labels.map((l) => `<div class="page single">${labelMarkup(l)}</div>`).join('')
    : chunk(labels, SHEET.perPage).map((p) => `<div class="page">${sheetMarkup(p)}</div>`).join('');
  const page = layout === 'single' ? '@page { size: 60mm 30mm; margin: 0; }' : '@page { size: A4; margin: 0; }';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${page}
    html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; break-after: page; overflow: hidden; }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .page.single { width: 60mm; height: 30mm; }
    ${LABEL_CSS}
    ${SHEET_CSS}
  </style></head><body>${pages}</body></html>`;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// CSS für die Vorschau in der App einmalig einhängen
(function injectLabelCss() {
  const style = document.createElement('style');
  style.textContent = LABEL_CSS + SHEET_CSS;
  document.head.appendChild(style);
})();

async function exportLabels(labels, layout, name) {
  if (!labels.length) return;
  const ok = await window.api.labelsPdf(printDocument(labels, layout), layout, name);
  if (ok) toast('PDF gespeichert');
}

async function printLabels(labels, layout) {
  if (!labels.length) return;
  await window.api.labelsPrint(printDocument(labels, layout), layout);
}
