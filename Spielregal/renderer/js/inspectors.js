/* Detailansichten mit modularen Bereichen (verschieben, einklappen) */

const PANEL_DEFS = {
  game: [
    ['details', 'Details', 'info'],
    ['status', 'Spielstand', 'gamepad'],
    ['trophies', 'Trophäen & Erfolge', 'star'],
    ['checklist', 'Checkliste', 'check'],
    ['value', 'Wert & Preise', 'euro'],
    ['guides', 'Guides für 100 %', 'note'],
    ['notes', 'Notizen', 'note'],
    ['label', 'Inventar-Etikett', 'qr']
  ],
  console: [
    ['details', 'Details', 'info'],
    ['maintenance', 'Wartung', 'wrench'],
    ['value', 'Wert & Preise', 'euro'],
    ['notes', 'Notizen', 'note'],
    ['label', 'Inventar-Etikett', 'qr']
  ],
  accessory: [
    ['details', 'Details', 'info'],
    ['value', 'Wert & Preise', 'euro'],
    ['notes', 'Notizen', 'note'],
    ['label', 'Inventar-Etikett', 'qr']
  ]
};

const PanelSystem = {
  order(kind) {
    const defaults = PANEL_DEFS[kind].map((d) => d[0]);
    const saved = (Store.settings.panelOrder || {})[kind] || [];
    const order = saved.filter((id) => defaults.includes(id));
    for (const id of defaults) if (!order.includes(id)) order.push(id);
    return order;
  },
  isCollapsed(kind, id) {
    return !!(Store.settings.panelCollapsed || {})[kind + ':' + id];
  },
  setOrder(kind, order) {
    Store.settings.panelOrder = { ...(Store.settings.panelOrder || {}), [kind]: order };
    Store.save();
  },
  toggle(kind, id) {
    const c = { ...(Store.settings.panelCollapsed || {}) };
    c[kind + ':' + id] = !c[kind + ':' + id];
    Store.settings.panelCollapsed = c;
    Store.save();
  },
  reset() {
    Store.settings.panelOrder = {};
    Store.settings.panelCollapsed = {};
    Store.save();
  },

  /** renderers: { id: (item) => { body, extra? } | null } */
  render(kind, item, renderers) {
    const defs = Object.fromEntries(PANEL_DEFS[kind].map(([id, title, ic]) => [id, { title, ic }]));
    return this.order(kind).map((id) => {
      const r = renderers[id] && renderers[id](item);
      if (!r) return '';
      const d = defs[id];
      const collapsed = this.isCollapsed(kind, id);
      return `<section class="mpanel ${collapsed ? 'collapsed' : ''}" data-panel="${id}" data-panel-kind="${kind}">
        <header class="mpanel-head" draggable="true" title="Ziehen zum Verschieben">
          <span class="grip">${icon('grip')}</span>
          ${icon(r.icon || d.ic)}<span class="mpanel-title">${h(r.title || d.title)}</span>
          ${r.extra ? `<span class="mpanel-extra">${r.extra}</span>` : ''}
          <button class="icon-btn chev" data-action="panel-toggle" data-panel-id="${id}" title="${collapsed ? 'Ausklappen' : 'Einklappen'}">${icon('chevron')}</button>
        </header>
        ${collapsed ? '' : `<div class="mpanel-body">${r.body}</div>`}
      </section>`;
    }).join('');
  }
};

const factList = (facts) => `<dl class="facts">${facts.map(([l, v]) => `<dt>${h(l)}</dt><dd>${h(v)}</dd>`).join('')}</dl>`;

// ---------- Bausteine ----------

