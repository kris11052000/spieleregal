/* PlayStation- und Xbox-Konto: Trophäen, Erfolge und Spielzeit abgleichen */

const ROMAN = { ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'der', 'die', 'das', 'und', 'for', 'edition', 'remastered', 'remaster',
  'deluxe', 'digital', 'standard', 'complete', 'definitive', 'directors', 'director', 'cut', 'goty', 'game', 'year',
  'trophies', 'trophäen', 'ps4', 'ps5', 'playstation', 'xbox', 'series', 'one', 'pc', 'windows', 'version', 'ultimate',
  'marvels', 'marvel', 'tom', 'clancys', 'sid', 'meiers', 'disney', 'disneys', 'sonys', 'edition', 'collection', 'hd', 'enhanced']);

const MIN_SCORE = 0.8;

const Accounts = {
  status: { psn: { connected: false }, xbox: { connected: false }, ebay: { configured: false } },
  syncing: false,

  async refresh() {
    try { this.status = await window.api.accountsStatus(); } catch (_) { /* Standard behalten */ }
    return this.status;
  },

  get anyConnected() { return !!(this.status.psn.connected || this.status.xbox.connected); },

  norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[™®©]/g, '').replace(/[’'`´]/g, '').replace(/&/g, ' and ')
      .replace(/[^a-z0-9äöüß]+/g, ' ').replace(/\s+/g, ' ').trim();
  },

  tokens(s) {
    return this.norm(s).split(' ').map((t) => ROMAN[t] || t).filter((t) => t && !STOP.has(t));
  },

  /** Ähnlichkeit 0…1 zweier Titel */
  similarity(a, b) {
    if (this.norm(a) === this.norm(b)) return 1;
    const A = this.tokens(a), B = this.tokens(b);
    if (!A.length || !B.length) return 0;
    if (A.join(' ') === B.join(' ')) return 0.98;
    const setB = new Set(B);
    const common = A.filter((t) => setB.has(t)).length;
    // Zahlen (Teil 2 vs. Teil 3) müssen übereinstimmen
    const numsA = A.filter((t) => /^\d+$/.test(t)).join(','), numsB = B.filter((t) => /^\d+$/.test(t)).join(',');
    if (numsA !== numsB) return 0;
    return common / Math.max(A.length, B.length);
  },

  platformFits(game, title, source) {
    if (!game.platform) return true;
    if (title.platforms.includes(game.platform)) return true;
    return source === 'psn' ? /playstation|^ps/i.test(game.platform) : /xbox|^pc$/i.test(game.platform);
  },

  /** Bester passender Titel für ein Spiel (oder null) */
  bestTitle(game, titles, source, used = new Set()) {
    let best = null, bestScore = 0;
    for (const t of titles) {
      if (used.has(t.id) || !this.platformFits(game, t, source)) continue;
      let s = this.similarity(game.title, t.name);
      if (t.platforms.includes(game.platform)) s += 0.01;
      if (s > bestScore) { best = t; bestScore = s; }
    }
    return bestScore >= MIN_SCORE ? best : null;
  },

  usedIds(source) {
    return new Set(Store.games.filter((g) => g.trophies && g.trophies.source === source).map((g) => g.trophies.titleId));
  },

  /** Ordnet Konto-Titel den Spielen der Bibliothek zu */
  match(titles, source) {
    const pairs = [];
    const used = new Set();
    // 1) bestehende Verknüpfungen
    for (const g of Store.games) {
      if (g.trophies && g.trophies.source === source) {
        const t = titles.find((x) => x.id === g.trophies.titleId);
        if (t) { pairs.push([g, t]); used.add(t.id); }
      }
    }
    // 2) neue Zuordnungen, beste Übereinstimmung zuerst
    const open = Store.games.filter((g) => !g.trophies);
    const cands = [];
    for (const g of open) {
      for (const t of titles) {
        if (used.has(t.id) || !this.platformFits(g, t, source)) continue;
        const s = this.similarity(g.title, t.name) + (t.platforms.includes(g.platform) ? 0.01 : 0);
        if (s >= MIN_SCORE) cands.push([s, g, t]);
      }
    }
    cands.sort((a, b) => b[0] - a[0]);
    const taken = new Set();
    for (const [, g, t] of cands) {
      if (taken.has(g.id) || used.has(t.id)) continue;
      taken.add(g.id); used.add(t.id);
      pairs.push([g, t]);
    }
    return { pairs, unmatched: titles.filter((t) => !used.has(t.id)) };
  },

  apply(g, t) {
    g.trophies = trophySnapshot(t);
    if (t.playtime && (!g.playtime || t.playtime > g.playtime)) g.playtime = t.playtime;
    const lp = (t.lastPlayed || '').slice(0, 10);
    if (lp && (!g.lastPlayed || lp > g.lastPlayed)) g.lastPlayed = lp;
    if (t.progress > 0 && g.status === 'backlog') g.status = 'active';
    g.updatedAt = new Date().toISOString();
  },

  /** Neues/bearbeitetes Spiel automatisch mit gespeicherten Konto-Titeln verknüpfen */
  autoLink(g) {
    for (const source of ['psn', 'xbox']) {
      const titles = Store.data.sync[source + 'Titles'] || [];
      if (!titles.length) continue;
      const t = this.bestTitle(g, titles, source, this.usedIds(source));
      if (t) { this.apply(g, t); return true; }
    }
    return false;
  },

  gameFromTitle(t, source, format) {
    const g = newGame({
      title: t.name, platform: t.platforms[0] || '', format,
      store: format === 'digital' ? (source === 'psn' ? 'PlayStation Store' : 'Microsoft Store') : '',
      status: t.progress >= 100 ? 'completed' : t.progress > 0 ? 'active' : 'backlog',
      progress: Math.round((t.progress || 0) * 10) / 10
    });
    this.apply(g, t);
    if (format === 'physical') g.inventory = Store.nextInventory('game');
    return g;
  },

  async sync({ autoAdd } = {}) {
    await this.refresh();
    const s = Store.settings;
    const add = autoAdd ?? !!s.accountsAutoAdd;
    const result = [];
    for (const source of ['psn', 'xbox']) {
      if (!this.status[source].connected) continue;
      try {
        const titles = await Online.call(source === 'psn' ? 'psnTitles' : 'xboxTitles');
        Store.data.sync[source + 'Titles'] = titles;
        Store.data.sync[source + 'At'] = new Date().toISOString();
        const { pairs, unmatched } = this.match(titles, source);
        for (const [g, t] of pairs) this.apply(g, t);
        const added = [];
        if (add) {
          for (const t of unmatched) {
            const g = this.gameFromTitle(t, source, s.accountsAutoFormat || 'digital');
            Store.games.push(g);
            added.push(g);
            this.fetchCover(g, t);
          }
        }
        result.push({ source, total: titles.length, matched: pairs.length, added, unmatched: add ? [] : unmatched });
      } catch (err) {
        result.push({ source, error: err.message });
      }
    }
    Store.save();
    return result;
  },

  /** Beim Start im Hintergrund abgleichen (höchstens alle 6 Stunden) */
  async autoSync() {
    await this.refresh();
    if (!this.anyConnected || this.syncing) return;
    const last = Math.max(...['psnAt', 'xboxAt'].map((k) => Date.parse(Store.data.sync[k] || 0) || 0));
    if (Date.now() - last < 6 * 3600000) return;
    this.syncing = true;
    try {
      const res = await this.sync();
      const added = res.reduce((n, r) => n + ((r.added && r.added.length) || 0), 0);
      const matched = res.reduce((n, r) => n + (r.matched || 0), 0);
      const err = res.find((r) => r.error);
      if (err) toast(err.error);
      else if (added) toast(`${added} neue Spiele aus deinem Konto hinzugefügt`);
      else if (matched) toast('Trophäen & Spielzeit aktualisiert');
      if (!Modal.current) App.render();
    } finally {
      this.syncing = false;
    }
  },

  async openSync() {
    openModal({
      title: 'Konten abgleichen', cls: 'narrow',
      body: '<div class="cal-loading" style="padding:40px 0"><span class="spinner"></span>Trophäen und Erfolge werden geladen …</div>',
      footer: '<button class="btn primary" data-submit disabled>Fertig</button>'
    });
    const result = await this.sync({ autoAdd: false });
    if (!Modal.current) return App.render();
    const el = Modal.current.el;
    const name = { psn: 'PlayStation', xbox: 'Xbox' };
    const body = el.querySelector('.modal-body');
    if (!result.length) {
      body.innerHTML = `<p class="muted">Kein Konto verbunden. Verbinde PlayStation oder Xbox unter <b>Einstellungen → Konten</b>.</p>`;
    } else {
      body.innerHTML = result.map((r) => r.error
        ? `<div class="sync-block"><h4>${name[r.source]}</h4><p class="bad">${h(r.error)}</p></div>`
        : `<div class="sync-block" data-source="${r.source}"><h4>${name[r.source]} <span class="muted">${r.matched} von ${r.total} Titeln automatisch zugeordnet</span></h4>
          ${r.unmatched.length ? `<p class="muted" style="font-size:12px;margin:4px 0 8px">${r.unmatched.length} Titel ${r.unmatched.length === 1 ? "ist" : "sind"} noch nicht in deiner Bibliothek:</p>
          <label class="toggle" style="margin-bottom:6px"><input type="checkbox" data-add-all checked><span>Alle auswählen</span></label>
          <div class="sync-list">${r.unmatched.sort((a, b) => String(b.lastPlayed).localeCompare(String(a.lastPlayed))).map((t) => `
            <label class="sync-item"><input type="checkbox" data-add="${h(t.id)}" checked>
              <span class="sg-thumb" style="width:30px;height:30px">${t.icon ? `<img src="${h(t.icon)}" alt="">` : ''}</span>
              <span class="sg-text"><b>${h(t.name)}</b><small>${h(t.platforms.map(shortPlatform).join(', '))} · ${Math.round(t.progress)} %${t.playtime ? ' · ' + fmt.num(t.playtime) + ' Std.' : ''}</small></span>
            </label>`).join('')}</div>
          <div class="inline" style="margin-top:10px;align-items:center">
            <span class="muted" style="font-size:12px">Hinzufügen als</span>
            <select class="select" data-add-format><option value="digital">Digital</option><option value="physical">Physisch</option></select>
            <button class="btn primary small" data-act="add-selected">Zur Bibliothek hinzufügen</button>
          </div>` : '<p class="ok" style="font-size:12.5px">✓ Alle Titel sind in deiner Bibliothek.</p>'}</div>`).join('');
    }
    const done = el.querySelector('[data-submit]');
    done.disabled = false;
    done.onclick = () => { closeModal('ok'); App.render(); };
    for (const block of $$('.sync-block[data-source]', el)) {
      const source = block.dataset.source;
      const all = block.querySelector('[data-add-all]');
      if (all) all.onchange = () => { for (const cb of $$('[data-add]', block)) cb.checked = all.checked; };
      const btn = block.querySelector('[data-act="add-selected"]');
      if (!btn) continue;
      btn.onclick = () => {
        const format = block.querySelector('[data-add-format]').value;
        const titles = Store.data.sync[source + 'Titles'] || [];
        let n = 0;
        for (const cb of $$('[data-add]:checked', block)) {
          const t = titles.find((x) => x.id === cb.dataset.add);
          if (!t) continue;
          const g = this.gameFromTitle(t, source, format);
          Store.games.push(g);
          cb.closest('.sync-item').remove();
          n++;
          this.fetchCover(g, t);
        }
        Store.save();
        toast(n ? `${n} Spiel${n === 1 ? '' : 'e'} hinzugefügt` : 'Nichts ausgewählt');
        if (!$$('[data-add]', block).length) block.querySelector('.sync-list').outerHTML = '<p class="ok" style="font-size:12.5px">✓ Alle hinzugefügt.</p>';
      };
    }
  },

  async fetchCover(g, t) {
    let url = '';
    if (Online.configured) {
      try {
        const res = await Online.searchGames(g.title);
        const hit = res.find((r) => this.similarity(r.title, g.title) >= 0.9) || res[0];
        if (hit) {
          url = hit.coverUrl;
          for (const k of ['publisher', 'developer', 'genre', 'series']) if (!g[k] && hit[k]) g[k] = hit[k];
          if (!g.year && hit.year) g.year = hit.year;
          if (!g.releaseDate && hit.releaseDate) g.releaseDate = hit.releaseDate;
          if (!g.usk && hit.usk) g.usk = hit.usk;
          g.igdbId = hit.igdbId;
        }
      } catch (_) { /* egal */ }
    }
    if (!url) url = t.icon;
    try { if (url) g.cover = await Online.cover(url); } catch (_) { /* ohne Cover */ }
    Store.save();
    if (!Modal.current) App.render();
  }
};
