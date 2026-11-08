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
  return { state, refresh, set, loading: (on) => box.classList.toggle('loading', !!on) };
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

function openGameEditor(existing, defaults = {}, opts = {}) {
  const isNew = !existing;
  const g = existing ? { ...existing } : newGame({ inventory: Store.nextInventory('game'), ...defaults });
  const autoInventory = existing ? null : g.inventory;
  let root;
  const val = (n) => root?.querySelector(`[name="${n}"]`)?.value ?? '';
  const cover = createCoverState(g.cover, () => val('title') || g.title, () => val('platform') || g.platform);

  const body = `
    ${coverFieldMarkup(cover)}
    <fieldset class="fs"><legend>Allgemein</legend><div class="fields">
      ${field('Titel', `<div class="inline">${input('title', g.title, { placeholder: 'Pflichtfeld – Vorschläge erscheinen beim Tippen', attrs: 'autofocus autocomplete="off"' })}${onlineButton()}</div>`, { full: true, hint: '<div class="sg-hint" data-online-hint></div>' })}
      ${field('Plattform', input('platform', g.platform, { placeholder: 'z. B. PlayStation 5', attrs: 'list="platform-list"' }), { hint: '<div class="chips" data-platform-chips></div>' })}
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
        ${pctMarkup(g.progress, { name: 'progress' })}
      </div>
      ${field('Spielzeit (Std.)', input('playtime', g.playtime ?? '', { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
    </div></fieldset>
    <fieldset class="fs"><legend>Sammlung</legend><div class="fields">
      <div class="field full"><span>Format</span><div class="seg-field">
        ${Object.entries(FORMAT).map(([k, f]) => `<label><input type="radio" name="format" value="${k}" ${g.format === k ? 'checked' : ''}><span>${icon(k === 'digital' ? 'download' : 'disc')}${f.label}</span></label>`).join('')}
      </div></div>
      <div class="field" data-when="digital">${'<span>Gekauft bei</span>' + select('store', { '': '— auswählen —', ...Object.fromEntries(STORES.map((x) => [x, x])) }, g.store)}</div>
      <div class="field" data-when="physical"><span>Zustand</span>${select('condition', CONDITION_SELECT, g.condition)}</div>
      <div class="field" data-when="physical"><span>Inventar-Nr.</span>${inventoryControl('game', g.inventory, g.id)}</div>
      <div class="field" data-when="physical"><span>Barcode (EAN)</span>${input('barcode', g.barcode, { placeholder: 'optional', attrs: 'inputmode="numeric"' })}</div>
      ${field('Kaufpreis (€)', input('price', fmt.inputNumber(g.price), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      <div class="field" data-when="physical"><span>Aktueller Wert (€)</span>${input('value', fmt.inputNumber(g.value), { placeholder: 'optional', attrs: 'inputmode="decimal"' })}</div>
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
      const coverField = mountCoverField(el, cover);
      const refreshCover = coverField.refresh;
      const submit = el.querySelector('[data-submit]');
      const noteField = el.querySelector('[name="editionNote"]').closest('.field');
      const progress = el.querySelector('[data-pct="range"]');
      const progressText = el.querySelector('[name="progress"]');
      const setProgress = (v) => { progress.value = v; progressText.value = fmt.num(v); };
      let inventoryOk = () => true;
      const validate = () => { submit.disabled = !val('title').trim() || !inventoryOk(); };
      inventoryOk = mountInventory(el, 'game', g.id, validate);

      const syncEdition = () => { noteField.hidden = val('edition') === 'standard'; };
      const syncFormat = () => {
        const fmtVal = el.querySelector('[name="format"]:checked')?.value || 'physical';
        for (const x of $$('[data-when]', el)) x.hidden = x.dataset.when !== fmtVal;
      };
      for (const r of $$('[name="format"]', el)) r.addEventListener('change', syncFormat);
      syncFormat();
      el.querySelector('[name="edition"]').onchange = syncEdition;
      syncEdition();
      for (const r of $$('[name="status"]', el)) {
        r.onchange = () => {
          if (r.value === 'completed') setProgress(100);
          if (r.value === 'backlog') setProgress(0);
        };
      }
      el.querySelector('[name="title"]').addEventListener('input', () => { validate(); if (!cover.cover) refreshCover(); });
      el.querySelector('[name="platform"]').addEventListener('input', () => { if (!cover.cover) refreshCover(); });
      validate();

      // Online-Vorschläge
      const setv = (n, v) => { const x = el.querySelector(`[name="${n}"]`); if (x) x.value = v; };
      const titleInput = el.querySelector('[name="title"]');
      const hintEl = el.querySelector('[data-online-hint]');
      if (!Online.configured && isNew) hintEl.innerHTML = 'Tipp: Mit Online-Daten (Einstellungen) werden Infos und Cover automatisch vorgeschlagen.';
      const suggest = attachSuggest({
        input: titleInput, kind: 'game', auto: isNew,
        async onPick(r) {
          setv('title', r.title);
          let filled = 0;
          for (const [n, v] of [['publisher', r.publisher], ['developer', r.developer], ['genre', r.genre], ['series', r.series], ['year', r.year ?? '']]) {
            if (v && !val(n).trim()) { setv(n, v); filled++; }
          }
          if (r.usk && !val('usk')) { setv('usk', r.usk); filled++; }
          if (!val('platform').trim()) { const p = bestPlatform(r.platforms); if (p) { setv('platform', p); filled++; } }
          showPlatformChips(el, r.platforms, (p) => { setv('platform', p); if (!cover.cover) refreshCover(); });
          g.igdbId = r.igdbId;
          validate();
          refreshCover();
          hintEl.textContent = 'Daten werden übernommen …';
          const got = await applyOnlineCover(coverField, r.coverUrl);
          hintEl.innerHTML = `${icon('check')} Von IGDB übernommen${filled ? ` – ${filled} Feld${filled === 1 ? '' : 'er'} ergänzt` : ''}${got ? ', Cover geladen' : ''}. Bereits ausgefüllte Felder bleiben unverändert.`;
        }
      });
      el.querySelector('[data-online-search]').onclick = () => suggest.search(titleInput.value, { force: true });
      if (opts.search && titleInput.value.trim()) setTimeout(() => suggest.search(titleInput.value, { force: true }), 60);

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
          status: f.status || 'backlog', progress: clampPct(parseNumber(f.progress)) ?? 0,
          playtime: parseNumber(f.playtime), condition: f.condition,
          format: f.format || 'physical', store: f.format === 'digital' ? f.store : '',
          // Digitale Spiele brauchen kein Etikett: vorgeschlagene Nummer nicht verbrauchen
          inventory: f.format === 'digital' ? (f.inventory.trim() === autoInventory ? '' : f.inventory.trim()) : (f.inventory.trim() || Store.nextInventory('game')),
          barcode: f.barcode.trim(), price: parseNumber(f.price), purchaseDate: f.purchaseDate,
          notes: f.notes, cover: cover.cover
        });
        const newValue = f.format === 'digital' ? null : parseNumber(f.value);
        if (newValue !== g.value) {
          g.value = newValue;
          g.valueDate = newValue != null ? isoDate(today()) : '';
          g.valueNote = newValue != null ? 'Manuell eingetragen' : '';
        }
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
      ${field('Name', `<div class="inline">${input('name', c.name, { placeholder: 'z. B. PlayStation 5 Slim – Vorschläge beim Tippen', attrs: 'autofocus autocomplete="off"' })}${onlineButton()}</div>`, { full: true, hint: '<div class="sg-hint" data-online-hint></div>' })}
      ${field('Plattform', input('platform', c.platform, { placeholder: 'z. B. PlayStation 5', attrs: 'list="platform-list"' }))}
      ${field('Modell-Nr.', input('model', c.model, { placeholder: 'z. B. CFI-2016' }))}
      ${field('Edition / Farbe', input('edition', c.edition, { placeholder: 'z. B. 30th Anniversary' }))}
      ${field('Seriennummer', input('serial', c.serial), { full: true })}
    </div></fieldset>
    <fieldset class="fs"><legend>Sammlung</legend><div class="fields">
      ${field('Zustand', select('condition', CONDITION_SELECT, c.condition))}
      <div class="field"><span>Inventar-Nr.</span>${inventoryControl('console', c.inventory, c.id)}</div>
      ${field('Kaufpreis (€)', input('price', fmt.inputNumber(c.price), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      ${field('Aktueller Wert (€)', input('value', fmt.inputNumber(c.value), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
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
      const coverField = mountCoverField(el, cover);
      const refreshCover = coverField.refresh;
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

      const hintEl = el.querySelector('[data-online-hint]');
      const suggest = attachSuggest({
        input: nameInput, kind: 'platform', auto: isNew,
        async onPick(r) {
          nameInput.value = r.version ? r.version.name : r.name;
          platformInput.value = r.platform;
          lastPlatform = r.platform;
          c.igdbId = r.igdbId;
          const v = r.version || {};
          c.year = v.year || r.year || c.year || null;
          c.summary = v.summary || r.summary || c.summary || '';
          validate();
          refreshCover();
          hintEl.innerHTML = '<span class="spinner"></span>Suche Produktfoto …';
          // Produktfoto von Wikipedia, sonst Logo von IGDB
          let photo = '';
          try { photo = await Online.call('wikiImage', [v.name, r.name].filter(Boolean)); } catch (_) { /* egal */ }
          const got = await applyOnlineCover(coverField, photo || v.logoUrl || r.logoUrl);
          const bits = [got ? (photo ? 'Foto von Wikipedia' : 'Logo als Bild') : '', c.year ? 'Erscheinungsjahr ' + c.year : ''].filter(Boolean);
          hintEl.innerHTML = `${icon('check')} Übernommen${bits.length ? ' – ' + bits.join(', ') : ''}. Modell-Nr. und Seriennummer bitte selbst ergänzen.`;
        }
      });
      el.querySelector('[data-online-search]').onclick = () => suggest.search(nameInput.value || platformInput.value, { force: true });
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
        const cv = parseNumber(f.value);
        if (cv !== c.value) { c.value = cv; c.valueDate = cv != null ? isoDate(today()) : ''; c.valueNote = cv != null ? 'Manuell eingetragen' : ''; }
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
      ${field('Titel', `<div class="inline">${input('title', w.title, { placeholder: 'Pflichtfeld – Vorschläge erscheinen beim Tippen', attrs: 'autofocus autocomplete="off"' })}${onlineButton()}</div>`, { full: true, hint: '<div class="sg-hint" data-online-hint></div>' })}
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
      const coverField = mountCoverField(el, cover);
      const refreshCover = coverField.refresh;
      const submit = el.querySelector('[data-submit]');
      const validate = () => { submit.disabled = !val('title').trim(); };
      el.querySelector('[name="title"]').addEventListener('input', () => { validate(); if (!cover.cover) refreshCover(); });
      validate();

      const setv = (n, v) => { const x = el.querySelector(`[name="${n}"]`); if (x) x.value = v; };
      const titleInput = el.querySelector('[name="title"]');
      const hintEl = el.querySelector('[data-online-hint]');
      const suggest = attachSuggest({
        input: titleInput, kind: 'game', auto: isNew,
        async onPick(r) {
          setv('title', r.title);
          if (!val('platform').trim()) setv('platform', bestPlatform(r.platforms));
          if (!val('releaseDate') && r.releaseDate) setv('releaseDate', r.releaseDate);
          if (val('kind') === 'game' && r.group === 'dlc') setv('kind', 'dlc');
          w.igdbId = r.igdbId;
          validate();
          refreshCover();
          const got = await applyOnlineCover(coverField, r.coverUrl);
          hintEl.innerHTML = `${icon('check')} Von IGDB übernommen${got ? ', Cover geladen' : ''}.`;
        }
      });
      el.querySelector('[data-online-search]').onclick = () => suggest.search(titleInput.value, { force: true });

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

const SETTINGS_TABS = { general: 'Allgemein', igdb: 'Online-Daten', accounts: 'Konten', prices: 'Preise', data: 'Daten' };

async function openSettings(tab = 'general') {
  const s = Store.settings;
  const [info, ig, acc] = await Promise.all([window.api.appInfo(), Online.refresh(), Accounts.refresh()]);
  const ext = (url, label) => `<a href="#" data-ext="${h(url)}">${h(label)}</a>`;
  const statusLine = (ok, text) => `<span class="${ok ? 'ok' : 'muted'}" style="font-size:12px">${ok ? '✓ ' : ''}${h(text)}</span>`;

  const panes = {
    general: `
      <fieldset class="fs"><legend>Inventarnummern</legend><div class="fields three">
        ${field('Präfix Spiele', input('prefixGame', s.prefixGame, { cls: 'mono' }))}
        ${field('Präfix Konsolen', input('prefixConsole', s.prefixConsole, { cls: 'mono' }))}
        ${field('Präfix Zubehör', input('prefixAccessory', s.prefixAccessory || 'ZB', { cls: 'mono' }))}
      </div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">Neue Nummern werden fortlaufend vergeben, z. B. <span data-example style="font-family:var(--mono)"></span>.</p>
      </fieldset>
      <fieldset class="fs" style="margin-bottom:0"><legend>Wartung</legend><div class="fields">
        ${field('Standard-Erinnerung für neue Konsolen', select('defaultInterval', { 0: 'Keine', 3: 'Alle 3 Monate', 6: 'Alle 6 Monate', 12: 'Jährlich' }, s.defaultInterval), { full: true })}
      </div></fieldset>`,

    igdb: `
      <p class="muted" style="font-size:12px;margin:0 0 12px">Für Spiel- und Konsolen-Infos, Cover und den Release-Kalender. Kostenlos über einen Twitch-Entwicklerzugang.</p>
      <div class="fields">
        ${field('Client-ID', input('igdbClientId', ig.clientId, { cls: 'mono', attrs: 'autocomplete="off" spellcheck="false"' }))}
        ${field('Client-Secret', input('igdbSecret', '', { type: 'password', placeholder: ig.hasSecret ? '•••••• gespeichert' : '', attrs: 'autocomplete="off"' }))}
      </div>
      <div class="inline" style="margin-top:10px;align-items:center;gap:10px">
        <button class="btn" data-act="igdb-save">Speichern &amp; testen</button>
        <span data-status="igdb">${statusLine(Online.configured, Online.configured ? 'Eingerichtet' : 'Noch nicht eingerichtet')}</span>
      </div>
      <details class="howto">
        <summary>So bekommst du die Zugangsdaten (ca. 3 Minuten)</summary>
        <ol>
          <li>Auf ${ext('https://dev.twitch.tv/console/apps', 'dev.twitch.tv/console/apps')} mit einem Twitch-Konto anmelden. Zwei-Faktor-Authentifizierung muss im Twitch-Konto aktiv sein.</li>
          <li><b>Register Your Application</b>: Name frei, aber eindeutig · OAuth Redirect URL <code>http://localhost</code> · Kategorie <i>Application Integration</i> · Client-Typ <i>Confidential</i>.</li>
          <li>Bei der Anwendung auf <b>Manage</b>: <b>Client-ID</b> kopieren, unter <b>New Secret</b> ein Secret erzeugen und kopieren.</li>
          <li>Beides oben eintragen und <b>Speichern &amp; testen</b>.</li>
        </ol>
      </details>`,

    accounts: `
      <div class="acct">
        <div class="acct-head"><b>PlayStation Network</b><span data-status="psn">${statusLine(acc.psn.connected, acc.psn.connected ? `Verbunden${acc.psn.onlineId ? ' als ' + acc.psn.onlineId : ''}` : 'Nicht verbunden')}</span></div>
        <p class="muted small">Trophäen, Fortschritt und Spielzeit (PS4/PS5). Inoffizielle Schnittstelle – kann sich ändern.</p>
        <div class="inline">${input('npsso', '', { type: 'password', placeholder: 'NPSSO-Code (64 Zeichen) einfügen', attrs: 'autocomplete="off"' })}
          <button class="btn" data-act="psn-connect">Verbinden</button>
          ${acc.psn.connected ? '<button class="btn ghost" data-act="psn-disconnect">Trennen</button>' : ''}</div>
        <details class="howto"><summary>So bekommst du den NPSSO-Code</summary><ol>
          <li>Im Browser auf ${ext('https://www.playstation.com/', 'playstation.com')} mit deinem PSN-Konto anmelden.</li>
          <li>Danach im selben Browser ${ext('https://ca.account.sony.com/api/v1/ssocookie', 'ca.account.sony.com/api/v1/ssocookie')} öffnen.</li>
          <li>Dort steht <code>{"npsso":"…"}</code>. Den Code zwischen den Anführungszeichen (64 Zeichen) kopieren und oben einfügen.</li>
          <li>Der Code ist wie ein Passwort – nicht weitergeben. Die Verbindung hält ca. 2 Monate, dann einfach neu verbinden.</li>
        </ol></details>
      </div>
      <div class="acct">
        <div class="acct-head"><b>Xbox</b><span data-status="xbox">${statusLine(acc.xbox.connected, acc.xbox.connected ? `Verbunden${acc.xbox.gamertag ? ' als ' + acc.xbox.gamertag : ''}` : 'Nicht verbunden')}</span></div>
        <p class="muted small">Erfolge und Gamerscore über den Dienst OpenXBL (kostenlos, 150 Abrufe pro Stunde).</p>
        <div class="inline">${input('xblKey', '', { type: 'password', placeholder: 'OpenXBL-API-Schlüssel einfügen', attrs: 'autocomplete="off"' })}
          <button class="btn" data-act="xbox-connect">Verbinden</button>
          ${acc.xbox.connected ? '<button class="btn ghost" data-act="xbox-disconnect">Trennen</button>' : ''}</div>
        <details class="howto"><summary>So bekommst du den Schlüssel</summary><ol>
          <li>${ext('https://xbl.io/', 'xbl.io')} öffnen und mit deinem Microsoft-/Xbox-Konto anmelden.</li>
          <li>Im Profil unter <b>API Keys</b> einen neuen Schlüssel erstellen und kopieren.</li>
        </ol></details>
      </div>
      <div class="acct" style="border:0">
        <div class="acct-head"><b>Nintendo</b><span class="muted" style="font-size:12px">nicht möglich</span></div>
        <p class="muted small" style="margin:0">Nintendo hat keine Trophäen/Erfolge und keine Schnittstelle für Spielzeiten. Fortschritt bitte per Checkliste pflegen.</p>
      </div>
      <button class="btn primary" data-act="sync" ${acc.psn.connected || acc.xbox.connected ? '' : 'disabled'}>${icon('refresh')}Jetzt abgleichen</button>`,

    prices: `
      <fieldset class="fs"><legend>Wert schätzen (eBay.de)</legend>
        <p class="muted" style="font-size:12px;margin:0 0 10px">Schätzt den Wert aus aktuellen Sofortkauf-Angeboten in Deutschland (Median, Ausreißer entfernt). Kostenlos mit einem eBay-Entwicklerkonto.</p>
        <div class="fields">
          ${field('App ID (Client ID)', input('ebayAppId', acc.ebay.appId, { cls: 'mono', attrs: 'autocomplete="off" spellcheck="false"' }))}
          ${field('Cert ID (Client Secret)', input('ebayCert', '', { type: 'password', placeholder: acc.ebay.hasCert ? '•••••• gespeichert' : '', attrs: 'autocomplete="off"' }))}
        </div>
        <div class="inline" style="margin-top:10px;align-items:center;gap:10px">
          <button class="btn" data-act="ebay-save">Speichern &amp; testen</button>
          <span data-status="ebay">${statusLine(acc.ebay.configured, acc.ebay.configured ? 'Eingerichtet' : 'Noch nicht eingerichtet')}</span>
        </div>
        <details class="howto"><summary>So bekommst du die Zugangsdaten</summary><ol>
          <li>Auf ${ext('https://developer.ebay.com/signin', 'developer.ebay.com')} kostenlos registrieren (Freischaltung dauert meist bis zu einem Werktag).</li>
          <li>Unter <b>Application Keys</b> ein Keyset für <b>Production</b> erzeugen.</li>
          <li><b>App ID (Client ID)</b> und <b>Cert ID (Client Secret)</b> kopieren und oben eintragen.</li>
          <li>Falls eBay nach „Marketplace Account Deletion“ fragt: „Ich speichere keine eBay-Nutzerdaten“ (Opt-out) wählen.</li>
        </ol></details>
      </fieldset>
      <fieldset class="fs" style="margin-bottom:0"><legend>Partner-Links (optional)</legend>
        <div class="fields">
          ${field('Amazon-Partner-Tag', input('amazonTag', s.amazonTag || '', { placeholder: 'z. B. meinname-21', cls: 'mono' }))}
          ${field('eBay-Partner-Kampagnen-ID', input('ebayCampaign', s.ebayCampaign || '', { placeholder: 'z. B. 5338…', cls: 'mono' }))}
        </div>
        <p class="muted" style="font-size:12px;margin:8px 0 0">Werden automatisch an die Preisvergleich-Links angehängt.</p>
      </fieldset>`,

    data: `
      <div class="inline" style="flex-wrap:wrap">
        <button class="btn" data-act="export">${icon('download')}Sicherung exportieren</button>
        <button class="btn" data-act="import">${icon('upload')}Importieren</button>
        <button class="btn ghost" data-act="folder">${icon('folder')}Datenordner</button>
      </div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Die Sicherung ist eine JSON-Datei inklusive Cover. Beim Import werden nur fehlende Einträge ergänzt. Zugangsdaten (IGDB, Konten, eBay) sind nicht enthalten.<br>
      Speicherort: <span style="user-select:text">${h(info.dataPath)}</span><br>Version ${h(info.version || '')}</p>`
  };

  openModal({
    title: 'Einstellungen',
    body: `<div class="tabs">${Object.entries(SETTINGS_TABS).map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${Object.entries(panes).map(([k, html]) => `<div class="tab-pane" data-pane="${k}" ${k === tab ? '' : 'hidden'}>${html}</div>`).join('')}`,
    footer: `<button class="btn primary" data-submit>Fertig</button>`,
    onMount(el) {
      for (const b of $$('[data-tab]', el)) {
        b.onclick = () => {
          for (const x of $$('[data-tab]', el)) x.classList.toggle('on', x === b);
          for (const p of $$('[data-pane]', el)) p.hidden = p.dataset.pane !== b.dataset.tab;
        };
      }
      for (const a of $$('[data-ext]', el)) a.onclick = (e) => { e.preventDefault(); window.api.openExternal(a.dataset.ext); };
      const example = el.querySelector('[data-example]');
      const upd = () => { example.textContent = (el.querySelector('[name="prefixGame"]').value.trim() || 'SP') + '-0001'; };
      el.addEventListener('input', upd);
      upd();

      // Allgemeine Werte sofort übernehmen
      el.addEventListener('change', () => {
        const f = readForm(el);
        s.prefixGame = (f.prefixGame || '').trim() || 'SP';
        s.prefixConsole = (f.prefixConsole || '').trim() || 'KO';
        s.prefixAccessory = (f.prefixAccessory || '').trim() || 'ZB';
        s.defaultInterval = Number(f.defaultInterval) || 0;
        s.amazonTag = (f.amazonTag || '').trim();
        s.ebayCampaign = (f.ebayCampaign || '').trim();
        Store.save();
      });

      const setStatus = (key, cls, html) => {
        const span = el.querySelector(`[data-status="${key}"]`);
        span.innerHTML = `<span class="${cls}" style="font-size:12px">${html}</span>`;
      };
      const busy = (key) => setStatus(key, 'muted', '<span class="spinner"></span>Verbinde …');
      const act = (name, fn) => { const b = el.querySelector(`[data-act="${name}"]`); if (b) b.onclick = fn; };

      act('igdb-save', async () => {
        const clientId = el.querySelector('[name="igdbClientId"]').value.trim();
        const secret = el.querySelector('[name="igdbSecret"]').value.trim();
        const cfg = { clientId };
        if (secret) cfg.clientSecret = secret;
        await window.api.igdbSetConfig(cfg);
        await Online.refresh();
        if (!Online.configured) return setStatus('igdb', 'bad', 'Client-ID und Client-Secret eintragen.');
        busy('igdb');
        try {
          await Online.call('igdbTest');
          setStatus('igdb', 'ok', '✓ Verbunden – Online-Daten sind aktiv.');
          el.querySelector('[name="igdbSecret"]').value = '';
          el.querySelector('[name="igdbSecret"]').placeholder = '•••••• gespeichert';
          App.onOnlineReady();
        } catch (err) { setStatus('igdb', 'bad', h(err.message)); }
      });

      act('psn-connect', async () => {
        busy('psn');
        try {
          const st = await Online.call('psnConnect', el.querySelector('[name="npsso"]').value);
          el.querySelector('[name="npsso"]').value = '';
          setStatus('psn', 'ok', `✓ Verbunden${st.onlineId ? ' als ' + h(st.onlineId) : ''}`);
          el.querySelector('[data-act="sync"]').disabled = false;
        } catch (err) { setStatus('psn', 'bad', h(err.message)); }
      });
      act('psn-disconnect', async () => { await window.api.psnDisconnect(); setStatus('psn', 'muted', 'Getrennt'); });
      act('xbox-connect', async () => {
        busy('xbox');
        try {
          const st = await Online.call('xboxConnect', el.querySelector('[name="xblKey"]').value);
          el.querySelector('[name="xblKey"]').value = '';
          setStatus('xbox', 'ok', `✓ Verbunden${st.gamertag ? ' als ' + h(st.gamertag) : ''}`);
          el.querySelector('[data-act="sync"]').disabled = false;
        } catch (err) { setStatus('xbox', 'bad', h(err.message)); }
      });
      act('xbox-disconnect', async () => { await window.api.xboxDisconnect(); setStatus('xbox', 'muted', 'Getrennt'); });
      act('sync', () => { closeModal('ok'); Accounts.openSync(); });

      act('ebay-save', async () => {
        const appId = el.querySelector('[name="ebayAppId"]').value.trim();
        const cert = el.querySelector('[name="ebayCert"]').value.trim();
        const cfg = { appId };
        if (cert) cfg.certId = cert;
        const st = await window.api.ebaySetConfig(cfg);
        if (!st.configured) return setStatus('ebay', 'bad', 'App ID und Cert ID eintragen.');
        busy('ebay');
        try {
          await Online.call('ebayTest');
          setStatus('ebay', 'ok', '✓ Verbunden – Werte können geschätzt werden.');
          el.querySelector('[name="ebayCert"]').value = '';
          el.querySelector('[name="ebayCert"]').placeholder = '•••••• gespeichert';
          Accounts.refresh();
        } catch (err) { setStatus('ebay', 'bad', h(err.message)); }
      });

      act('export', () => App.exportBackup());
      act('import', async () => { closeModal('ok'); await App.importBackup(); });
      act('folder', () => window.api.openDataFolder());
      el.querySelector('[data-submit]').onclick = () => { closeModal('ok'); Accounts.refresh().then(() => App.render()); };
    }
  });
}
