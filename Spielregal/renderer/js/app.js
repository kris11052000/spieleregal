/* Steuerung: Zustand, Ereignisse, Aktionen */

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2400);
}

const PREF_KEYS = ['sort', 'group', 'consoleSort', 'consoleGroup', 'checkCollapsed', 'layout', 'inspector', 'wishSort', 'labelLayout', 'calRange', 'calPlatforms', 'calType', 'calPopular'];

const App = {
  state: {
    view: 'library', platform: '', search: '',
    statusFilter: '', sort: 'title', group: 'off', consoleSort: 'name', consoleGroup: 'maker', checkCollapsed: {}, layout: 'grid', inspector: true,
    wishKind: '', wishSort: 'release',
    calRange: '90', calPlatforms: ['PlayStation 5', 'PlayStation 4', 'Nintendo Switch 2', 'Nintendo Switch'], calType: '', calPopular: true,
    labelSel: new Set(), labelLayout: 'sheet',
    formatFilter: '', accFilter: '', checkOpen: {},
    selected: { game: null, console: null, wish: null, accessory: null }
  },

  async init() {
    document.body.classList.toggle('mac', window.api.platform === 'darwin');
    this.loadPrefs();
    await Store.load();
    await Promise.all([Online.refresh(), Accounts.refresh()]);
    this.bind();
    this.render();
    window.api.onMenu((cmd) => this.command(cmd));
    setTimeout(() => Accounts.autoSync().catch(() => {}), 1500);
  },

  loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('spielregal.prefs') || '{}');
      for (const k of PREF_KEYS) if (k in p) this.state[k] = p[k];
    } catch (_) { /* egal */ }
  },

  savePrefs() {
    try {
      const p = {};
      for (const k of PREF_KEYS) p[k] = this.state[k];
      localStorage.setItem('spielregal.prefs', JSON.stringify(p));
    } catch (_) { /* egal */ }
  },

  // ---------- Rendering ----------

  render() {
    this.renderSidebar();
    this.renderToolbar();
    this.renderContent();
    this.renderInspector();
  },

  renderSidebar() { $('#sidebar').innerHTML = Views.sidebar(this.state); },

  toolbarInfo() {
    const s = this.state;
    switch (s.view) {
      case 'overview': return { title: 'Übersicht', subtitle: new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) };
      case 'library': {
        const n = Views.filteredGames(s).length;
        return { title: s.platform || 'Bibliothek', subtitle: n === 1 ? '1 Spiel' : `${n} Spiele` };
      }
      case 'consoles': {
        const n = Store.consoles.length, due = Store.consoles.filter((c) => Consoles.isDue(c)).length;
        return { title: 'Konsolen', subtitle: (n === 1 ? '1 Konsole' : `${n} Konsolen`) + (due ? ` · ${due} Wartung fällig` : '') };
      }
      case 'accessories': {
        const n = Views.filteredAccessories(s).length;
        const v = Store.accessories.reduce((sum, a) => sum + itemValue(a), 0);
        return { title: 'Zubehör & Sammlerstücke', subtitle: `${n} Eintr${n === 1 ? 'ag' : 'äge'}${v ? ' · ' + fmt.euroRound(v) : ''}` };
      }
      case 'wishlist': {
        const n = Views.filteredWishes(s).length;
        return { title: 'Wunschliste', subtitle: n === 1 ? '1 Wunsch' : `${n} Wünsche` };
      }
      case 'calendar': {
        const stand = Calendar.at ? ` · Stand ${new Date(Calendar.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : '';
        if (!Online.configured) return { title: 'Release-Kalender', subtitle: 'Online-Daten nicht eingerichtet' };
        if (Calendar.loading) return { title: 'Release-Kalender', subtitle: 'wird geladen …' };
        const n = Calendar.entries(s).length;
        return { title: 'Release-Kalender', subtitle: `${n} Termin${n === 1 ? '' : 'e'}${stand}` };
      }
      case 'labels': {
        const n = s.labelSel.size;
        return { title: 'Etiketten', subtitle: n ? `${n} ausgewählt` : 'Einträge auswählen' };
      }
      default: return { title: '' };
    }
  },

  renderToolbar() { $('#toolbar').innerHTML = Views.toolbar(this.state, this.toolbarInfo()); },

  renderContent() {
    const s = this.state;
    const content = $('#content');
    const scroll = content.scrollTop;
    content.innerHTML = s.view === 'overview' ? Views.overview()
      : s.view === 'library' ? Views.library(s)
      : s.view === 'consoles' ? Views.consoles(s)
      : s.view === 'accessories' ? Views.accessories(s)
      : s.view === 'wishlist' ? Views.wishlist(s)
      : s.view === 'calendar' ? Views.calendar(s)
      : Views.labels(s);
    content.scrollTop = scroll;
    content.style.overflow = s.view === 'labels' ? 'hidden' : '';
    const sub = $('[data-subtitle]');
    if (sub) sub.textContent = this.toolbarInfo().subtitle || '';
    if (s.view === 'labels') this.fitSheet();
    if (s.view === 'calendar') Calendar.load(s);
    if (s.view === 'wishlist') Extras.backfillWishDates();
  },

  renderCalendar() {
    if (this.state.view !== 'calendar') return;
    this.renderToolbar();
    this.renderContent();
  },

  /** Nach erfolgreicher Einrichtung der Online-Daten */
  onOnlineReady() {
    Calendar.key = '';
    if (this.state.view === 'calendar') this.renderCalendar();
  },

  renderInspector() {
    const s = this.state;
    const el = $('#inspector');
    const show = s.inspector && ['library', 'consoles', 'wishlist', 'accessories'].includes(s.view);
    el.classList.toggle('hidden', !show);
    if (!show) { el.innerHTML = ''; return; }
    const item = this.current();
    if (!item) {
      const what = { library: 'Spiel', consoles: 'Konsole', wishlist: 'Wunsch', accessories: 'Eintrag' }[s.view];
      el.innerHTML = `<div class="insp-empty"><div>${icon('sidebar')}<div>Kein${s.view === 'library' || s.view === 'wishlist' ? '' : 'e'} ${what} ausgewählt</div>
        <div style="font-size:12px;margin-top:4px;color:var(--faint)">Klick zeigt Details, Doppelklick öffnet den Editor.</div></div></div>`;
      return;
    }
    const scroll = el.scrollTop;
    el.innerHTML = s.view === 'library' ? Views.gameInspector(item)
      : s.view === 'consoles' ? Views.consoleInspector(item)
      : s.view === 'accessories' ? Views.accessoryInspector(item)
      : Views.wishInspector(item);
    el.scrollTop = scroll;
  },

  /** Passt die A4-Vorschau an die verfügbare Fläche an */
  fitSheet() {
    const holder = $('[data-sheet-holder]');
    const preview = $('#label-preview');
    if (!holder || !preview) return;
    const frame = holder.firstElementChild;
    const w = 210 * 96 / 25.4, hgt = 297 * 96 / 25.4;
    const scale = Math.min((preview.clientWidth - 48) / w, (preview.clientHeight - 80) / hgt, 1);
    frame.style.transform = `scale(${scale})`;
    holder.style.width = w * scale + 'px';
    holder.style.height = hgt * scale + 'px';
  },

  // ---------- Auswahl ----------

  kindOfView(view = this.state.view) {
    return { library: 'game', consoles: 'console', wishlist: 'wish', accessories: 'accessory' }[view] || null;
  },

  current() {
    const k = this.kindOfView();
    if (!k) return null;
    const id = this.state.selected[k];
    return id ? Store.find(Extras.storeOf(k), id) : null;
  },

  select(kind, id) {
    this.state.selected[kind] = id;
    const view = { game: 'library', console: 'consoles', wish: 'wishlist', accessory: 'accessories' }[kind];
    if (this.state.view !== view && this.state.view !== 'overview') this.state.view = view;
    this.render();
  },

  setView(view, platform = '') {
    const s = this.state;
    const changed = s.view !== view || s.platform !== platform;
    s.view = view;
    s.platform = view === 'library' ? platform : '';
    if (changed) { s.search = ''; $('#content').scrollTop = 0; }
    this.render();
  },

  // ---------- Ereignisse ----------

  bind() {
    document.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('dblclick', (e) => this.onDblClick(e));
    document.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    document.addEventListener('input', (e) => this.onInput(e));
    document.addEventListener('change', (e) => this.onChange(e));
    document.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', debounce(() => this.fitSheet(), 60));
    window.addEventListener('blur', () => hideContextMenu());
  },

  onClick(e) {
    const t = e.target;
    if (!t.closest('.ctx')) hideContextMenu();
    if (t.closest('#overlay')) return;

    const nav = t.closest('[data-nav]');
    if (nav) return this.setView(nav.dataset.nav);
    const plat = t.closest('[data-platform]');
    if (plat) return this.setView('library', plat.dataset.platform);
    const lay = t.closest('[data-layout]');
    if (lay) { this.state.layout = lay.dataset.layout; this.savePrefs(); this.renderToolbar(); return this.renderContent(); }
    const llay = t.closest('[data-label-layout]');
    if (llay) { this.state.labelLayout = llay.dataset.labelLayout; this.savePrefs(); this.renderToolbar(); return this.renderContent(); }

    const calP = t.closest('[data-cal-platform]');
    if (calP) {
      const p = calP.dataset.calPlatform, list = this.state.calPlatforms;
      this.state.calPlatforms = list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
      this.savePrefs();
      return this.renderCalendar();
    }
    const calT = t.closest('[data-cal-type]');
    if (calT) { this.state.calType = calT.dataset.calType; this.savePrefs(); return this.renderCalendar(); }
    const calW = t.closest('[data-cal-wish]');
    if (calW && !t.closest('[data-action]')) return this.select('wish', calW.dataset.calWish) || this.setView('wishlist');

    const action = t.closest('[data-action]');
    if (action && !action.disabled) return this.action(action.dataset.action, action);

    const row = t.closest('[data-label-row]');
    if (row) {
      const id = row.dataset.labelRow;
      if (this.state.labelSel.has(id)) this.state.labelSel.delete(id); else this.state.labelSel.add(id);
      this.renderToolbar();
      return this.renderContent();
    }

    const item = t.closest('[data-item]');
    if (item) {
      const kind = item.dataset.item;
      if (item.dataset.goto) { this.state.view = item.dataset.goto; this.state.search = ''; return this.select(kind, item.dataset.id); }
      // Doppelklick selbst erkennen (die Ansicht wird nach dem ersten Klick neu gezeichnet)
      const key = kind + ':' + item.dataset.id, now = Date.now();
      if (this.lastClick && this.lastClick.key === key && now - this.lastClick.t < 450) {
        this.lastClick = null;
        return this.edit(kind, item.dataset.id);
      }
      this.lastClick = { key, t: now };
      return this.select(kind, item.dataset.id);
    }
  },

  onDblClick(e) {
    const tl = e.target.closest('[data-maint]');
    if (tl) this.action('edit-maintenance', tl);
  },

  onInput(e) {
    const t = e.target;
    if (t.id === 'search') {
      this.state.search = t.value;
      this.renderContent();
      return;
    }
    if (t.dataset.quick === 'progress') {
      const g = this.current();
      if (!g) return;
      g.progress = clampPct(t.value) ?? 0;
      Store.save(true);
      this.refreshContentSoon();
    }
  },

  refreshContentSoon: debounce(function () { App.renderContent(); }, 120),

  onChange(e) {
    const t = e.target;
    if (t.matches('[data-check-section]')) {
      const item = this.current();
      const inp = $('[data-check-new]');
      if (t.value === '__new') {
        if (inp) { inp.placeholder = 'Name des neuen Bereichs, z. B. Welt 1 (Enter)'; inp.focus(); }
      } else {
        this.state.checkTarget = t.value && item ? { id: item.id, group: t.value } : null;
        if (inp) { inp.placeholder = t.value ? `Punkt in „${t.value}“ … (Enter)` : 'Neuer Punkt … (Enter)'; inp.focus(); }
      }
      return;
    }
    if (t.matches('[data-cal-popular]')) { this.state.calPopular = t.checked; this.savePrefs(); return this.renderCalendar(); }
    if (t.dataset.pref) {
      this.state[t.dataset.pref] = t.value;
      this.savePrefs();
      if (this.state.view === 'calendar') return this.renderCalendar();
      this.renderContent();
      return;
    }
    if (t.matches('[data-label-all]')) {
      const all = Views.allLabels(this.state);
      if (t.checked) all.forEach((l) => this.state.labelSel.add(l.id));
      else all.forEach((l) => this.state.labelSel.delete(l.id));
      this.renderToolbar();
      this.renderContent();
      return;
    }
    if (Extras.onChange(t, this.current(), this.kindOfView())) return;
    const g = this.current();
    if (t.dataset.quick === 'status' && g) {
      g.status = t.value;
      if (g.status === 'completed') g.progress = 100;
      g.updatedAt = new Date().toISOString();
      Store.save();
      this.render();
    }
    if (t.dataset.quick === 'progress-text' && g) g.progress = clampPct(parseNumber(t.value)) ?? 0;
    if ((t.dataset.quick === 'progress' || t.dataset.quick === 'progress-text') && g) {
      if (g.progress > 0 && g.status === 'backlog') g.status = 'active';
      if (g.progress >= 100 && (g.status === 'active' || g.status === 'paused')) g.status = 'completed';
      g.updatedAt = new Date().toISOString();
      Store.save();
      this.render();
    }
  },

  onKey(e) {
    const mod = e.metaKey || e.ctrlKey;
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    if (e.key === 'Escape') {
      if (closeOpenSuggest()) return;
      if ($('.ctx')) return hideContextMenu();
      if (Modal.current) return closeModal('cancel');
      if (e.target.id === 'search' && e.target.value) { e.target.value = ''; this.state.search = ''; return this.renderContent(); }
    }
    if (Modal.current) {
      if (mod && e.key === 'Enter') { e.preventDefault(); Modal.current.el.querySelector('[data-submit]')?.click(); }
      return;
    }
    if (e.key === 'Enter' && e.target.matches('[data-check-new]')) {
      e.preventDefault();
      return Extras.addCheck(this.current(), e.target.value, this.kindOfView());
    }
    // Ohne natives Menü (z. B. im Browser) Tastenkürzel selbst behandeln
    if (mod && !window.api.hasNativeMenu) {
      const map = { n: 'new', f: 'find', ',': 'settings', 1: 'view:overview', 2: 'view:library', 3: 'view:consoles', 4: 'view:accessories', 5: 'view:wishlist', 6: 'view:calendar', 7: 'view:labels' };
      if (map[e.key]) { e.preventDefault(); return this.command(map[e.key]); }
    }
    if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) {
      const item = this.current();
      if (item) { e.preventDefault(); this.action('delete'); }
    }
  },

  onContextMenu(e) {
    const el = e.target.closest('[data-item]');
    if (!el || el.dataset.goto) return;
    e.preventDefault();
    const { item: kind, id } = el.dataset;
    this.select(kind, id);
    const store = Extras.storeOf(kind);
    const item = Store.find(store, id);
    if (!item) return;
    const entries = [];
    if (kind === 'game') {
      entries.push(['Bearbeiten …', 'edit', () => this.edit('game', id)]);
      entries.push('-', 'Status');
      for (const [k, s] of Object.entries(STATUS)) {
        entries.push([s.label, item.status === k ? 'check' : s.icon, () => {
          item.status = k;
          if (k === 'completed') item.progress = 100;
          item.updatedAt = new Date().toISOString();
          Store.save(); this.render();
        }]);
      }
      if (item.trophies) {
        entries.push(['Trophäen-Verknüpfung lösen', 'xcircle', () => {
          item.trophies = null; Store.upsert('games', item); toast('Verknüpfung gelöst'); this.render();
        }]);
      }
      entries.push('-');
      entries.push(['Etikett drucken …', 'printer', () => printLabels([labelFor(item, 'game')], 'single')]);
      entries.push(['Etikett als PDF …', 'download', () => exportLabels([labelFor(item, 'game')], 'single', `Etikett ${item.inventory}`)]);
    } else if (kind === 'accessory') {
      entries.push(['Bearbeiten …', 'edit', () => this.edit('accessory', id)]);
      entries.push('-');
      entries.push(['Etikett drucken …', 'printer', () => printLabels([labelFor(item, 'accessory')], 'single')]);
      entries.push(['Etikett als PDF …', 'download', () => exportLabels([labelFor(item, 'accessory')], 'single', `Etikett ${item.inventory}`)]);
    } else if (kind === 'console') {
      entries.push(['Bearbeiten …', 'edit', () => this.edit('console', id)]);
      entries.push(['Wartung eintragen …', 'wrench', () => openMaintenanceEditor(item)]);
      entries.push('-');
      entries.push(['Etikett drucken …', 'printer', () => printLabels([labelFor(item, 'console')], 'single')]);
      entries.push(['Etikett als PDF …', 'download', () => exportLabels([labelFor(item, 'console')], 'single', `Etikett ${item.inventory}`)]);
    } else {
      entries.push(['Bearbeiten …', 'edit', () => this.edit('wish', id)]);
      entries.push([WISH_KIND[item.kind]?.collectible ? 'Gekauft – in Sammlung übernehmen' : 'Gekauft – von der Liste nehmen', 'cart', () => this.acquire(item)]);
      if (item.link) entries.push(['Link öffnen', 'link', () => window.api.openExternal(normalizeUrl(item.link))]);
      entries.push('-', 'Priorität');
      for (const [k, p] of Object.entries(PRIORITY)) {
        entries.push([p.label, item.priority === k ? 'check' : 'flag', () => { item.priority = k; Store.save(); this.render(); }]);
      }
    }
    entries.push('-');
    entries.push(['Löschen …', 'trash', () => deleteItem(store, item), 'danger']);
    showContextMenu(e.clientX, e.clientY, entries);
  },

  // ---------- Befehle & Aktionen ----------

  command(cmd) {
    if (Modal.current && cmd !== 'find') return;
    if (cmd.startsWith('view:')) return this.setView(cmd.slice(5));
    if (cmd === 'new') return this.action('new');
    if (cmd === 'find') { const s = $('#search'); if (s) { s.focus(); s.select(); } return; }
    if (cmd === 'settings') return openSettings();
    if (cmd === 'export') return this.exportBackup();
    if (cmd === 'import') return this.importBackup();
  },

  edit(kind, id) {
    if (kind === 'game') openGameEditor(Store.find('games', id));
    else if (kind === 'console') openConsoleEditor(Store.find('consoles', id));
    else if (kind === 'accessory') openAccessoryEditor(Store.find('accessories', id));
    else openWishEditor(Store.find('wishlist', id));
  },

  action(name, el) {
    const s = this.state;
    const item = this.current();
    const kind = this.kindOfView();
    switch (name) {
      case 'new':
        if (s.view === 'consoles') return openConsoleEditor(null);
        if (s.view === 'accessories') return openAccessoryEditor(null);
        if (s.view === 'wishlist') return openWishEditor(null);
        return openGameEditor(null, s.platform ? { platform: s.platform } : {});
      case 'edit': return item && this.edit(kind, item.id);
      case 'delete': return item && deleteItem(Extras.storeOf(kind), item);
      case 'sample': insertSampleData(); return this.render();
      case 'settings': return openSettings((el && el.dataset.settingsTab) || 'general');
      case 'toggle-inspector':
        s.inspector = !s.inspector; this.savePrefs(); this.renderToolbar(); return this.renderInspector();
      case 'label-print': return item && printLabels([labelFor(item, kind)], 'single');
      case 'label-pdf': return item && exportLabels([labelFor(item, kind)], 'single', `Etikett ${item.inventory}`);
      case 'labels-print': return printLabels(this.chosenLabels(), s.labelLayout);
      case 'labels-pdf': return exportLabels(this.chosenLabels(), s.labelLayout, 'Spielregal-Etiketten');
      case 'add-maintenance': return item && openMaintenanceEditor(item);
      case 'edit-maintenance': {
        const id = el.closest('[data-maint]')?.dataset.maint;
        const entry = item && (item.maintenance || []).find((m) => m.id === id);
        return entry && openMaintenanceEditor(item, entry);
      }
      case 'acquire': {
        const row = el && el.closest('[data-item="wish"]');
        const w = row ? Store.find('wishlist', row.dataset.id) : item;
        return w && this.acquire(w);
      }
      case 'open-link': return item && item.link && window.api.openExternal(normalizeUrl(item.link));
      case 'online-fill': return item && openGameEditor(item, {}, { search: true });
      case 'cal-refresh': try { localStorage.removeItem(CAL_CACHE_KEY); } catch (_) {} return Calendar.load(s, true);
      case 'cal-add': return addReleaseToWishlist(el.dataset.igdb, el);
      case 'sync': return Accounts.openSync();
      case 'value-all': el.disabled = true; return Extras.estimateAll(el);
      default: return Extras.action(name, el, item, kind);
    }
  },

  chosenLabels() {
    return Views.allLabels({ ...this.state, search: '' }).filter((l) => this.state.labelSel.has(l.id));
  },

  /** Wunsch → Sammlung */
  acquire(w) {
    const kind = WISH_KIND[w.kind] || WISH_KIND.game;
    if (w.kind === 'accessory') {
      const a = newAccessory({ name: w.title, platform: w.platform, type: 'hwother', cover: w.cover, notes: w.notes, purchaseDate: isoDate(today()) });
      a.inventory = Store.nextInventory('accessory');
      Store.accessories.push(a);
      Store.remove('wishlist', w.id);
      toast(`„${w.title}“ zu Zubehör & Sammlerstücken hinzugefügt (${a.inventory})`);
    } else if (w.kind === 'console') {
      const c = newConsole({ name: w.title, platform: w.platform, cover: w.cover, notes: w.notes, purchaseDate: isoDate(today()) });
      c.inventory = Store.nextInventory('console');
      Store.consoles.push(c);
      Store.remove('wishlist', w.id);
      toast(`„${w.title}“ zu den Konsolen hinzugefügt (${c.inventory})`);
    } else if (kind.collectible) {
      const g = newGame({
        title: w.title, platform: w.platform, cover: w.cover, notes: w.notes,
        edition: w.kind === 'limited' ? 'limited' : 'standard', purchaseDate: isoDate(today()),
        year: w.releaseDate ? Number(w.releaseDate.slice(0, 4)) : null
      });
      g.inventory = Store.nextInventory('game');
      Store.games.push(g);
      Store.remove('wishlist', w.id);
      toast(`„${w.title}“ in die Bibliothek übernommen (${g.inventory})`);
    } else {
      Store.remove('wishlist', w.id);
      toast(`„${w.title}“ von der Wunschliste genommen`);
    }
    this.state.selected.wish = null;
    this.render();
  },

  async exportBackup() {
    const path = await window.api.exportBackup(Store.data);
    if (path) toast('Sicherung gespeichert');
  },

  async importBackup() {
    try {
      const data = await window.api.importBackup();
      if (!data) return;
      const added = Store.merge(data);
      this.render();
      toast(added ? `${added} Einträge importiert` : 'Keine neuen Einträge gefunden');
    } catch (err) {
      toast('Import fehlgeschlagen: Datei ist keine gültige Sicherung');
    }
  }
};

async function deleteItem(store, item) {
  if (!item) return;
  const name = item.title || item.name || 'Eintrag';
  const extra = store === 'consoles' ? ' Die Wartungshistorie wird ebenfalls entfernt.' : '';
  const ok = await confirmDialog({ title: `„${name}“ löschen?`, text: 'Der Eintrag wird dauerhaft entfernt.' + extra });
  if (!ok) return;
  Store.remove(store, item.id);
  const kind = store === 'games' ? 'game' : store === 'consoles' ? 'console' : store === 'accessories' ? 'accessory' : 'wish';
  if (App.state.selected[kind] === item.id) App.state.selected[kind] = null;
  App.state.labelSel.delete(item.id);
  App.render();
  toast('Gelöscht');
}

function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

// ---------- Kontextmenü ----------

function showContextMenu(x, y, entries) {
  hideContextMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx';
  const handlers = [];
  menu.innerHTML = entries.map((e) => {
    if (e === '-') return '<hr>';
    if (typeof e === 'string') return `<div class="sub-title">${h(e)}</div>`;
    handlers.push(e[2]);
    return `<button data-i="${handlers.length - 1}" class="${e[3] || ''}">${icon(e[1])}<span>${h(e[0])}</span></button>`;
  }).join('');
  document.body.appendChild(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.min(x, window.innerWidth - r.width - 8) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - r.height - 8) + 'px';
  menu.onclick = (ev) => {
    const b = ev.target.closest('button[data-i]');
    if (!b) return;
    hideContextMenu();
    handlers[Number(b.dataset.i)]();
  };
}

function hideContextMenu() {
  $$('.ctx').forEach((m) => m.remove());
}

App.init();
