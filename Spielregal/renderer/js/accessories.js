/* Zubehör & Sammlerstücke */

Views.filteredAccessories = function (state) {
  const q = state.search.trim().toLowerCase();
  let list = Store.accessories;
  const f = state.accFilter || '';
  if (f === 'hardware' || f === 'collectible') list = list.filter((a) => ACCESSORY_TYPES[a.type]?.group === f);
  else if (f) list = list.filter((a) => a.type === f);
  if (q) list = list.filter((a) => Accessories.matches(a, q));
  return [...list].sort((a, b) => compareText(ACCESSORY_TYPES[a.type]?.label || '', ACCESSORY_TYPES[b.type]?.label || '') || compareText(a.name, b.name));
};

Views.accessories = function (state) {
  if (!Store.accessories.length) {
    return emptyState('headphones', 'Noch kein Zubehör',
      'Controller, Headsets, amiibo, Figuren, Steelbooks, Artbooks, Soundtracks … alles, was zur Sammlung gehört, aber kein Spiel und keine Konsole ist.',
      `<button class="btn primary" data-action="new">${icon('plus')}Eintrag hinzufügen</button>`);
  }
  const list = this.filteredAccessories(state);
  if (!list.length) return emptyState('search', 'Keine Treffer', 'Passe Suche oder Filter an.');
  const groups = [['hardware', 'Zubehör'], ['collectible', 'Sammlerstücke']]
    .map(([k, l]) => ({ title: l, items: list.filter((a) => (ACCESSORY_TYPES[a.type]?.group || 'collectible') === k) }))
    .filter((g) => g.items.length);
  return `<div class="pad">${groups.map((gr) => `<div class="group">
    <div class="group-head"><h2>${gr.title}</h2><span class="n">${gr.items.length}</span></div>
    <div class="grid">${gr.items.map((a) => `
      <div class="card ${state.selected.accessory === a.id ? 'sel' : ''}" data-item="accessory" data-id="${a.id}">
        <div class="cover square">${coverInner(a.cover, a.name, ACCESSORY_TYPES[a.type]?.label || '')}</div>
        <div class="meta">
          <div style="display:flex;gap:6px;align-items:center"><div class="t" style="flex:1">${h(a.name)}</div>${conditionPill(a.condition)}</div>
          <div class="s">${h(Accessories.subtitle(a))}</div>
          ${a.value != null || a.price != null ? `<div class="s" style="margin-top:4px">${fmt.euro(itemValue(a))}</div>` : ''}
        </div>
      </div>`).join('')}</div></div>`).join('')}</div>`;
};

Views.accessoryInspector = function (a) {
  return `<div class="insp">
    <div class="cover hero square">${coverInner(a.cover, a.name, ACCESSORY_TYPES[a.type]?.label || '')}</div>
    <div><h2>${h(a.name)}</h2><div class="subline">${h(Accessories.subtitle(a))}</div>
      <div class="pills" style="margin-top:9px">${conditionPill(a.condition)}</div></div>
    <div class="panel"><h3>${icon('info')}Details</h3>
      <dl class="facts">${Accessories.facts(a).map(([l, v]) => `<dt>${h(l)}</dt><dd>${h(v)}</dd>`).join('')}</dl></div>
    ${Panels.value(a, 'accessory')}
    ${a.notes ? `<div class="panel"><h3>${icon('note')}Notizen</h3><div class="notes">${h(a.notes)}</div></div>` : ''}
    ${this.labelPanel(labelFor(a, 'accessory'))}
    <div class="insp-actions"><button class="btn" data-action="edit">${icon('edit')}Bearbeiten</button><button class="btn danger" data-action="delete" style="flex:none" title="Löschen">${icon('trash')}</button></div>
  </div>`;
};