const Blocks = {
  value(x, kind) {
    const physical = !(kind === 'game' && x.format === 'digital');
    const diff = x.value != null && x.price != null ? x.value - x.price : null;
    return {
      body: `${physical ? `<div class="value-row">
          <div><small>Aktueller Wert</small>
            <label class="pct-box value-box"><input type="text" inputmode="decimal" value="${x.value != null ? fmt.inputNumber(Number(x.value).toFixed(2)) : ''}" placeholder="—" data-quick="value" aria-label="Aktueller Wert"><span>€</span></label></div>
          <div><small>Kaufpreis</small><b>${x.price != null ? fmt.euro(x.price) : '—'}</b></div>
          ${diff != null ? `<div><small>Differenz</small><b class="${diff >= 0 ? 'ok' : 'bad'}">${diff >= 0 ? '+' : ''}${fmt.euro(diff)}</b></div>` : ''}
        </div>
        ${x.valueNote ? `<div class="value-note">${h(x.valueNote)}${x.valueDate ? ' · ' + fmt.date(x.valueDate) : ''}</div>` : ''}
        <button class="btn small" data-action="value-estimate" style="margin:10px 0 12px">${icon('search')}Wert über eBay schätzen</button>`
        : '<p class="muted" style="margin:0 0 10px;font-size:12px">Digitale Spiele zählen nicht zum Sammlungswert.</p>'}
        <div class="sub-label">Preisvergleich</div>
        ${linkChips(priceLinks(itemQuery(x, kind)))}`
    };
  },

  notes(x) {
    return x.notes ? { body: `<div class="notes">${h(x.notes)}</div>` } : null;
  },

  label(x, kind) {
    if (kind === 'game' && x.format === 'digital') return null;
    const label = labelFor(x, kind);
    return {
      body: `<div class="label-preview">${labelMarkup(label)}</div>
        <div class="inline">
          <button class="btn small" data-action="label-print" ${label.inventory ? '' : 'disabled'}>${icon('printer')}Drucken</button>
          <button class="btn small" data-action="label-pdf" ${label.inventory ? '' : 'disabled'}>${icon('download')}PDF</button>
        </div>`
    };
  }
};

// ---------- Spiel ----------

