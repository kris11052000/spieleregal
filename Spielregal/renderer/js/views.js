/* Ansichten (reines HTML-Rendering) */

function coverInner(cover, title, subtitle) {
  if (cover) return `<img src="${h(window.api.coverUrl(cover))}" alt="" draggable="false">`;
  const hue = hueFor(title);
  return `<div class="ph" style="background:linear-gradient(150deg,hsl(${hue} 30% 42%),hsl(${hue} 40% 20%))">
    ${subtitle ? `<small>${h(subtitle)}</small>` : ''}<b>${h(title || 'Ohne Titel')}</b></div>`;
}

function uskBadge(usk) {
  return usk ? `<span class="usk usk-${h(usk)}" title="USK ${h(usk)}">${h(usk)}</span>` : '';
}

function conditionPill(key) {
  const c = CONDITION[key];
  return c ? `<span class="pill" style="--c:${c.color}">${c.short}</span>` : '';
}

/** Kleine Abzeichen unter dem Titel (statt über dem Cover) */
function gameBadges(g) {
  const out = [];
  if (g.usk) out.push(`<span class="usk sm usk-${h(g.usk)}" title="USK ${h(g.usk)}">${h(g.usk)}</span>`);
  if (g.format === 'digital') out.push(`<span class="badge" style="--c:#3b82f6" title="${h(g.store || 'Digital')}">${icon('download')}Digital</span>`);
  if (g.edition && g.edition !== 'standard') out.push(`<span class="badge" style="--c:var(--accent)">${h(EDITION[g.edition].label)}</span>`);
  if (g.trophies && g.trophies.earned && g.trophies.earned.platinum) out.push(`<span class="badge" style="--c:#3a8fd0" title="Platin erreicht">${icon('star')}Platin</span>`);
  return out.join('');
}

function progressBar(g) {
  const s = STATUS[g.status] || STATUS.backlog;
  return `<div class="prog" style="--c:${s.color}" title="${h(s.label)}">${icon(s.icon)}
    <div class="bar"><i style="width:${Math.max(0, Math.min(100, g.progress || 0))}%"></i></div>
    <span class="pc">${fmt.percent(g.progress)}</span></div>`;
}

function emptyState(iconName, title, text, actions = '') {
  return `<div class="empty"><div>${icon(iconName)}<h2>${h(title)}</h2><p>${h(text)}</p><div class="acts">${actions}</div></div></div>`;
}

