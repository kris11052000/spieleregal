/* Checklisten, Trophäen, Guides, Preisvergleich, Wertschätzung */

const CONDITION_SELECT = Object.fromEntries(Object.entries(CONDITION).filter(([k]) => k !== 'digital'));

const CHECK_TEMPLATES = {
  story: { label: 'Story & Abschluss', items: ['Hauptstory abgeschlossen', 'Alle Nebenquests', 'Alle Sammelobjekte', 'Alle DLCs abgeschlossen', 'Platin / 1000G'] },
  hundred: { label: '100 %-Grundgerüst', items: ['Story', 'Nebenaufgaben', 'Sammelobjekte', 'Herausforderungen', 'Schwierigkeitsgrad-Trophäen', 'Online-/Multiplayer', 'Aufräumen (Verpasstes)'] }
};

const TROPHY_COLORS = { platinum: '#8ec5e8', gold: '#e2b33c', silver: '#b9bec7', bronze: '#c0784a' };
const TROPHY_LABEL = { platinum: 'Platin', gold: 'Gold', silver: 'Silber', bronze: 'Bronze' };

// ---------- Links ----------

function q(s) { return encodeURIComponent(String(s || '').trim()); }

function guideLinks(g) {
  const t = g.title;
  const isXbox = /xbox/i.test(g.platform || '') || (g.trophies && g.trophies.source === 'xbox');
  const links = [
    ['PowerPyx', `https://www.powerpyx.com/?s=${q(t)}`],
    ['PSNProfiles', `https://psnprofiles.com/search/guides?q=${q(t)}`],
    ['Exophase', `https://www.exophase.com/search/?q=${q(t)}`],
    ['YouTube 100 %', `https://www.youtube.com/results?search_query=${q(t + ' 100% walkthrough')}`],
    ['Sammelobjekte', `https://www.google.com/search?q=${q(t + ' alle Sammelobjekte Guide')}`]
  ];
  if (isXbox) links.splice(1, 1, ['TrueAchievements', `https://www.trueachievements.com/searchresults.aspx?search=${q(t)}`]);
  return links;
}

function priceLinks(query) {
  const s = Store.settings;
  const amazon = `https://www.amazon.de/s?k=${q(query)}${s.amazonTag ? '&tag=' + q(s.amazonTag) : ''}`;
  const ebay = `https://www.ebay.de/sch/i.html?_nkw=${q(query)}`
    + (s.ebayCampaign ? `&mkcid=1&mkrid=707-53477-19255-0&siteid=77&campid=${q(s.ebayCampaign)}&toolid=10001` : '');
  return [
    ['idealo', `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${q(query)}`],
    ['Amazon', amazon],
    ['eBay', ebay],
    ['eBay verkauft', `https://www.ebay.de/sch/i.html?_nkw=${q(query)}&LH_Sold=1&LH_Complete=1`],
    ['Kleinanzeigen', `https://www.kleinanzeigen.de/s-${q(query)}/k0`],
    ['PriceCharting', `https://www.pricecharting.com/search-products?q=${q(query)}&type=prices`]
  ];
}

function linkChips(links) {
  return `<div class="chips">${links.map(([l, u]) => `<button class="chip" data-action="open-ext" data-url="${h(u)}">${h(l)} ↗</button>`).join('')}</div>`;
}

function itemQuery(x, kind) {
  if (kind === 'game') return [x.title, shortPlatform(x.platform)].filter(Boolean).join(' ');
  if (kind === 'console') return [x.name, x.edition].filter(Boolean).join(' ');
  if (kind === 'wish') return [x.title, shortPlatform(x.platform)].filter(Boolean).join(' ');
  return [x.name, x.edition].filter(Boolean).join(' ');
}

// ---------- Panels ----------