const GameBlocks = {
  details(g) { return { body: factList(Game.facts(g)) }; },

  status(g) {
    const s = STATUS[g.status] || STATUS.backlog;
    return {
      body: `<select class="select" style="width:100%" data-quick="status">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${g.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <div class="range-row">${g.progressAuto
          ? `<div class="auto-note">${icon('check')}${fmt.percent(g.progress)} – berechnet aus der Checkliste</div>`
          : pctMarkup(g.progress, { quick: true, color: s.color })}</div>`
    };
  },

  trophies(g) {
    const t = g.trophies;
    if (!t) {
      const link = trophyLinkSelect(g);
      return link ? { title: 'Trophäen verknüpfen', icon: 'link', body: link } : null;
    }
    if (t.source === 'xbox') {
      return {
        title: 'Xbox-Erfolge',
        body: `<div class="tro-head"><b>${Math.round(t.progress)} %</b><span class="muted">${t.earned.achievements}/${t.defined.achievements} Erfolge · ${t.earned.gamerscore}/${t.defined.gamerscore} G</span></div>
          <div class="prog" style="--c:#2f9e55;margin:6px 0 0"><div class="bar"><i style="width:${t.progress}%"></i></div></div>`
      };
    }
    const types = ['platinum', 'gold', 'silver', 'bronze'];
    return {
      title: 'PlayStation-Trophäen',
      extra: t.earned.platinum ? '<span class="badge" style="--c:#3a8fd0">Platin</span>' : '',
      body: `<div class="tro-head"><b>${Math.round(t.progress)} %</b></div>
        <div class="prog" style="--c:var(--accent);margin:6px 0 10px"><div class="bar"><i style="width:${t.progress}%"></i></div></div>
        <div class="tro-grid">${types.filter((k) => t.defined[k]).map((k) => `<div><span class="tdot" style="background:${TROPHY_COLORS[k]}"></span>${TROPHY_LABEL[k]}<b>${t.earned[k]}/${t.defined[k]}</b></div>`).join('')}</div>`
    };
  },

  checklist(g) {
    const list = g.checklist || [];
    const done = list.filter((c) => c.done).length;
    const groups = new Map();
    for (const c of list) {
      const k = c.group || '';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    const open = App.state.checkOpen || {};
    const rows = [...groups.entries()].map(([name, items]) => {
      const d = items.filter((c) => c.done).length;
      const collapsed = name && items.length > 8 && !open[name];
      const shown = collapsed ? items.filter((c) => !c.done).slice(0, 6) : items;
      return `${name ? `<div class="ck-group"><span>${h(name)}</span><span class="muted">${d}/${items.length}</span></div>` : ''}
        ${shown.map((c) => `<div class="ck-row ${c.done ? 'done' : ''}" title="${h(c.detail || '')}">
          <button class="ck" data-action="check-toggle" data-check="${h(c.id)}" aria-label="Erledigt">${c.done ? icon('check') : ''}</button>
          ${c.kind && TROPHY_COLORS[c.kind] ? `<span class="tdot" style="background:${TROPHY_COLORS[c.kind]}" title="${TROPHY_LABEL[c.kind]}"></span>` : ''}
          <span class="ck-text">${h(c.text)}${c.detail ? `<small>${h(c.detail)}</small>` : ''}</span>
          <button class="icon-btn ck-del" data-action="check-del" data-check="${h(c.id)}" title="Entfernen">${icon('close')}</button>
        </div>`).join('')}
        ${collapsed ? `<button class="btn ghost small" data-action="check-expand" data-group="${h(name)}">Alle ${items.length} anzeigen (${items.length - d} offen)</button>` : ''}`;
    }).join('');
    return {
      extra: list.length ? `<span class="muted">${done}/${list.length}</span>` : '',
      body: `${list.length ? `<div class="ck-list">${rows}</div>` : '<p class="muted" style="margin:0 0 8px;font-size:12px">Eigene Ziele für 100 % abhaken, eine Liste von einer Guide-/Wiki-Seite importieren oder Trophäen übernehmen.</p>'}
        <div class="ck-add"><input class="input" data-check-new placeholder="Neuer Punkt … (Enter)"></div>
        <div class="inline" style="margin-top:8px;flex-wrap:wrap">
          <button class="btn small" data-action="check-import">${icon('download')}Von Webseite</button>
          <button class="btn small" data-action="check-template">${icon('list')}Vorlage</button>
          ${g.trophies ? `<button class="btn small" data-action="trophies-import">${icon('star')}${g.trophies.source === 'xbox' ? 'Erfolge' : 'Trophäen'}</button>` : ''}
          ${list.length ? `<button class="btn ghost small" data-action="check-clear" title="Alle Punkte entfernen">${icon('trash')}</button>` : ''}
        </div>
        ${list.length ? `<label class="toggle" style="margin-top:10px"><input type="checkbox" data-action-change="check-auto" ${g.progressAuto ? 'checked' : ''}><span>Fortschritt aus Checkliste berechnen</span></label>` : ''}`
    };
  },

  value(g) { return Blocks.value(g, 'game'); },
  guides(g) { return { body: linkChips(guideLinks(g)) }; },
  notes(g) { return Blocks.notes(g); },
  label(g) { return Blocks.label(g, 'game'); }
};

function trophyLinkSelect(g) {
  const fam = /playstation|^ps/i.test(g.platform || '') ? 'psn' : /xbox/i.test(g.platform || '') ? 'xbox' : null;
  const titles = fam && (Store.data.sync[fam + 'Titles'] || []);
  if (!titles || !titles.length) return '';
  const used = new Set(Store.games.filter((x) => x.trophies).map((x) => x.trophies.titleId));
  const free = titles.filter((t) => !used.has(t.id)).sort((a, b) => compareText(a.name, b.name));
  if (!free.length) return '';
  return `<p class="muted" style="margin:0 0 8px;font-size:12px">Kein passender Titel automatisch gefunden. Wähle ihn aus deinem ${fam === 'psn' ? 'PlayStation' : 'Xbox'}-Konto:</p>
    <select class="select" style="width:100%" data-action-change="trophies-link" data-source="${fam}">
      <option value="">Titel auswählen …</option>
      ${free.map((t) => `<option value="${h(t.id)}">${h(t.name)}${t.platforms.length ? ' (' + h(t.platforms.map(shortPlatform).join(', ')) + ')' : ''}</option>`).join('')}
    </select>`;
}

// ---------- Konsole ----------

const ConsoleBlocks = {
  details(c) {
    return { body: factList(Consoles.facts(c)) + (c.summary ? `<p class="summary">${h(c.summary)}</p>` : '') };
  },
  maintenance(c) {
    const due = Consoles.isDue(c);
    const last = Consoles.lastMaintenance(c);
    const logs = [...(c.maintenance || [])].sort((a, b) => b.date.localeCompare(a.date));
    return {
      body: `<div class="state ${due ? 'warn' : 'ok'}">${icon(due ? 'alert' : 'seal')}
          <div><b style="color:var(--text)">${h(Consoles.statusText(c))}</b>${last ? `<small>Zuletzt am ${fmt.date(last)}</small>` : ''}</div></div>
        <button class="btn small" style="margin-top:10px" data-action="add-maintenance">${icon('plus')}Wartung eintragen</button>
        ${logs.length ? `<div class="timeline">${logs.map((m) => `
          <div class="tl" data-maint="${m.id}">
            <div class="dot"></div>
            <div><div class="d">${fmt.date(m.date)}</div>
              ${m.kinds.length ? `<div class="pills">${m.kinds.map((k) => `<span class="pill" style="--c:var(--accent)">${h(MAINTENANCE[k]?.short || k)}</span>`).join('')}</div>` : ''}
              ${m.notes ? `<div class="n">${h(m.notes)}</div>` : ''}</div>
            <div class="acts"><button class="icon-btn" data-action="edit-maintenance" title="Bearbeiten">${icon('edit')}</button></div>
          </div>`).join('')}</div>` : ''}`
    };
  },
  value(c) { return Blocks.value(c, 'console'); },
  notes(c) { return Blocks.notes(c); },
  label(c) { return Blocks.label(c, 'console'); }
};

// ---------- Zubehör ----------

const AccessoryBlocks = {
  details(a) { return { body: factList(Accessories.facts(a)) }; },
  value(a) { return Blocks.value(a, 'accessory'); },
  notes(a) { return Blocks.notes(a); },
  label(a) { return Blocks.label(a, 'accessory'); }
};

// ---------- Inspektoren ----------

const actionsBar = (extra = '') => `<div class="insp-foot">${extra}
  <div class="insp-actions"><button class="btn" data-action="edit">${icon('edit')}Bearbeiten</button><button class="btn danger" data-action="delete" style="flex:none" title="Löschen">${icon('trash')}</button></div></div>`;

Views.gameInspector = function (g) {
  return `<div class="insp">
    <div class="cover hero">${coverInner(g.cover, g.title, g.platform)}</div>
    <div>
      <h2>${h(g.title)}</h2>
      ${Game.subtitle(g) ? `<div class="subline">${h(Game.subtitle(g))}</div>` : ''}
      <div class="badges" style="margin-top:9px">${gameBadges(g)}${g.format !== 'digital' ? conditionPill(g.condition) : ''}</div>
    </div>
    ${PanelSystem.render('game', g, GameBlocks)}
    ${actionsBar(`<button class="btn" data-action="online-fill" title="Fehlende Infos und Cover von IGDB holen">${icon('search')}Infos online ergänzen</button>`)}
  </div>`;
};

Views.consoleInspector = function (c) {
  return `<div class="insp">
    <div class="cover hero landscape">${coverInner(c.cover, c.name, manufacturerFor(c.platform || c.name))}</div>
    <div><h2>${h(c.name)}</h2>${Consoles.subtitle(c) ? `<div class="subline">${h(Consoles.subtitle(c))}</div>` : ''}
      <div class="badges" style="margin-top:9px">${conditionPill(c.condition)}</div></div>
    ${PanelSystem.render('console', c, ConsoleBlocks)}
    ${actionsBar()}
  </div>`;
};

Views.accessoryInspector = function (a) {
  return `<div class="insp">
    <div class="cover hero square">${coverInner(a.cover, a.name, ACCESSORY_TYPES[a.type]?.label || '')}</div>
    <div><h2>${h(a.name)}</h2><div class="subline">${h(Accessories.subtitle(a))}</div>
      <div class="badges" style="margin-top:9px">${conditionPill(a.condition)}</div></div>
    ${PanelSystem.render('accessory', a, AccessoryBlocks)}
    ${actionsBar()}
  </div>`;
};

// ---------- Ziehen & Ablegen ----------

(function enablePanelDrag() {
  let dragId = null, dragKind = null;
  const clearMarks = () => $$('.mpanel.drop-before, .mpanel.drop-after, .mpanel.dragging').forEach((p) => p.classList.remove('drop-before', 'drop-after', 'dragging'));

  document.addEventListener('dragstart', (e) => {
    const head = e.target.closest && e.target.closest('.mpanel-head');
    if (!head) return;
    const p = head.closest('.mpanel');
    dragId = p.dataset.panel;
    dragKind = p.dataset.panelKind;
    p.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (_) { /* egal */ }
  });
  document.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const p = e.target.closest && e.target.closest('.mpanel');
    if (!p || p.dataset.panelKind !== dragKind) return;
    e.preventDefault();
    const r = p.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    $$('.mpanel.drop-before, .mpanel.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
    if (p.dataset.panel !== dragId) p.classList.add(after ? 'drop-after' : 'drop-before');
  });
  document.addEventListener('drop', (e) => {
    if (!dragId) return;
    const p = e.target.closest && e.target.closest('.mpanel');
    if (p && p.dataset.panelKind === dragKind && p.dataset.panel !== dragId) {
      e.preventDefault();
      const after = p.classList.contains('drop-after');
      const order = PanelSystem.order(dragKind).filter((id) => id !== dragId);
      const idx = order.indexOf(p.dataset.panel) + (after ? 1 : 0);
      order.splice(idx, 0, dragId);
      PanelSystem.setOrder(dragKind, order);
    }
    dragId = null;
    clearMarks();
    App.renderInspector();
  });
  document.addEventListener('dragend', () => { dragId = null; clearMarks(); });
})();