const Views = {

  // ---------- Seitenleiste ----------

  sidebar(state) {
    const games = Store.games;
    const due = Store.consoles.filter((c) => Consoles.isDue(c)).length;
    const platforms = new Map();
    for (const g of games) if (g.platform) platforms.set(g.platform, (platforms.get(g.platform) || 0) + 1);
    const plist = [...platforms.entries()].sort((a, b) => compareText(a[0], b[0]));
    const nav = (view, label, ic, count = '', extra = '') =>
      `<button class="nav ${state.view === view && !state.platform ? 'active' : ''}" data-nav="${view}">${icon(ic)}<span class="label">${label}</span><span class="count ${extra}">${count}</span></button>`;

    return `
      <div class="brand"><div class="brand-mark"><span style="height:10px"></span><span style="height:12px;background:#a3a8ff"></span><span style="height:8px;background:#f0aa5a;transform:rotate(-12deg);transform-origin:bottom left"></span></div>Spielregal</div>
      ${nav('overview', 'Übersicht', 'overview')}
      ${nav('library', 'Bibliothek', 'library', games.length || '')}
      ${nav('consoles', 'Konsolen', 'gamepad', due ? `${due} fällig` : (Store.consoles.length || ''), due ? 'warn' : '')}
      ${nav('accessories', 'Zubehör & Extras', 'headphones', Store.accessories.length || '')}
      ${nav('wishlist', 'Wunschliste', 'star', Store.wishlist.length || '')}
      ${nav('calendar', 'Release-Kalender', 'calendar')}
      ${nav('labels', 'Etiketten', 'qr')}
      ${plist.length ? `<div class="side-section"><div class="side-title">Plattformen</div>
        ${plist.map(([p, n]) => `<button class="nav ${state.view === 'library' && state.platform === p ? 'active' : ''}" data-platform="${h(p)}">${icon('disc')}<span class="label">${h(p)}</span><span class="count">${n}</span></button>`).join('')}
      </div>` : ''}
      <div class="side-bottom"><button class="nav" data-action="settings">${icon('settings')}<span class="label">Einstellungen</span></button></div>`;
  },

  // ---------- Werkzeugleiste ----------

  toolbar(state, info) {
    const title = `<div class="tb-title"><h1>${h(info.title)}</h1><span class="sub" data-subtitle>${h(info.subtitle || '')}</span></div>`;
    const search = (ph) => `<label class="search">${icon('search')}<input id="search" type="search" placeholder="${h(ph)}" value="${h(state.search)}" spellcheck="false"></label>`;
    const inspectorBtn = `<button class="icon-btn ${state.inspector ? 'on' : ''}" data-action="toggle-inspector" title="Details ein-/ausblenden">${icon('sidebar')}</button>`;
    const add = (label) => `<button class="btn primary" data-action="new">${icon('plus')}${label}</button>`;

    switch (state.view) {
      case 'library':
        return `${title}${search('Titel, Reihe, Inventar-Nr. …')}
          <select class="select" data-pref="statusFilter" title="Status">
            <option value="">Alle Status</option>
            ${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${state.statusFilter === k ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <select class="select" data-pref="formatFilter" title="Physisch / Digital">
            <option value="">Physisch + Digital</option>
            <option value="physical" ${state.formatFilter === 'physical' ? 'selected' : ''}>Nur physisch</option>
            <option value="digital" ${state.formatFilter === 'digital' ? 'selected' : ''}>Nur digital</option>
          </select>
          <select class="select" data-pref="sort" title="Sortieren nach">
            ${Object.entries(SORTS).map(([k, l]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>↕ ${l}</option>`).join('')}
          </select>
          <select class="select" data-pref="group" title="Gruppieren nach">
            ${Object.entries(GROUPS).map(([k, l]) => `<option value="${k}" ${state.group === k ? 'selected' : ''}>${k === 'off' ? l : '▤ ' + l}</option>`).join('')}
          </select>
          <div class="seg"><button class="${state.layout === 'grid' ? 'on' : ''}" data-layout="grid" title="Raster">${icon('grid')}</button><button class="${state.layout === 'list' ? 'on' : ''}" data-layout="list" title="Liste">${icon('list')}</button></div>
          ${Accounts.anyConnected ? `<button class="icon-btn" data-action="sync" title="Trophäen & Erfolge abgleichen">${icon('star')}</button>` : ''}
          ${add('Spiel')}${inspectorBtn}`;
      case 'accessories':
        return `${title}${search('Name, Art, Hersteller …')}
          <select class="select" data-pref="accFilter" title="Filtern">
            <option value="">Alles</option>
            <option value="hardware" ${state.accFilter === 'hardware' ? 'selected' : ''}>Nur Zubehör</option>
            <option value="collectible" ${state.accFilter === 'collectible' ? 'selected' : ''}>Nur Sammlerstücke</option>
            <optgroup label="Art">${Object.entries(ACCESSORY_TYPES).map(([k, t]) => `<option value="${k}" ${state.accFilter === k ? 'selected' : ''}>${t.label}</option>`).join('')}</optgroup>
          </select>
          ${add('Eintrag')}${inspectorBtn}`;
      case 'consoles':
        return `${title}${search('Name, Modell, Seriennummer …')}${add('Konsole')}${inspectorBtn}`;
      case 'wishlist':
        return `${title}${search('Titel, Plattform …')}
          <select class="select" data-pref="wishKind" title="Art">
            <option value="">Alle Arten</option>
            ${Object.entries(WISH_KIND).map(([k, v]) => `<option value="${k}" ${state.wishKind === k ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>
          <select class="select" data-pref="wishSort" title="Sortieren nach">
            ${Object.entries({ release: 'Erscheinungsdatum', priority: 'Priorität', title: 'Titel', added: 'Zuletzt hinzugefügt' })
              .map(([k, l]) => `<option value="${k}" ${state.wishSort === k ? 'selected' : ''}>↕ ${l}</option>`).join('')}
          </select>
          ${add('Wunsch')}${inspectorBtn}`;
      case 'calendar':
        return `${title}${search('Titel suchen …')}
          <select class="select" data-pref="calRange" title="Zeitraum">
            ${Object.entries(CAL_RANGES).map(([k, l]) => `<option value="${k}" ${String(state.calRange) === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <button class="icon-btn" data-action="cal-refresh" title="Neu laden" ${Online.configured ? '' : 'disabled'}>${icon('refresh')}</button>`;
      case 'labels':
        return `${title}${search('Titel oder Inventar-Nr.')}
          <div class="seg text"><button class="${state.labelLayout === 'sheet' ? 'on' : ''}" data-label-layout="sheet">A4-Bogen 3 × 8</button><button class="${state.labelLayout === 'single' ? 'on' : ''}" data-label-layout="single">Einzeln 60 × 30 mm</button></div>
          <button class="btn" data-action="labels-pdf" ${state.labelSel.size ? '' : 'disabled'}>${icon('download')}PDF</button>
          <button class="btn primary" data-action="labels-print" ${state.labelSel.size ? '' : 'disabled'}>${icon('printer')}Drucken</button>`;
      default:
        return title;
    }
  },

  // ---------- Bibliothek ----------

  filteredGames(state) {
    const q = state.search.trim().toLowerCase();
    let list = Store.games;
    if (state.platform) list = list.filter((g) => g.platform === state.platform);
    if (state.statusFilter) list = list.filter((g) => g.status === state.statusFilter);
    if (state.formatFilter) list = list.filter((g) => (g.format || 'physical') === state.formatFilter);
    if (q) list = list.filter((g) => Game.matches(g, q));
    return sortGames(list, state.sort);
  },

  library(state) {
    if (!Store.games.length) {
      return emptyState('library', 'Noch keine Spiele',
        'Lege dein erstes Spiel an – oder lade ein paar Beispieldaten, um dich umzusehen.',
        `<button class="btn primary" data-action="new">${icon('plus')}Spiel hinzufügen</button><button class="btn" data-action="sample">Beispieldaten laden</button>`);
    }
    const list = this.filteredGames(state);
    if (!list.length) return emptyState('search', 'Keine Treffer', 'Passe Suche oder Filter an.');
    const groups = groupGames(list, state.group);
    return `<div class="pad">${groups.map((gr) => `
      <div class="group">
        ${gr.title ? `<div class="group-head"><h2>${h(gr.title)}</h2><span class="n">${gr.items.length}</span></div>` : ''}
        ${state.layout === 'grid'
          ? `<div class="grid">${gr.items.map((g) => this.gameCard(g, state)).join('')}</div>`
          : `<div class="rows">${gr.items.map((g) => this.gameRow(g, state)).join('')}</div>`}
      </div>`).join('')}</div>`;
  },

  gameCard(g, state) {
    return `<div class="card ${state.selected.game === g.id ? 'sel' : ''}" data-item="game" data-id="${g.id}">
      <div class="cover">${coverInner(g.cover, g.title, g.platform)}</div>
      <div class="meta"><div class="t" title="${h(g.title)}">${h(g.title)}</div><div class="s">${h(Game.subtitle(g)) || '&nbsp;'}</div>
      <div class="badges">${gameBadges(g)}</div>
      ${progressBar(g)}</div>
    </div>`;
  },

  gameRow(g, state) {
    const s = STATUS[g.status] || STATUS.backlog;
    return `<div class="row ${state.selected.game === g.id ? 'sel' : ''}" data-item="game" data-id="${g.id}">
      <div class="cover thumb">${coverInner(g.cover, g.title, '')}</div>
      <div style="min-width:0"><div class="t">${h(g.title)} ${g.edition !== 'standard' ? `<span class="pill" style="--c:var(--accent)">${EDITION[g.edition].short}</span>` : ''}</div>
        <div class="s">${h([Game.subtitle(g), g.publisher].filter(Boolean).join(' · '))}</div></div>
      <div>${uskBadge(g.usk)}</div>
      <div>${g.format === 'digital' ? '<span class="pill" style="--c:#3b82f6">DIGITAL</span>' : conditionPill(g.condition)}</div>
      <div class="st" style="color:${s.color}">${icon(s.icon)}<span style="color:var(--muted)">${s.label}</span></div>
      <div class="prog" style="--c:${s.color};margin:0"><div class="bar"><i style="width:${g.progress || 0}%"></i></div></div>
      <div class="inv">${h(g.inventory)}</div>
    </div>`;
  },

  labelPanel(label) {
    return `<div class="panel"><h3>${icon('qr')}Inventar-Etikett</h3>
      <div class="label-preview">${labelMarkup(label)}</div>
      <div class="inline">
        <button class="btn small" data-action="label-print" ${label.inventory ? '' : 'disabled'}>${icon('printer')}Drucken</button>
        <button class="btn small" data-action="label-pdf" ${label.inventory ? '' : 'disabled'}>${icon('download')}PDF</button>
      </div></div>`;
  },

  // ---------- Konsolen ----------

  filteredConsoles(state) {
    const q = state.search.trim().toLowerCase();
    const list = q ? Store.consoles.filter((c) => Consoles.matches(c, q)) : Store.consoles;
    return [...list].sort((a, b) => (Consoles.isDue(b) - Consoles.isDue(a)) || compareText(a.name, b.name));
  },

  consoles(state) {
    if (!Store.consoles.length) {
      return emptyState('gamepad', 'Noch keine Konsolen',
        'Erfasse deine Konsolen samt Seriennummer, Zustand und Wartungshistorie.',
        `<button class="btn primary" data-action="new">${icon('plus')}Konsole hinzufügen</button>`);
    }
    const list = this.filteredConsoles(state);
    if (!list.length) return emptyState('search', 'Keine Treffer', 'Passe die Suche an.');
    return `<div class="pad"><div class="grid wide">${list.map((c) => {
      const due = Consoles.isDue(c);
      return `<div class="card ${state.selected.console === c.id ? 'sel' : ''}" data-item="console" data-id="${c.id}">
        <div class="cover landscape">${coverInner(c.cover, c.name, manufacturerFor(c.platform || c.name))}</div>
        <div class="meta">
          <div style="display:flex;gap:8px;align-items:center"><div class="t" style="flex:1">${h(c.name)}</div>${conditionPill(c.condition)}</div>
          <div class="s">${h(Consoles.subtitle(c))}</div>
          <div class="maint-line ${due ? 'warn' : ''}">${icon(due ? 'alert' : 'wrench')}<span>${h(Consoles.statusText(c))}</span></div>
        </div></div>`;
    }).join('')}</div></div>`;
  },

  // ---------- Wunschliste ----------

  filteredWishes(state) {
    const q = state.search.trim().toLowerCase();
    let list = Store.wishlist;
    if (state.wishKind) list = list.filter((w) => w.kind === state.wishKind);
    if (q) list = list.filter((w) => [w.title, w.platform, w.notes].some((v) => String(v || '').toLowerCase().includes(q)));
    const rank = (w) => PRIORITY[w.priority]?.rank ?? 1;
    return [...list].sort((a, b) => {
      switch (state.wishSort) {
        case 'priority': return (rank(b) - rank(a)) || compareText(a.title, b.title);
        case 'title': return compareText(a.title, b.title);
        case 'added': return String(b.createdAt).localeCompare(String(a.createdAt));
        default:
          if (a.releaseDate && b.releaseDate) return a.releaseDate.localeCompare(b.releaseDate);
          if (a.releaseDate) return -1;
          if (b.releaseDate) return 1;
          return (rank(b) - rank(a)) || compareText(a.title, b.title);
      }
    });
  },

  wishlist(state) {
    if (!Store.wishlist.length) {
      return emptyState('star', 'Die Wunschliste ist leer',
        'Sammle hier Spiele, Limited Editions, Konsolen und Zubehör, die du noch haben möchtest.',
        `<button class="btn primary" data-action="new">${icon('plus')}Wunsch hinzufügen</button>`);
    }
    const list = this.filteredWishes(state);
    if (!list.length) return emptyState('search', 'Keine Treffer', 'Passe Suche oder Filter an.');
    const todayIso = isoDate(today());
    return `<div class="pad"><div class="rows">${list.map((w) => {
      const kind = WISH_KIND[w.kind] || WISH_KIND.game;
      const prio = PRIORITY[w.priority] || PRIORITY.normal;
      const released = w.releaseDate && w.releaseDate <= todayIso;
      return `<div class="wish ${state.selected.wish === w.id ? 'sel' : ''}" data-item="wish" data-id="${w.id}">
        <div class="cover thumb">${coverInner(w.cover, w.title, '')}</div>
        <div style="min-width:0"><div class="t">${h(w.title)}</div>
          <div class="s">${icon(kind.icon)}${h(kind.label)}${w.platform ? ` · ${h(w.platform)}` : ''}</div></div>
        <div class="num">${w.targetPrice != null ? `${fmt.euro(w.targetPrice)}<small>Zielpreis</small>` : ''}</div>
        <div class="num">${w.releaseDate ? `${fmt.date(w.releaseDate)}<small style="${released ? 'color:var(--green)' : ''}">${released ? 'bereits erhältlich' : fmt.relative(w.releaseDate)}</small>` : '<span class="muted">Termin offen</span>'}</div>
        <div class="flag" style="--c:${prio.color}" title="Priorität: ${prio.label}">${icon('flag')}</div>
        <div class="acts"><button class="btn small" data-action="acquire" title="${kind.collectible ? 'In die Sammlung übernehmen' : 'Von der Liste nehmen'}">${icon('cart')}Gekauft</button></div>
      </div>`;
    }).join('')}</div></div>`;
  },

  wishInspector(w) {
    const kind = WISH_KIND[w.kind] || WISH_KIND.game;
    const prio = PRIORITY[w.priority] || PRIORITY.normal;
    const facts = [['Art', kind.label], ['Plattform', w.platform], ['Priorität', prio.label],
      [w.releaseDate && w.releaseDate <= isoDate(today()) ? 'Erschienen' : 'Erscheint',
        w.releaseDate ? (w.releaseDate <= isoDate(today()) ? `am ${fmt.date(w.releaseDate)} – bereits erhältlich` : `${fmt.date(w.releaseDate)} (${fmt.relative(w.releaseDate)})`) : 'Termin offen'],
      ['Zielpreis', fmt.euro(w.targetPrice)], ['Hinzugefügt', fmt.date(w.createdAt)]].filter(([, v]) => v);
    return `<div class="insp">
      <div class="cover hero">${coverInner(w.cover, w.title, w.platform)}</div>
      <div><h2>${h(w.title)}</h2><div class="subline">${h(kind.label)}${w.platform ? ' · ' + h(w.platform) : ''}</div></div>
      <div class="panel"><h3>${icon('info')}Details</h3><dl class="facts">${facts.map(([l, v]) => `<dt>${h(l)}</dt><dd>${h(v)}</dd>`).join('')}</dl>
        ${w.link ? `<button class="btn small" style="margin-top:12px" data-action="open-link">${icon('link')}Link öffnen</button>` : ''}</div>
      <div class="panel"><h3>${icon('euro')}Preisvergleich</h3>${linkChips(priceLinks(itemQuery(w, 'wish')))}</div>
      ${w.notes ? `<div class="panel"><h3>${icon('note')}Notizen</h3><div class="notes">${h(w.notes)}</div></div>` : ''}
      <button class="btn primary" data-action="acquire">${icon('cart')}${kind.collectible ? 'Gekauft – in Sammlung übernehmen' : 'Gekauft – von der Liste nehmen'}</button>
      <div class="insp-actions"><button class="btn" data-action="edit">${icon('edit')}Bearbeiten</button><button class="btn danger" data-action="delete" style="flex:none" title="Löschen">${icon('trash')}</button></div>
    </div>`;
  },

  // ---------- Etiketten ----------

  allLabels(state) {
    const q = state.search.trim().toLowerCase();
    const list = [...Store.games.filter((g) => g.format !== 'digital').map((g) => labelFor(g, 'game')), ...Store.consoles.map((c) => labelFor(c, 'console')), ...Store.accessories.map((a) => labelFor(a, 'accessory'))];
    const filtered = q ? list.filter((l) => [l.title, l.inventory, l.subtitle].some((v) => v.toLowerCase().includes(q))) : list;
    return filtered.sort((a, b) => compareText(a.inventory, b.inventory));
  },

  labels(state) {
    const all = this.allLabels(state);
    if (!Store.games.length && !Store.consoles.length && !Store.accessories.length) {
      return emptyState('qr', 'Noch nichts zu etikettieren', 'Sobald Spiele oder Konsolen erfasst sind, kannst du hier Etiketten mit QR-Code drucken.');
    }
    const chosen = all.filter((l) => state.labelSel.has(l.id));
    const allOn = all.length && all.every((l) => state.labelSel.has(l.id));
    return `<div class="labels-wrap">
      <div class="labels-list"><table class="ltable">
        <thead><tr><th style="width:34px"><input type="checkbox" data-label-all ${allOn ? 'checked' : ''} title="Alle auswählen"></th><th>Inventar-Nr.</th><th>Titel</th><th>Details</th><th>Art</th></tr></thead>
        <tbody>${all.map((l) => `<tr class="${state.labelSel.has(l.id) ? 'sel' : ''}" data-label-row="${l.id}">
          <td><input type="checkbox" ${state.labelSel.has(l.id) ? 'checked' : ''} tabindex="-1"></td>
          <td class="inv">${h(l.inventory || '—')}</td><td>${h(l.title)}</td><td class="muted">${h(l.subtitle)}</td><td class="muted">${l.kind}</td></tr>`).join('')}
        </tbody></table></div>
      <div class="labels-preview" id="label-preview">${this.labelPreview(chosen, state.labelLayout)}</div>
    </div>`;
  },

  labelPreview(chosen, layout) {
    if (!chosen.length) {
      return `<div class="empty" style="min-height:0"><div>${icon('qr')}<h2>Vorschau</h2><p>Wähle links Einträge aus. Jedes Etikett trägt einen QR-Code, der später in der Handy-App direkt zum Eintrag führt.</p></div></div>`;
    }
    if (layout === 'single') {
      return chosen.slice(0, 40).map((l) => `<div class="label-preview" style="margin:0">${labelMarkup(l)}</div>`).join('')
        + (chosen.length > 40 ? `<div class="muted">+ ${chosen.length - 40} weitere</div>` : '');
    }
    const pages = Math.ceil(chosen.length / SHEET.perPage);
    return `<div class="sheet-holder" data-sheet-holder><div class="sheet-frame">${sheetMarkup(chosen.slice(0, SHEET.perPage))}</div></div>
      <div class="muted" style="font-size:12px">${pages === 1 ? '1 Seite' : `Seite 1 von ${pages}`} · ${chosen.length} Etikett${chosen.length === 1 ? '' : 'en'}</div>`;
  },

  // ---------- Übersicht ----------

  overview() {
    const games = Store.games, consoles = Store.consoles, wishes = Store.wishlist;
    const active = games.filter((g) => g.status === 'active').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const done = games.filter((g) => g.status === 'completed').length;
    const due = consoles.filter((c) => Consoles.isDue(c)).length;
    const cv = collectionValue();
    const todayIso = isoDate(today());
    const upcoming = wishes.filter((w) => w.releaseDate && w.releaseDate >= todayIso).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    const platforms = new Set(games.map((g) => g.platform).filter(Boolean)).size;
    const maint = consoles.filter((c) => Consoles.nextDue(c)).sort((a, b) => Consoles.nextDue(a).localeCompare(Consoles.nextDue(b)));
    const counts = {};
    for (const g of games) { const k = g.platform || 'Ohne Plattform'; counts[k] = (counts[k] || 0) + 1; }
    const bars = Object.entries(counts).sort((a, b) => b[1] - a[1] || compareText(a[0], b[0])).slice(0, 8);
    const max = bars.length ? bars[0][1] : 1;

    const tile = (nav, ic, v, l, c) => `<button class="tile" ${nav ? `data-nav="${nav}"` : ''}>${icon(ic)}<div class="v">${v}</div><div class="l">${l}</div><div class="c">${c}</div></button>`;
    return `<div class="pad">
      <div class="tiles">
        ${tile('library', 'library', games.length, 'Spiele', `${platforms} Plattform${platforms === 1 ? '' : 'en'}`)}
        ${tile('library', 'play', active.length, 'Am Spielen', `${games.length ? Math.round((done / games.length) * 100) : 0} % erledigt`)}
        ${tile('consoles', 'gamepad', consoles.length, 'Konsolen', due ? `<span class="warn">${due} Wartung fällig</span>` : 'alle gewartet')}
        ${tile('wishlist', 'star', wishes.length, 'Wunschliste', upcoming.length ? `${upcoming.length} mit Termin` : 'keine Termine')}
        ${tile('', 'euro', fmt.euroRound(cv.current), 'Sammlungswert', `Kaufwert ${fmt.euroRound(cv.purchase)}`)}
      </div>
      <div class="panel value-panel" style="margin-top:14px"><h3>${icon('euro')}Sammlungswert</h3>
        <div class="value-row">
          ${[['Spiele (physisch)', games.filter((g) => g.format !== 'digital')], ['Konsolen', consoles], ['Zubehör & Sammlerstücke', Store.accessories]]
            .map(([l, list]) => `<div><small>${l}</small><b>${fmt.euroRound(list.reduce((s, x) => s + itemValue(x), 0))}</b><span class="muted" style="font-size:11px">${list.length} Eintr${list.length === 1 ? 'ag' : 'äge'}</span></div>`).join('')}
          <div><small>Gesamt</small><b style="font-size:20px">${fmt.euroRound(cv.current)}</b><span class="${cv.current >= cv.purchase ? 'ok' : 'bad'}" style="font-size:11px">${cv.current >= cv.purchase ? '+' : ''}${fmt.euroRound(cv.current - cv.purchase)} ggü. Kaufpreis</span></div>
        </div>
        <div class="inline" style="margin-top:12px;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn small" data-action="value-all">${icon('search')}Alle Werte über eBay schätzen</button>
          <span class="muted" style="font-size:12px">${cv.estimated} von ${cv.total} Einträgen haben einen aktuellen Wert, sonst zählt der Kaufpreis.</span>
        </div>
      </div>
      <div class="two">
        <div class="panel"><h3>${icon('play')}Gerade am Spielen</h3>
          ${active.length ? `<div class="ov-list">${active.slice(0, 6).map((g) => `
            <div class="ov-item" data-item="game" data-id="${g.id}" data-goto="library">
              <div class="cover thumb">${coverInner(g.cover, g.title, '')}</div>
              <div style="min-width:0"><div class="t">${h(g.title)}</div>${progressBar(g)}</div>
              <span></span></div>`).join('')}</div>` : '<div class="muted">Kein Spiel als „Am Spielen“ markiert.</div>'}
        </div>
        <div class="panel"><h3>${icon('wrench')}Wartung</h3>
          ${maint.length ? `<div class="ov-list">${maint.slice(0, 6).map((c) => {
            const d = Consoles.isDue(c);
            return `<div class="state ${d ? 'warn' : 'ok'}" data-item="console" data-id="${c.id}" data-goto="consoles">${icon(d ? 'alert' : 'seal')}<div><b style="color:var(--text)">${h(c.name)}</b><small>${h(Consoles.statusText(c))}</small></div></div>`;
          }).join('')}</div>` : `<div class="muted">${consoles.length ? 'Keine Wartungserinnerungen gesetzt.' : 'Noch keine Konsolen erfasst.'}</div>`}
        </div>
        <div class="panel"><h3>${icon('calendar')}Demnächst auf der Wunschliste</h3>
          ${upcoming.length ? `<div class="ov-list">${upcoming.slice(0, 6).map((w) => `
            <div style="display:flex;justify-content:space-between;gap:10px" data-item="wish" data-id="${w.id}" data-goto="wishlist"><span class="t" style="font-weight:560">${h(w.title)}</span><span class="muted">${fmt.relative(w.releaseDate)}</span></div>`).join('')}</div>`
            : '<div class="muted">Trage bei Wünschen ein Erscheinungsdatum ein, um sie hier zu sehen.</div>'}
        </div>
        <div class="panel"><h3>${icon('chart')}Nach Plattform</h3>
          ${bars.length ? `<div class="bars">${bars.map(([p, n]) => `<div class="b"><span>${h(p)}</span><div class="track"><i style="width:${Math.max(4, (n / max) * 100)}%"></i></div><span>${n}</span></div>`).join('')}</div>` : '<div class="muted">Noch keine Spiele.</div>'}
        </div>
      </div>
    </div>`;
  }
};
