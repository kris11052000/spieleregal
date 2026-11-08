/* Dialoge: Editoren, Bestätigung, Einstellungen */

const Modal = { current: null };

function openModal({ title, subtitle = '', body, footer, cls = '', onMount, onClose }) {
  const overlay = $('#overlay');
  overlay.innerHTML = `
    <div class="modal ${cls}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div style="flex:1"><h2>${h(title)}</h2>${subtitle ? `<p>${h(subtitle)}</p>` : ''}</div>
        <button class="icon-btn" data-modal="close" title="Schließen">${icon('close')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  overlay.classList.add('open');
  const el = overlay.firstElementChild;
  Modal.current = { el, onClose };
  overlay.onmousedown = (e) => { if (e.target === overlay) closeModal('cancel'); };
  el.querySelector('[data-modal="close"]').onclick = () => closeModal('cancel');
  if (onMount) onMount(el);
  const first = el.querySelector('[autofocus], input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea');
  if (first) setTimeout(() => first.focus(), 30);
  return el;
}

function closeModal(reason = 'cancel') {
  const cur = Modal.current;
  if (!cur) return;
  Modal.current = null;
  $('#overlay').classList.remove('open');
  $('#overlay').innerHTML = '';
  if (cur.onClose) cur.onClose(reason);
}

function confirmDialog({ title, text, ok = 'Löschen', danger = true }) {
  return new Promise((resolve) => {
    let result = false;
    openModal({
      title, cls: 'narrow',
      body: `<p style="margin:0 0 6px;color:var(--muted)">${h(text)}</p>`,
      footer: `<button class="btn" data-modal="cancel">Abbrechen</button>
               <button class="btn ${danger ? 'danger' : 'primary'}" data-submit autofocus>${h(ok)}</button>`,
      onMount(el) {
        el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
        el.querySelector('[data-submit]').onclick = () => { result = true; closeModal('ok'); };
      },
      onClose: () => resolve(result)
    });
  });
}

// ---------- Formular-Bausteine ----------

function field(label, control, { full = false, hint = '' } = {}) {
  return `<label class="field ${full ? 'full' : ''}"><span>${h(label)}</span>${control}${hint}</label>`;
}

function input(name, value, { placeholder = '', type = 'text', cls = '', attrs = '' } = {}) {
  return `<input class="input ${cls}" name="${name}" type="${type}" value="${h(value ?? '')}" placeholder="${h(placeholder)}" ${attrs}>`;
}

function select(name, options, value) {
  return `<select name="${name}">${Object.entries(options)
    .map(([k, v]) => `<option value="${h(k)}" ${String(k) === String(value ?? '') ? 'selected' : ''}>${h(typeof v === 'string' ? v : v.label)}</option>`)
    .join('')}</select>`;
}

function platformDatalist() {
  return `<datalist id="platform-list">${ALL_PLATFORMS.map((p) => `<option value="${h(p)}">`).join('')}</datalist>`;
}

function readForm(root) {
  const out = {};
  for (const el of $$('[name]', root)) {
    if (el.type === 'checkbox') {
      out[el.name] = out[el.name] || [];
      if (el.checked) out[el.name].push(el.value);
    } else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else {
      out[el.name] = el.value;
    }
  }
  return out;
}

// ---------- Cover-Feld ----------

function coverFieldMarkup(state, landscape = false) {
  return `<div class="cover-field">
    <div class="cover ${landscape ? 'landscape' : ''}" data-cover-drop>${coverInner(state.cover, state.title(), state.subtitle())}</div>
    <div>
      <b>Cover</b>
      <p>Bild hierher ziehen, auswählen oder mit ${window.api.platform === 'darwin' ? '⌘' : 'Strg+'}V einfügen.</p>
      <div class="inline">
        <button type="button" class="btn small" data-cover="choose">Auswählen …</button>
        <button type="button" class="btn small danger" data-cover="remove" ${state.cover ? '' : 'hidden'}>Entfernen</button>
      </div>
    </div>
  </div>`;
}

/** Verwaltet Cover-Auswahl im Dialog; räumt bei Abbruch neu angelegte Dateien wieder weg */
function createCoverState(original, titleFn, subtitleFn) {
  return {
    cover: original || '', original: original || '', created: [],
    title: titleFn, subtitle: subtitleFn,
    commit() {
      for (const c of this.created) if (c !== this.cover) window.api.deleteCover(c);
      if (this.original && this.original !== this.cover && !Store.coverInUse(this.original)) window.api.deleteCover(this.original);
    },
    discard() {
      for (const c of this.created) if (c !== this.original) window.api.deleteCover(c);
    }
  };
}

function mountCoverField(root, state) {
  const box = root.querySelector('[data-cover-drop]');
  const removeBtn = root.querySelector('[data-cover="remove"]');
  const refresh = () => {
    box.innerHTML = coverInner(state.cover, state.title(), state.subtitle());
    removeBtn.hidden = !state.cover;
  };
  const set = (name) => {
    if (!name) return;
    state.created.push(name);
    state.cover = name;
    refresh();
  };
  root.querySelector('[data-cover="choose"]').onclick = async () => set(await window.api.chooseCover());
  removeBtn.onclick = () => { state.cover = ''; refresh(); };

  box.ondragover = (e) => { e.preventDefault(); box.classList.add('drag'); };
  box.ondragleave = () => box.classList.remove('drag');
  box.ondrop = async (e) => {
    e.preventDefault();
    box.classList.remove('drag');
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (file) set(await window.api.coverFromDataUrl(await fileToDataUrl(file)));
  };
  root.addEventListener('paste', async (e) => {
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    set(await window.api.coverFromDataUrl(await fileToDataUrl(file)));
  });
  return refresh;
}

function inventoryControl(type, value, excludeId) {
  const taken = Store.inventoryTaken(value, excludeId);
  return `<div class="inline">
      ${input('inventory', value, { cls: 'mono' + (taken ? ' bad' : '') })}
      <button type="button" class="btn small" data-inv-auto="${type}" style="height:30px">Automatisch</button>
    </div>
    <div class="hint" data-inv-hint ${taken ? '' : 'hidden'}>Diese Nummer ist bereits vergeben.</div>`;
}

function mountInventory(root, type, excludeId, onChange) {
  const inp = root.querySelector('[name="inventory"]');
  const hint = root.querySelector('[data-inv-hint]');
  const check = () => {
    const taken = Store.inventoryTaken(inp.value, excludeId);
    inp.classList.toggle('bad', taken);
    hint.hidden = !taken;
    onChange();
  };
  inp.addEventListener('input', check);
  root.querySelector('[data-inv-auto]').onclick = () => { inp.value = Store.nextInventory(type); check(); };
  return () => !Store.inventoryTaken(inp.value, excludeId);
}

// ---------- Spiel ----------

function openGameEditor(existing, defaults = {}) {
  const isNew = !existing;
  const g = existing ? { ...existing } : newGame({ inventory: Store.nextInventory('game'), ...defaults });
  let root;
  const val = (n) => root?.querySelector(`[name="${n}"]`)?.value ?? '';
  const cover = createCoverState(g.cover, () => val('title') || g.title, () => val('platform') || g.platform);

  const body = `
    ${coverFieldMarkup(cover)}
    <fieldset class="fs"><legend>Allgemein</legend><div class="fields">
      ${field('Titel', input('title', g.title, { placeholder: 'Pflichtfeld', attrs: 'autofocus' }), { full: true })}
      ${field('Plattform', input('platform', g.platform, { placeholder: 'z. B. PlayStation 5', attrs: 'list="platform-list"' }))}
      ${field('Edition', select('edition', EDITION, g.edition))}
      ${field('Inhalt der Edition', input('editionNote', g.editionNote, { placeholder: 'z. B. Steelbook, Artbook, Figur' }), { full: true })}
      ${field('Spielereihe', input('series', g.series, { placeholder: 'z. B. Metro' }))}
      ${field('Genre', input('genre', g.genre, { placeholder: 'z. B. Shooter' }))}
    </div></fieldset>
    <fieldset class="fs"><legend>Details</legend><div class="fields">
      ${field('Publisher', input('publisher', g.publisher))}
      ${field('Entwickler', input('developer', g.developer))}
      ${field('Erscheinungsjahr', input('year', g.year ?? '', { placeholder: 'JJJJ', attrs: 'inputmode="numeric" maxlength="4"' }))}
      ${field('Alterseinstufung', select('usk', USK, g.usk))}
    </div></fieldset>
    <fieldset class="fs"><legend>Spielstand</legend><div class="fields">
      <div class="field full"><span>Status</span><div class="seg-field">
        ${Object.entries(STATUS).map(([k, s]) => `<label><input type="radio" name="status" value="${k}" ${g.status === k ? 'checked' : ''}><span>${icon(s.icon)}${s.label}</span></label>`).join('')}
      </div></div>
      <div class="field"><span>Fortschritt</span>
        <div class="range-row" style="margin:0;height:30px"><input type="range" name="progress" min="0" max="100" step="5" value="${g.progress}"><output>${fmt.percent(g.progress)}</output></div>
      </div>
      ${field('Spielzeit (Std.)', input('playtime', g.playtime ?? '', { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
    </div></fieldset>
    <fieldset class="fs"><legend>Sammlung</legend><div class="fields">
      ${field('Zustand', select('condition', CONDITION, g.condition))}
      <div class="field"><span>Inventar-Nr.</span>${inventoryControl('game', g.inventory, g.id)}</div>
      ${field('Barcode (EAN)', input('barcode', g.barcode, { placeholder: 'optional', attrs: 'inputmode="numeric"' }))}
      ${field('Kaufpreis (€)', input('price', fmt.inputNumber(g.price), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      ${field('Kaufdatum', input('purchaseDate', g.purchaseDate, { type: 'date' }))}
    </div></fieldset>
    <fieldset class="fs" style="margin-bottom:0"><legend>Notizen</legend>
      <div class="field"><textarea name="notes" rows="3">${h(g.notes)}</textarea></div>
    </fieldset>
    ${platformDatalist()}`;

  let saved = false;
  openModal({
    title: isNew ? 'Neues Spiel' : 'Spiel bearbeiten',
    subtitle: isNew ? '' : g.inventory,
    body,
    footer: `${isNew ? '' : `<button class="btn danger left" data-delete>${icon('trash')}Löschen</button>`}
             <button class="btn" data-modal="cancel">Abbrechen</button>
             <button class="btn primary" data-submit>Sichern</button>`,
    onMount(el) {
      root = el;
      const refreshCover = mountCoverField(el, cover);
      const submit = el.querySelector('[data-submit]');
      const noteField = el.querySelector('[name="editionNote"]').closest('.field');
      const progress = el.querySelector('[name="progress"]');
      const output = progress.nextElementSibling;
      let inventoryOk = () => true;
      const validate = () => { submit.disabled = !val('title').trim() || !inventoryOk(); };
      inventoryOk = mountInventory(el, 'game', g.id, validate);

      const syncEdition = () => { noteField.hidden = val('edition') === 'standard'; };
      el.querySelector('[name="edition"]').onchange = syncEdition;
      syncEdition();
      progress.oninput = () => { output.textContent = fmt.percent(progress.value); };
      for (const r of $$('[name="status"]', el)) {
        r.onchange = () => {
          if (r.value === 'completed') progress.value = 100;
          if (r.value === 'backlog') progress.value = 0;
          output.textContent = fmt.percent(progress.value);
        };
      }
      el.querySelector('[name="title"]').addEventListener('input', () => { validate(); if (!cover.cover) refreshCover(); });
      el.querySelector('[name="platform"]').addEventListener('input', () => { if (!cover.cover) refreshCover(); });
      validate();

      el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
      const del = el.querySelector('[data-delete]');
      if (del) del.onclick = async () => { closeModal('cancel'); await deleteItem('games', existing); };
      submit.onclick = () => {
        if (submit.disabled) return;
        const f = readForm(el);
        Object.assign(g, {
          title: f.title.trim(), platform: f.platform.trim(), publisher: f.publisher.trim(),
          developer: f.developer.trim(), genre: f.genre.trim(), series: f.series.trim(),
          year: parseIntOrNull(f.year), usk: f.usk, edition: f.edition,
          editionNote: f.edition === 'standard' ? '' : f.editionNote.trim(),
          status: f.status || 'backlog', progress: Number(f.progress) || 0,
          playtime: parseNumber(f.playtime), condition: f.condition,
          inventory: f.inventory.trim() || Store.nextInventory('game'),
          barcode: f.barcode.trim(), price: parseNumber(f.price), purchaseDate: f.purchaseDate,
          notes: f.notes, cover: cover.cover
        });
        saved = true;
        Store.upsert('games', g);
        cover.commit();
        closeModal('ok');
        App.select('game', g.id);
        toast(isNew ? `„${g.title}“ hinzugefügt` : 'Gespeichert');
      };
    },
    onClose() { if (!saved) cover.discard(); }
  });
}

// ---------- Konsole ----------

function openConsoleEditor(existing) {
  const isNew = !existing;
  const c = existing ? { ...existing, maintenance: [...(existing.maintenance || [])] }
    : newConsole({ inventory: Store.nextInventory('console') });
  let root;
  const val = (n) => root?.querySelector(`[name="${n}"]`)?.value ?? '';
  const cover = createCoverState(c.cover, () => val('name') || c.name, () => manufacturerFor(val('platform') || c.platform));

  const body = `
    ${coverFieldMarkup(cover, true)}
    <fieldset class="fs"><legend>Allgemein</legend><div class="fields">
      ${field('Plattform', input('platform', c.platform, { placeholder: 'z. B. PlayStation 5', attrs: 'list="platform-list"' }))}
      ${field('Name', input('name', c.name, { placeholder: 'z. B. PlayStation 5 Slim' }))}
      ${field('Modell-Nr.', input('model', c.model, { placeholder: 'z. B. CFI-2016' }))}
      ${field('Edition / Farbe', input('edition', c.edition, { placeholder: 'z. B. 30th Anniversary' }))}
      ${field('Seriennummer', input('serial', c.serial), { full: true })}
    </div></fieldset>
    <fieldset class="fs"><legend>Sammlung</legend><div class="fields">
      ${field('Zustand', select('condition', CONDITION, c.condition))}
      <div class="field"><span>Inventar-Nr.</span>${inventoryControl('console', c.inventory, c.id)}</div>
      ${field('Kaufpreis (€)', input('price', fmt.inputNumber(c.price), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      ${field('Kaufdatum', input('purchaseDate', c.purchaseDate, { type: 'date' }))}
    </div></fieldset>
    <fieldset class="fs"><legend>Wartung</legend><div class="fields">
      ${field('Erinnerung', select('interval', { 0: 'Keine Erinnerung', 1: 'Jeden Monat', 2: 'Alle 2 Monate', 3: 'Alle 3 Monate', 4: 'Alle 4 Monate', 6: 'Alle 6 Monate', 9: 'Alle 9 Monate', 12: 'Jährlich', 24: 'Alle 2 Jahre' }, c.interval))}
      <div class="field"><span>&nbsp;</span><span class="muted" style="font-size:12px">Gemessen ab der letzten Wartung bzw. dem Kaufdatum.</span></div>
    </div></fieldset>
    <fieldset class="fs" style="margin-bottom:0"><legend>Notizen</legend>
      <div class="field"><textarea name="notes" rows="3">${h(c.notes)}</textarea></div>
    </fieldset>
    ${platformDatalist()}`;

  let saved = false;
  openModal({
    title: isNew ? 'Neue Konsole' : 'Konsole bearbeiten',
    subtitle: isNew ? '' : c.inventory,
    body,
    footer: `${isNew ? '' : `<button class="btn danger left" data-delete>${icon('trash')}Löschen</button>`}
             <button class="btn" data-modal="cancel">Abbrechen</button>
             <button class="btn primary" data-submit>Sichern</button>`,
    onMount(el) {
      root = el;
      const refreshCover = mountCoverField(el, cover);
      const submit = el.querySelector('[data-submit]');
      const nameInput = el.querySelector('[name="name"]');
      const platformInput = el.querySelector('[name="platform"]');
      let inventoryOk = () => true;
      const validate = () => { submit.disabled = !(val('name').trim() || val('platform').trim()) || !inventoryOk(); };
      inventoryOk = mountInventory(el, 'console', c.id, validate);
      let lastPlatform = platformInput.value;
      platformInput.addEventListener('input', () => {
        // Name aus der Plattform übernehmen, solange er nicht abweicht
        if (!nameInput.value || nameInput.value === lastPlatform) nameInput.value = platformInput.value;
        lastPlatform = platformInput.value;
        validate();
        if (!cover.cover) refreshCover();
      });
      nameInput.addEventListener('input', () => { validate(); if (!cover.cover) refreshCover(); });
      validate();
      el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
      const del = el.querySelector('[data-delete]');
      if (del) del.onclick = async () => { closeModal('cancel'); await deleteItem('consoles', existing); };
      submit.onclick = () => {
        if (submit.disabled) return;
        const f = readForm(el);
        Object.assign(c, {
          name: (f.name.trim() || f.platform.trim()), platform: f.platform.trim(), model: f.model.trim(),
          edition: f.edition.trim(), serial: f.serial.trim(), condition: f.condition,
          inventory: f.inventory.trim() || Store.nextInventory('console'),
          price: parseNumber(f.price), purchaseDate: f.purchaseDate, interval: Number(f.interval) || 0,
          notes: f.notes, cover: cover.cover
        });
        saved = true;
        Store.upsert('consoles', c);
        cover.commit();
        closeModal('ok');
        App.select('console', c.id);
        toast(isNew ? `„${c.name}“ hinzugefügt` : 'Gespeichert');
      };
    },
    onClose() { if (!saved) cover.discard(); }
  });
}

// ---------- Wartung ----------

function openMaintenanceEditor(consoleItem, entry) {
  const isNew = !entry;
  const m = entry ? { ...entry } : { id: uid(), date: isoDate(today()), kinds: [], notes: '' };
  openModal({
    title: isNew ? 'Wartung eintragen' : 'Wartung bearbeiten',
    subtitle: consoleItem.name,
    cls: 'narrow',
    body: `
      <div class="fields" style="grid-template-columns:1fr;margin-bottom:16px">
        ${field('Datum', input('date', m.date, { type: 'date' }))}
      </div>
      <fieldset class="fs"><legend>Durchgeführt</legend><div class="checks">
        ${Object.entries(MAINTENANCE).map(([k, v]) => `<label class="check"><input type="checkbox" name="kinds" value="${k}" ${m.kinds.includes(k) ? 'checked' : ''}>${icon(v.icon)}<span>${h(v.label)}</span></label>`).join('')}
      </div></fieldset>
      <fieldset class="fs" style="margin-bottom:0"><legend>Notizen</legend>
        <div class="field"><textarea name="notes" rows="3" placeholder="z. B. Lüfter mit Druckluft gereinigt, Ports mit Isopropyl (99 %)">${h(m.notes)}</textarea></div>
      </fieldset>`,
    footer: `${isNew ? '' : `<button class="btn danger left" data-delete>${icon('trash')}Löschen</button>`}
             <button class="btn" data-modal="cancel">Abbrechen</button>
             <button class="btn primary" data-submit>Sichern</button>`,
    onMount(el) {
      const submit = el.querySelector('[data-submit]');
      const validate = () => {
        const f = readForm(el);
        submit.disabled = !f.date || (!(f.kinds || []).length && !f.notes.trim());
      };
      el.addEventListener('input', validate);
      validate();
      el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
      const del = el.querySelector('[data-delete]');
      if (del) del.onclick = () => {
        consoleItem.maintenance = consoleItem.maintenance.filter((x) => x.id !== m.id);
        Store.upsert('consoles', consoleItem);
        closeModal('ok');
        App.render();
      };
      submit.onclick = () => {
        if (submit.disabled) return;
        const f = readForm(el);
        Object.assign(m, { date: f.date, kinds: f.kinds || [], notes: f.notes.trim() });
        const list = consoleItem.maintenance || [];
        const i = list.findIndex((x) => x.id === m.id);
        if (i >= 0) list[i] = m; else list.push(m);
        consoleItem.maintenance = list;
        Store.upsert('consoles', consoleItem);
        closeModal('ok');
        App.render();
        toast('Wartung gespeichert');
      };
    }
  });
}

// ---------- Wunsch ----------

function openWishEditor(existing) {
  const isNew = !existing;
  const w = existing ? { ...existing } : newWish();
  let root;
  const val = (n) => root?.querySelector(`[name="${n}"]`)?.value ?? '';
  const cover = createCoverState(w.cover, () => val('title') || w.title, () => val('platform') || w.platform);

  const body = `
    ${coverFieldMarkup(cover)}
    <fieldset class="fs"><legend>Allgemein</legend><div class="fields">
      ${field('Titel', input('title', w.title, { placeholder: 'Pflichtfeld', attrs: 'autofocus' }), { full: true })}
      ${field('Art', select('kind', WISH_KIND, w.kind))}
      ${field('Plattform', input('platform', w.platform, { placeholder: 'z. B. PlayStation 5', attrs: 'list="platform-list"' }))}
      <div class="field full"><span>Priorität</span><div class="seg-field">
        ${Object.entries(PRIORITY).reverse().map(([k, p]) => `<label><input type="radio" name="priority" value="${k}" ${w.priority === k ? 'checked' : ''}><span>${p.label}</span></label>`).join('')}
      </div></div>
    </div></fieldset>
    <fieldset class="fs"><legend>Termin & Preis</legend><div class="fields">
      ${field('Erscheint am', input('releaseDate', w.releaseDate, { type: 'date' }))}
      ${field('Zielpreis (€)', input('targetPrice', fmt.inputNumber(w.targetPrice), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      ${field('Link (Shop, Vorbestellung)', input('link', w.link, { placeholder: 'https://…' }), { full: true })}
    </div></fieldset>
    <fieldset class="fs" style="margin-bottom:0"><legend>Notizen</legend>
      <div class="field"><textarea name="notes" rows="3">${h(w.notes)}</textarea></div>
    </fieldset>
    ${platformDatalist()}`;

  let saved = false;
  openModal({
    title: isNew ? 'Neuer Wunsch' : 'Wunsch bearbeiten',
    body,
    footer: `${isNew ? '' : `<button class="btn danger left" data-delete>${icon('trash')}Löschen</button>`}
             <button class="btn" data-modal="cancel">Abbrechen</button>
             <button class="btn primary" data-submit>Sichern</button>`,
    onMount(el) {
      root = el;
      const refreshCover = mountCoverField(el, cover);
      const submit = el.querySelector('[data-submit]');
      const validate = () => { submit.disabled = !val('title').trim(); };
      el.querySelector('[name="title"]').addEventListener('input', () => { validate(); if (!cover.cover) refreshCover(); });
      validate();
      el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
      const del = el.querySelector('[data-delete]');
      if (del) del.onclick = async () => { closeModal('cancel'); await deleteItem('wishlist', existing); };
      submit.onclick = () => {
        if (submit.disabled) return;
        const f = readForm(el);
        Object.assign(w, {
          title: f.title.trim(), kind: f.kind, platform: f.platform.trim(), priority: f.priority || 'normal',
          releaseDate: f.releaseDate, targetPrice: parseNumber(f.targetPrice), link: f.link.trim(),
          notes: f.notes, cover: cover.cover
        });
        saved = true;
        Store.upsert('wishlist', w);
        cover.commit();
        closeModal('ok');
        App.select('wish', w.id);
        toast(isNew ? `„${w.title}“ auf die Wunschliste gesetzt` : 'Gespeichert');
      };
    },
    onClose() { if (!saved) cover.discard(); }
  });
}

// ---------- Einstellungen ----------

async function openSettings() {
  const s = Store.settings;
  const info = await window.api.appInfo();
  openModal({
    title: 'Einstellungen',
    cls: 'narrow',
    body: `
      <fieldset class="fs"><legend>Inventarnummern</legend><div class="fields">
        ${field('Präfix Spiele', input('prefixGame', s.prefixGame, { cls: 'mono' }))}
        ${field('Präfix Konsolen', input('prefixConsole', s.prefixConsole, { cls: 'mono' }))}
      </div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">Neue Nummern werden fortlaufend vergeben, z. B. <span data-example style="font-family:var(--mono)"></span>.</p>
      </fieldset>
      <fieldset class="fs"><legend>Wartung</legend><div class="fields">
        ${field('Standard-Erinnerung für neue Konsolen', select('defaultInterval', { 0: 'Keine', 3: 'Alle 3 Monate', 6: 'Alle 6 Monate', 12: 'Jährlich' }, s.defaultInterval), { full: true })}
      </div></fieldset>
      <fieldset class="fs" style="margin-bottom:0"><legend>Daten</legend>
        <div class="inline" style="flex-wrap:wrap">
          <button class="btn" data-act="export">${icon('download')}Sicherung exportieren</button>
          <button class="btn" data-act="import">${icon('upload')}Importieren</button>
          <button class="btn ghost" data-act="folder">${icon('folder')}Datenordner</button>
        </div>
        <p class="muted" style="font-size:12px;margin:10px 0 0">Die Sicherung ist eine JSON-Datei inklusive Cover. Beim Import werden nur fehlende Einträge ergänzt.<br>
        Speicherort: <span style="user-select:text">${h(info.dataPath)}</span></p>
      </fieldset>`,
    footer: `<button class="btn primary" data-submit>Fertig</button>`,
    onMount(el) {
      const example = el.querySelector('[data-example]');
      const upd = () => { example.textContent = (el.querySelector('[name="prefixGame"]').value.trim() || 'SP') + '-0001'; };
      el.addEventListener('input', upd);
      upd();
      el.querySelector('[data-act="export"]').onclick = () => App.exportBackup();
      el.querySelector('[data-act="import"]').onclick = async () => { closeModal('ok'); await App.importBackup(); };
      el.querySelector('[data-act="folder"]').onclick = () => window.api.openDataFolder();
      el.querySelector('[data-submit]').onclick = () => closeModal('ok');
    }
  });
  // Änderungen sofort übernehmen
  const el = Modal.current.el;
  el.addEventListener('change', () => {
    const f = readForm(el);
    s.prefixGame = (f.prefixGame || '').trim() || 'SP';
    s.prefixConsole = (f.prefixConsole || '').trim() || 'KO';
    s.defaultInterval = Number(f.defaultInterval) || 0;
    Store.save();
  });
}