const Panels = {
  value(x, kind) {
    const physical = !(kind === 'game' && x.format === 'digital');
    const diff = x.value != null && x.price != null ? x.value - x.price : null;
    return `<div class="panel"><h3>${icon('euro')}Wert & Preise</h3>
      ${physical ? `<div class="value-row">
        <div><small>Aktueller Wert</small>
          <label class="pct-box value-box"><input type="text" inputmode="decimal" value="${x.value != null ? fmt.inputNumber(x.value.toFixed ? x.value.toFixed(2) : x.value) : ''}" placeholder="—" data-quick="value" aria-label="Aktueller Wert"><span>€</span></label></div>
        <div><small>Kaufpreis</small><b>${x.price != null ? fmt.euro(x.price) : '—'}</b></div>
        ${diff != null ? `<div><small>Differenz</small><b class="${diff >= 0 ? 'ok' : 'bad'}">${diff >= 0 ? '+' : ''}${fmt.euro(diff)}</b></div>` : ''}
      </div>
      ${x.valueNote ? `<div class="value-note">${h(x.valueNote)}${x.valueDate ? ' · ' + fmt.date(x.valueDate) : ''}</div>` : ''}
      <button class="btn small" data-action="value-estimate" style="margin:10px 0 12px">${icon('search')}Wert über eBay schätzen</button>` : '<p class="muted" style="margin:0 0 10px;font-size:12px">Digitale Spiele zählen nicht zum Sammlungswert.</p>'}
      <div class="sub-label">Preisvergleich</div>
      ${linkChips(priceLinks(itemQuery(x, kind)))}
    </div>`;
  },

  guides(g) {
    return `<div class="panel"><h3>${icon('note')}Guides für 100 %</h3>${linkChips(guideLinks(g))}</div>`;
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
    return `<div class="panel"><h3>${icon('check')}Checkliste <span class="muted" style="margin-left:auto;font-weight:500">${list.length ? `${done}/${list.length}` : ''}</span></h3>
      ${list.length ? `<div class="ck-list">${rows}</div>` : '<p class="muted" style="margin:0 0 8px;font-size:12px">Eigene Ziele für 100 % abhaken – oder Trophäen/Erfolge als Liste übernehmen.</p>'}
      <div class="ck-add"><input class="input" data-check-new placeholder="Neuer Punkt … (Enter)"></div>
      <div class="inline" style="margin-top:8px;flex-wrap:wrap">
        <button class="btn small" data-action="check-template">${icon('list')}Vorlage</button>
        ${g.trophies ? `<button class="btn small" data-action="trophies-import">${icon('star')}${g.trophies.source === 'xbox' ? 'Erfolge' : 'Trophäen'} übernehmen</button>` : ''}
        ${list.length ? `<label class="toggle" style="margin-left:auto"><input type="checkbox" data-action-change="check-auto" ${g.progressAuto ? 'checked' : ''}><span>Fortschritt aus Liste</span></label>` : ''}
      </div>
    </div>`;
  },

  trophies(g) {
    const t = g.trophies;
    if (!t) return Panels.linkTitle(g);
    const synced = t.syncedAt ? `Stand ${fmt.date(t.syncedAt)}` : '';
    if (t.source === 'xbox') {
      return `<div class="panel"><h3>${icon('star')}Xbox-Erfolge</h3>
        <div class="tro-head"><b>${Math.round(t.progress)} %</b><span class="muted">${t.earned.achievements}/${t.defined.achievements} Erfolge · ${t.earned.gamerscore}/${t.defined.gamerscore} G</span></div>
        <div class="prog" style="--c:#2f9e55;margin:6px 0 8px"><div class="bar"><i style="width:${t.progress}%"></i></div></div>
        <div class="muted" style="font-size:11.5px">${[t.lastPlayed ? 'Zuletzt gespielt ' + fmt.relative(t.lastPlayed) : '', synced].filter(Boolean).join(' · ')}</div>
      </div>`;
    }
    const types = ['platinum', 'gold', 'silver', 'bronze'];
    return `<div class="panel"><h3>${icon('star')}PlayStation-Trophäen</h3>
      <div class="tro-head"><b>${Math.round(t.progress)} %</b>${t.earned.platinum ? '<span class="pill" style="--c:#4a9fd6">PLATIN</span>' : ''}</div>
      <div class="prog" style="--c:var(--accent);margin:6px 0 10px"><div class="bar"><i style="width:${t.progress}%"></i></div></div>
      <div class="tro-grid">${types.filter((k) => t.defined[k]).map((k) => `<div><span class="tdot" style="background:${TROPHY_COLORS[k]}"></span>${TROPHY_LABEL[k]}<b>${t.earned[k]}/${t.defined[k]}</b></div>`).join('')}</div>
      <div class="muted" style="font-size:11.5px;margin-top:8px">${[t.playtime ? `${fmt.num(t.playtime)} Std. gespielt` : '', t.lastPlayed ? 'zuletzt ' + fmt.relative(t.lastPlayed) : '', synced].filter(Boolean).join(' · ')}</div>
      <button class="btn ghost small" data-action="trophies-unlink" style="margin-top:6px">Verknüpfung lösen</button>
    </div>`;
  },

  /** Für Spiele ohne Verknüpfung: passende Konto-Titel zur Auswahl */
  linkTitle(g) {
    const fam = /playstation|ps /i.test(g.platform) ? 'psn' : /xbox/i.test(g.platform) ? 'xbox' : null;
    const titles = fam && (Store.data.sync[fam + 'Titles'] || []);
    if (!titles || !titles.length) return '';
    const used = new Set(Store.games.filter((x) => x.trophies).map((x) => x.trophies.titleId));
    const free = titles.filter((t) => !used.has(t.id)).sort((a, b) => compareText(a.name, b.name));
    if (!free.length) return '';
    return `<div class="panel"><h3>${icon('link')}Mit ${fam === 'psn' ? 'PlayStation' : 'Xbox'} verknüpfen</h3>
      <p class="muted" style="margin:0 0 8px;font-size:12px">Nicht automatisch zugeordnet. Wähle den passenden Titel aus deinem Konto:</p>
      <select class="select" style="width:100%" data-action-change="trophies-link" data-source="${fam}">
        <option value="">Titel auswählen …</option>
        ${free.map((t) => `<option value="${h(t.id)}">${h(t.name)}${t.platforms.length ? ' (' + h(t.platforms.map(shortPlatform).join(', ')) + ')' : ''}</option>`).join('')}
      </select></div>`;
  }
};