function openAccessoryEditor(existing, defaults = {}) {
  const isNew = !existing;
  const a = existing ? { ...existing } : newAccessory({ inventory: Store.nextInventory('accessory'), ...defaults });
  let root;
  const val = (n) => root?.querySelector(`[name="${n}"]`)?.value ?? '';
  const cover = createCoverState(a.cover, () => val('name') || a.name, () => ACCESSORY_TYPES[val('type') || a.type]?.label || '');
  const typeOptions = Object.fromEntries([
    ...Object.entries(ACCESSORY_TYPES).filter(([, t]) => t.group === 'hardware'),
    ...Object.entries(ACCESSORY_TYPES).filter(([, t]) => t.group === 'collectible')
  ].map(([k, t]) => [k, (t.group === 'hardware' ? 'Zubehör · ' : 'Sammlerstück · ') + t.label]));
  const games = { '': '— keins —', ...Object.fromEntries([...Store.games].sort((x, y) => compareText(x.title, y.title)).map((g) => [g.id, g.title + (g.platform ? ` (${shortPlatform(g.platform)})` : '')])) };

  const body = `
    ${coverFieldMarkup(cover)}
    <fieldset class="fs"><legend>Allgemein</legend><div class="fields">
      ${field('Bezeichnung', input('name', a.name, { placeholder: 'z. B. DualSense Edge, amiibo Link, Steelbook Elden Ring', attrs: 'autofocus' }), { full: true })}
      ${field('Art', select('type', typeOptions, a.type))}
      ${field('Plattform', input('platform', a.platform, { placeholder: 'optional', attrs: 'list="platform-list"' }))}
      ${field('Hersteller', input('manufacturer', a.manufacturer, { placeholder: 'z. B. Sony, Nintendo, First 4 Figures' }))}
      ${field('Edition / Farbe', input('edition', a.edition, { placeholder: 'z. B. Midnight Black, Limited' }))}
      ${field('Gehört zu Spiel', select('linkedGame', games, a.linkedGame), { full: true })}
    </div></fieldset>
    <fieldset class="fs"><legend>Sammlung</legend><div class="fields">
      ${field('Zustand', select('condition', CONDITION_SELECT, a.condition))}
      <div class="field"><span>Inventar-Nr.</span>${inventoryControl('accessory', a.inventory, a.id)}</div>
      ${field('Kaufpreis (€)', input('price', fmt.inputNumber(a.price), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      ${field('Aktueller Wert (€)', input('value', fmt.inputNumber(a.value), { placeholder: 'optional', attrs: 'inputmode="decimal"' }))}
      ${field('Kaufdatum', input('purchaseDate', a.purchaseDate, { type: 'date' }))}
    </div></fieldset>
    <fieldset class="fs" style="margin-bottom:0"><legend>Notizen</legend>
      <div class="field"><textarea name="notes" rows="3">${h(a.notes)}</textarea></div>
    </fieldset>
    ${platformDatalist()}`;

  let saved = false;
  openModal({
    title: isNew ? 'Neues Zubehör / Sammlerstück' : 'Eintrag bearbeiten',
    subtitle: isNew ? '' : a.inventory,
    body,
    footer: `${isNew ? '' : `<button class="btn danger left" data-delete>${icon('trash')}Löschen</button>`}
             <button class="btn" data-modal="cancel">Abbrechen</button>
             <button class="btn primary" data-submit>Sichern</button>`,
    onMount(el) {
      root = el;
      const coverField = mountCoverField(el, cover);
      const submit = el.querySelector('[data-submit]');
      let inventoryOk = () => true;
      const validate = () => { submit.disabled = !val('name').trim() || !inventoryOk(); };
      inventoryOk = mountInventory(el, 'accessory', a.id, validate);
      el.querySelector('[name="name"]').addEventListener('input', () => { validate(); if (!cover.cover) coverField.refresh(); });
      el.querySelector('[name="type"]').addEventListener('change', () => { if (!cover.cover) coverField.refresh(); });
      validate();
      el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
      const del = el.querySelector('[data-delete]');
      if (del) del.onclick = async () => { closeModal('cancel'); await deleteItem('accessories', existing); };
      submit.onclick = () => {
        if (submit.disabled) return;
        const f = readForm(el);
        const value = parseNumber(f.value);
        Object.assign(a, {
          name: f.name.trim(), type: f.type, platform: f.platform.trim(), manufacturer: f.manufacturer.trim(),
          edition: f.edition.trim(), linkedGame: f.linkedGame, condition: f.condition,
          inventory: f.inventory.trim() || Store.nextInventory('accessory'),
          price: parseNumber(f.price), purchaseDate: f.purchaseDate, notes: f.notes, cover: cover.cover
        });
        if (value !== a.value) { a.value = value; a.valueDate = value != null ? isoDate(today()) : ''; a.valueNote = value != null ? 'Manuell eingetragen' : ''; }
        saved = true;
        Store.upsert('accessories', a);
        cover.commit();
        closeModal('ok');
        App.select('accessory', a.id);
        toast(isNew ? `„${a.name}“ hinzugefügt` : 'Gespeichert');
      };
    },
    onClose() { if (!saved) cover.discard(); }
  });
}
