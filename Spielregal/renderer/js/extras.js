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
      case 'check-group-toggle': {
        const items = checklistItemsIn(item, el.dataset.group);
        if (!items.length) return true;
        const all = items.every((c) => c.done);
        for (const c of items) c.done = !all;
        recomputeChecklistProgress(item);
        this.save(item, kind, item.progressAuto);
        return true;
      }
      case 'check-group-collapse': {
        const key = item.id + '|' + el.dataset.group;
        const c = { ...(App.state.checkCollapsed || {}) };
        if (c[key]) delete c[key]; else c[key] = true;
        App.state.checkCollapsed = c;
        App.savePrefs();
        App.renderInspector();
        return true;
      }
      case 'check-group-add':
        App.state.checkTarget = { id: item.id, group: el.dataset.group };
        App.renderInspector();
        setTimeout(() => $('[data-check-new]')?.focus(), 0);
        return true;
      case 'check-group-del': {
        const name = el.dataset.group;
        const items = checklistItemsIn(item, name);
        const drop = () => {
          item.checklist = (item.checklist || []).filter((c) => !items.includes(c));
          item.checkSections = (item.checkSections || []).filter((n) => n !== name && !n.startsWith(name + ' › '));
          if (App.state.checkTarget && App.state.checkTarget.group === name) App.state.checkTarget = null;
          recomputeChecklistProgress(item);
          this.save(item, kind, item.progressAuto);
        };
        if (!items.length) { drop(); return true; }
        confirmDialog({ title: `Bereich „${name}“ entfernen?`, text: `Der Bereich und seine ${items.length} Punkte werden entfernt.`, ok: 'Entfernen' })
          .then((ok) => { if (ok) drop(); });
        return true;
      }
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
      case 'panel-toggle':
        PanelSystem.toggle(kind, el.dataset.panelId);
        App.renderInspector();
        return true;
      case 'check-import': ChecklistImport.open(item); return true;
      case 'check-clear':
        confirmDialog({ title: 'Checkliste leeren?', text: `Alle ${item.checklist.length} Punkte werden entfernt.`, ok: 'Leeren' }).then((ok) => {
          if (!ok) return;
          item.checklist = [];
          item.progressAuto = false;
          this.save(item, kind);
        });
        return true;
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
    const sel = $('[data-check-section]');
    // Neuer Bereich: Eingabe wird zum Bereichsnamen
    if (sel && sel.value === '__new') {
      item.checkSections = item.checkSections || [];
      if (!item.checkSections.includes(text)) item.checkSections.push(text);
      App.state.checkTarget = { id: item.id, group: text };
      this.save(item, kind, false);
      setTimeout(() => $('[data-check-new]')?.focus(), 0);
      return;
    }
    // „Welt 1 > Level 1-1“ legt direkt im Bereich an
    let group = sel ? sel.value : '';
    const m = text.match(/^(.+?)\s*>\s*(.+)$/);
    if (m) {
      group = m[1].trim(); text = m[2].trim();
      item.checkSections = item.checkSections || [];
      if (!item.checkSections.includes(group) && !item.checklist.some((c) => c.group === group)) item.checkSections.push(group);
    }
    App.state.checkTarget = group ? { id: item.id, group } : null;
    item.checklist.push({ id: uid(), text, done: false, group });
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