// ---------- Aktionen ----------

function recomputeChecklistProgress(g) {
  if (!g.progressAuto) return;
  const list = g.checklist || [];
  g.progress = list.length ? Math.round((list.filter((c) => c.done).length / list.length) * 1000) / 10 : 0;
  if (g.progress > 0 && g.status === 'backlog') g.status = 'active';
  if (g.progress >= 100 && (g.status === 'active' || g.status === 'paused')) g.status = 'completed';
}

function trophySnapshot(t) {
  return {
    source: t.source, titleId: t.id, service: t.service || '', name: t.name, platforms: t.platforms,
    progress: t.progress, earned: t.earned, defined: t.defined, lastPlayed: t.lastPlayed, playtime: t.playtime,
    syncedAt: new Date().toISOString()
  };
}

const Extras = {
  storeOf(kind) {
    return kind === 'game' ? 'games' : kind === 'console' ? 'consoles' : kind === 'accessory' ? 'accessories' : 'wishlist';
  },

  save(item, kind, full = true) {
    item.updatedAt = new Date().toISOString();
    Store.save();
    if (full) App.render(); else App.renderInspector();
  },

  /** true, wenn die Aktion hier behandelt wurde */
  action(name, el, item, kind) {
    switch (name) {
      case 'open-ext':
        window.api.openExternal(el.dataset.url);
        return true;
      case 'check-toggle': {
        const c = (item.checklist || []).find((x) => x.id === el.dataset.check);
        if (c) { c.done = !c.done; recomputeChecklistProgress(item); this.save(item, kind, item.progressAuto); }
        return true;
      }
      case 'check-del':
        item.checklist = (item.checklist || []).filter((x) => x.id !== el.dataset.check);
        recomputeChecklistProgress(item);
        this.save(item, kind, item.progressAuto);
        return true;
      case 'check-expand':
        App.state.checkOpen = { ...(App.state.checkOpen || {}), [el.dataset.group]: true };
        App.renderInspector();
        return true;
      case 'check-template': {
        const r = el.getBoundingClientRect();
        showContextMenu(r.left, r.bottom + 4, Object.entries(CHECK_TEMPLATES).map(([k, t]) => [t.label, 'list', () => {
          const have = new Set((item.checklist || []).map((c) => c.text));
          for (const text of t.items) if (!have.has(text)) item.checklist.push({ id: uid(), text, done: false, group: '' });
          recomputeChecklistProgress(item);
          this.save(item, kind, false);
        }]));
        return true;
      }
      case 'trophies-import': this.importTrophies(item, el); return true;
      case 'trophies-unlink':
        item.trophies = null;
        this.save(item, kind);
        return true;
      case 'value-estimate': this.estimate(item, kind, el); return true;
    }
    return false;
  },

  onChange(t, item, kind) {
    if (t.dataset.quick === 'value' && item) {
      item.value = parseNumber(t.value);
      item.valueDate = item.value != null ? isoDate(today()) : '';
      item.valueNote = item.value != null ? 'Manuell eingetragen' : '';
      this.save(item, kind);
      return true;
    }
    if (t.dataset.actionChange === 'check-auto' && item) {
      item.progressAuto = t.checked;
      recomputeChecklistProgress(item);
      this.save(item, kind);
      return true;
    }
    if (t.dataset.actionChange === 'trophies-link' && item && t.value) {
      const t2 = (Store.data.sync[t.dataset.source + 'Titles'] || []).find((x) => x.id === t.value);
      if (t2) {
        item.trophies = trophySnapshot(t2);
        if (t2.playtime && (!item.playtime || t2.playtime > item.playtime)) item.playtime = t2.playtime;
        this.save(item, kind);
        toast(`Mit „${t2.name}“ verknüpft`);
      }
      return true;
    }
    return false;
  },

  addCheck(item, text, kind) {
    text = String(text || '').trim();
    if (!text || !item) return;
    item.checklist = item.checklist || [];
    item.checklist.push({ id: uid(), text, done: false, group: '' });
    recomputeChecklistProgress(item);
    this.save(item, kind, item.progressAuto);
    setTimeout(() => $('[data-check-new]')?.focus(), 0);
  },

  async importTrophies(g, btn) {
    const t = g.trophies;
    if (!t) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Lade …'; }
    try {
      const list = t.source === 'xbox'
        ? await Online.call('xboxTrophies', t.titleId)
        : await Online.call('psnTrophies', t.titleId, t.service);
      const group = t.source === 'xbox' ? 'Erfolge' : 'Trophäen';
      const byId = new Map((g.checklist || []).filter((c) => c.ref).map((c) => [c.ref, c]));
      let added = 0;
      for (const tr of list) {
        const ex = byId.get(tr.id);
        if (ex) { ex.done = tr.done; ex.text = tr.name; ex.detail = tr.detail; continue; }
        g.checklist.push({ id: uid(), ref: tr.id, text: tr.name, detail: tr.detail, kind: tr.kind, done: tr.done, group });
        added++;
      }
      recomputeChecklistProgress(g);
      this.save(g, 'game');
      toast(added ? `${added} ${group} übernommen` : `${group} aktualisiert`);
    } catch (err) {
      toast(err.message);
      App.renderInspector();
    }
  },

  async estimate(x, kind, btn) {
    const query = itemQuery(x, kind);
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Suche Angebote …'; }
    try {
      const r = await Online.call('ebayEstimate', { query, condition: x.condition === 'sealed' ? 'new' : 'used' });
      if (r.value == null) {
        toast(r.count ? `Nur ${r.count} passende Angebote – zu wenig für eine Schätzung` : 'Keine passenden Angebote auf eBay gefunden');
        App.renderInspector();
        return false;
      }
      x.value = r.value;
      x.valueDate = isoDate(today());
      x.valueNote = `eBay.de · Median aus ${r.count} Angeboten (${fmt.euro(r.low)} – ${fmt.euro(r.high)})`;
      this.save(x, kind);
      if (btn) toast(`Geschätzter Wert: ${fmt.euro(r.value)}`);
      return true;
    } catch (err) {
      toast(err.code === 'setup' ? 'eBay ist noch nicht eingerichtet – Einstellungen → Preise' : err.message);
      App.renderInspector();
      return false;
    }
  },

  /** Alle physischen Einträge nacheinander schätzen */
  async estimateAll(btn) {
    const items = [
      ...Store.games.filter((g) => g.format !== 'digital').map((x) => [x, 'game']),
      ...Store.consoles.map((x) => [x, 'console']),
      ...Store.accessories.map((x) => [x, 'accessory'])
    ];
    let ok = 0, n = 0;
    for (const [x, kind] of items) {
      n++;
      if (btn) btn.innerHTML = `<span class="spinner"></span>${n}/${items.length} …`;
      try {
        const r = await Online.call('ebayEstimate', { query: itemQuery(x, kind), condition: x.condition === 'sealed' ? 'new' : 'used' });
        if (r.value != null) {
          x.value = r.value;
          x.valueDate = isoDate(today());
          x.valueNote = `eBay.de · Median aus ${r.count} Angeboten (${fmt.euro(r.low)} – ${fmt.euro(r.high)})`;
          ok++;
        }
      } catch (err) {
        toast(err.code === 'setup' ? 'eBay ist noch nicht eingerichtet – Einstellungen → Preise' : err.message);
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    Store.save();
    App.render();
    toast(`${ok} von ${items.length} Werten geschätzt`);
  },

  /** Wunschliste: fehlende Erscheinungstermine einmalig über IGDB nachtragen */
  async backfillWishDates() {
    if (!Online.configured || this.backfilling) return;
    const todo = Store.wishlist.filter((w) => !w.releaseDate && !w.dateChecked && (w.kind === 'game' || w.kind === 'limited' || w.kind === 'dlc'));
    if (!todo.length) return;
    this.backfilling = true;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    let changed = 0;
    for (const w of todo) {
      try {
        const res = await Online.searchGames(w.title);
        const hit = res.find((r) => norm(r.title) === norm(w.title)) || (res.length === 1 ? res[0] : null);
        if (hit && hit.releaseDate) { w.releaseDate = hit.releaseDate; w.igdbId = w.igdbId || hit.igdbId; changed++; }
      } catch (_) { break; }
      w.dateChecked = true;
    }
    this.backfilling = false;
    Store.save();
    if (changed) App.render();
  }
};