// ---------- Checkliste aus Webseite ----------

const ChecklistImport = {
  /** Erkennt Überschriften, Listen und Tabellen einer Guide-/Wiki-Seite */
  parse(html, fallbackTitle = '') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript,nav,footer,header,aside,form,iframe,svg,button,select,'
      + '.toc,#toc,.navbox,.reference,.references,.reflist,.mw-editsection,.sidebar,.comments,#comments,.comment,'
      + '.share,.sharedaddy,.related,.breadcrumbs,.breadcrumb,.ad,.ads,.advertisement,.menu,.wp-block-buttons,[role="navigation"]').forEach((n) => n.remove());
    const root = doc.querySelector('.mw-parser-output, .entry-content, .post-content, .article-content, article, main, #content, #mw-content-text') || doc.body;
    if (!root) return [];
    const clean = (t) => String(t || '').replace(/\[\d+\]|\[edit\]|\[Bearbeiten[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim();
    const skipGroup = /^(navigation|inhalt|contents|siehe auch|see also|references|einzelnachweise|quellen|sources|external links|weblinks|comments?|kommentare|related|share|teilen|trivia|gallery|galerie|navigation menu|footnotes)$/i;

    const groups = [];
    let h2 = '';
    let cur = { title: clean(doc.title) || fallbackTitle || 'Allgemein', items: [], seen: new Set() };
    groups.push(cur);
    for (const el of root.querySelectorAll('h2,h3,h4,li,tr')) {
      const tag = el.tagName;
      if (tag === 'H2' || tag === 'H3' || tag === 'H4') {
        const t = clean(el.textContent);
        if (!t) continue;
        if (tag === 'H2') h2 = t;
        cur = { title: tag === 'H2' || !h2 ? t : `${h2} › ${t}`, items: [], seen: new Set(), skip: skipGroup.test(t) };
        groups.push(cur);
        continue;
      }
      if (cur.skip) continue;
      let text = '';
      if (tag === 'LI') {
        if (el.closest('table')) continue;
        const copy = el.cloneNode(true);
        copy.querySelectorAll('ul,ol').forEach((n) => n.remove());
        text = clean(copy.textContent);
      } else {
        const cells = [...el.children].filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
        if (!cells.length || cells.every((c) => c.tagName === 'TH')) continue;
        text = cells.slice(0, 3).map((c) => clean(c.textContent)).filter(Boolean).join(' – ');
      }
      if (text.length < 2) continue;
      if (text.length > 200) text = text.slice(0, 197).replace(/\s+\S*$/, '') + ' …';
      const key = text.toLowerCase();
      if (cur.seen.has(key)) continue;
      cur.seen.add(key);
      cur.items.push(text);
    }
    return groups.filter((g) => !g.skip && g.items.length).slice(0, 80)
      .map((g) => ({ title: g.title, items: g.items.slice(0, 500) }));
  },

  /** Text: eine Zeile pro Punkt; „# Titel“ oder „Titel:“ startet eine Gruppe */
  parseText(text) {
    const groups = [];
    let cur = { title: 'Allgemein', items: [] };
    groups.push(cur);
    for (let line of String(text || '').split(/\r?\n/)) {
      line = line.replace(/^\s*([-*•]|\d+[.)]|\[\s?[xX ]?\s?\])\s*/, '').trim();
      if (!line) continue;
      const m = /^#+\s*(.+)$/.exec(line) || /^(.{2,60}):$/.exec(line);
      if (m) { cur = { title: m[1].trim(), items: [] }; groups.push(cur); continue; }
      cur.items.push(line.slice(0, 200));
    }
    return groups.filter((g) => g.items.length);
  },

  open(g) {
    const t = g.title;
    const sources = [
      ['Google: 100 %-Liste', `https://www.google.com/search?q=${encodeURIComponent(t + ' 100% checklist')}`],
      ['Fandom-Wiki', `https://www.google.com/search?q=${encodeURIComponent(t + ' site:fandom.com collectibles')}`],
      ['PowerPyx', `https://www.powerpyx.com/?s=${encodeURIComponent(t)}`],
      ['Sammelobjekte (DE)', `https://www.google.com/search?q=${encodeURIComponent(t + ' alle Sammelobjekte Liste')}`]
    ];
    let groups = [];
    openModal({
      title: 'Checkliste importieren',
      subtitle: t,
      body: `
        <div class="tabs"><button class="on" data-imp-tab="web">Von Webseite</button><button data-imp-tab="text">Aus Text</button></div>
        <div data-imp-pane="web">
          <p class="muted small" style="margin:0 0 8px">Link zu einer Guide- oder Wiki-Seite einfügen (z. B. eine Liste aller Sternenmünzen oder Sammelobjekte). Überschriften werden zu Gruppen, Listen und Tabellenzeilen zu Punkten.</p>
          <div class="inline"><input class="input" data-imp-url placeholder="https://…" spellcheck="false"><button class="btn primary" data-imp-load>Laden</button></div>
          <div class="sub-label" style="margin-top:12px">Passende Seite suchen</div>
          ${linkChips(sources)}
        </div>
        <div data-imp-pane="text" hidden>
          <p class="muted small" style="margin:0 0 8px">Eine Zeile pro Punkt. Zeilen wie „# Welt 1“ oder „Welt 1:“ starten eine neue Gruppe.</p>
          <div class="field"><textarea data-imp-text rows="8" placeholder="# Welt 1&#10;1-1 Sternenmünze 1&#10;1-1 Sternenmünze 2&#10;# Welt 2&#10;…"></textarea></div>
          <button class="btn" data-imp-parse style="margin-top:8px">Vorschau</button>
        </div>
        <div data-imp-status class="small" style="margin-top:12px"></div>
        <div data-imp-preview></div>`,
      footer: `<button class="btn" data-modal="cancel">Abbrechen</button><button class="btn primary" data-submit disabled>Übernehmen</button>`,
      onMount(el) {
        const status = el.querySelector('[data-imp-status]');
        const preview = el.querySelector('[data-imp-preview]');
        const submit = el.querySelector('[data-submit]');
        for (const b of $$('[data-imp-tab]', el)) {
          b.onclick = () => {
            for (const x of $$('[data-imp-tab]', el)) x.classList.toggle('on', x === b);
            for (const p of $$('[data-imp-pane]', el)) p.hidden = p.dataset.impPane !== b.dataset.impTab;
          };
        }
        for (const c of $$('[data-action="open-ext"]', el)) c.onclick = () => window.api.openExternal(c.dataset.url);
        const count = () => {
          let n = 0;
          for (const cb of $$('[data-imp-item]:checked', el)) n++;
          submit.disabled = !n;
          submit.textContent = n ? `${n} Punkte übernehmen` : 'Übernehmen';
        };
        const show = () => {
          if (!groups.length) {
            preview.innerHTML = '';
            status.innerHTML = '<span class="bad">Keine Listen erkannt. Versuche eine andere Seite oder füge den Text unter „Aus Text“ ein.</span>';
            return count();
          }
          const total = groups.reduce((s, x) => s + x.items.length, 0);
          status.innerHTML = `<span class="ok">✓ ${groups.length} Abschnitte mit ${total} Punkten erkannt.</span> Wähle aus, was übernommen werden soll.`;
          preview.innerHTML = `<div class="imp-list">${groups.map((gr, gi) => `
            <details class="imp-group">
              <summary><input type="checkbox" data-imp-group="${gi}" checked><b>${h(gr.title)}</b><span class="muted">${gr.items.length}</span></summary>
              <div class="imp-items">${gr.items.map((it, ii) => `<label><input type="checkbox" data-imp-item="${gi}:${ii}" checked>${h(it)}</label>`).join('')}</div>
            </details>`).join('')}</div>`;
          for (const cb of $$('[data-imp-group]', preview)) {
            cb.onclick = (e) => e.stopPropagation();
            cb.onchange = () => { for (const it of $$(`[data-imp-item^="${cb.dataset.impGroup}:"]`, preview)) it.checked = cb.checked; count(); };
          }
          preview.onchange = (e) => { if (e.target.matches('[data-imp-item]')) count(); };
          count();
        };
        el.querySelector('[data-imp-load]').onclick = async () => {
          const url = el.querySelector('[data-imp-url]').value.trim();
          if (!/^https?:\/\//i.test(url)) { status.innerHTML = '<span class="bad">Bitte einen vollständigen Link (https://…) einfügen.</span>'; return; }
          status.innerHTML = '<span class="spinner"></span>Seite wird geladen …';
          preview.innerHTML = '';
          try {
            const r = await Online.call('webFetch', url);
            groups = ChecklistImport.parse(r.html, t);
            show();
          } catch (err) {
            status.innerHTML = `<span class="bad">${h(err.message)}</span>`;
          }
        };
        el.querySelector('[data-imp-url]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-imp-load]').click(); } });
        el.querySelector('[data-imp-parse]').onclick = () => { groups = ChecklistImport.parseText(el.querySelector('[data-imp-text]').value); show(); };
        el.querySelector('[data-modal="cancel"]').onclick = () => closeModal('cancel');
        submit.onclick = () => {
          g.checklist = g.checklist || [];
          const have = new Set(g.checklist.map((c) => (c.group || '') + '|' + c.text));
          let n = 0;
          for (const cb of $$('[data-imp-item]:checked', el)) {
            const [gi, ii] = cb.dataset.impItem.split(':').map(Number);
            const group = groups[gi].title, text = groups[gi].items[ii];
            if (have.has(group + '|' + text)) continue;
            g.checklist.push({ id: uid(), text, done: false, group });
            n++;
          }
          recomputeChecklistProgress(g);
          g.updatedAt = new Date().toISOString();
          Store.save();
          closeModal('ok');
          App.render();
          toast(`${n} Punkte zur Checkliste hinzugefügt`);
        };
      }
    });
  }
};
