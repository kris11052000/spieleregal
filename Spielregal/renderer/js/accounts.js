/* PlayStation- und Xbox-Konto: Trophäen, Erfolge und Spielzeit abgleichen */

const Accounts = {
  status: { psn: { connected: false }, xbox: { connected: false }, ebay: { configured: false } },

  async refresh() {
    try { this.status = await window.api.accountsStatus(); } catch (_) { /* Standard behalten */ }
    return this.status;
  },

  get anyConnected() { return !!(this.status.psn.connected || this.status.xbox.connected); },

  norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[™®©]/g, '')
      .replace(/\b(ps4|ps5|playstation ?[45]|xbox series x\|s|xbox one|for xbox|pc)\b/g, ' ')
      .replace(/\b(edition|remastered|digital deluxe|deluxe|standard|trophies|trophäen)\b/g, ' ')
      .replace(/[^a-z0-9äöüß]+/g, ' ').replace(/\s+/g, ' ').trim();
  },

  /** Ordnet Konto-Titel den Spielen der Bibliothek zu */
  match(titles, source) {
    const family = source === 'psn' ? /playstation|ps vita|^ps/i : /xbox|^pc$/i;
    const games = Store.games.filter((g) => !g.platform || family.test(g.platform));
    const used = new Set();
    const pairs = [];
    const unmatched = [];
    for (const t of titles) {
      let g = games.find((x) => x.trophies && x.trophies.titleId === t.id);
      if (!g) {
        const n = this.norm(t.name);
        const cands = games.filter((x) => !used.has(x.id) && (!x.trophies || x.trophies.source !== source) && this.norm(x.title) === n);
        g = cands.find((x) => t.platforms.includes(x.platform)) || cands[0];
        if (!g && n.length >= 6) {
          const loose = games.filter((x) => !used.has(x.id) && !x.trophies && this.norm(x.title).length >= 6
            && (this.norm(x.title).startsWith(n) || n.startsWith(this.norm(x.title))));
          if (loose.length === 1) g = loose[0];
        }
      }
      if (g) { used.add(g.id); pairs.push([g, t]); } else unmatched.push(t);
    }
    return { pairs, unmatched };
  },

  async sync() {
    await this.refresh();
    const result = [];
    for (const source of ['psn', 'xbox']) {
      if (!this.status[source].connected) continue;
      try {
        const titles = await Online.call(source === 'psn' ? 'psnTitles' : 'xboxTitles');
        // Kompakt merken (für manuelle Zuordnung)
        Store.data.sync[source + 'Titles'] = titles.map((t) => ({ ...t }));
        Store.data.sync[source + 'At'] = new Date().toISOString();
        const { pairs, unmatched } = this.match(titles, source);
        for (const [g, t] of pairs) {
          g.trophies = trophySnapshot(t);
          if (t.playtime && (!g.playtime || t.playtime > g.playtime)) g.playtime = t.playtime;
          if (t.progress > 0 && g.status === 'backlog') g.status = 'active';
          g.updatedAt = new Date().toISOString();
        }
        result.push({ source, total: titles.length, matched: pairs.length, unmatched });
      } catch (err) {
        result.push({ source, error: err.message });
      }
    }
    Store.save();
    return result;
  },

  async openSync() {
    openModal({
      title: 'Konten abgleichen', cls: 'narrow',
      body: '<div class="cal-loading" style="padding:40px 0"><span class="spinner"></span>Trophäen und Erfolge werden geladen …</div>',
      footer: '<button class="btn primary" data-submit disabled>Fertig</button>'
    });
    const result = await this.sync();
    if (!Modal.current) return App.render();
    const el = Modal.current.el;
    const name = { psn: 'PlayStation', xbox: 'Xbox' };
    const body = el.querySelector('.modal-body');
    if (!result.length) {
      body.innerHTML = `<p class="muted">Kein Konto verbunden. Verbinde PlayStation oder Xbox unter <b>Einstellungen → Konten</b>.</p>`;
    } else {
      body.innerHTML = result.map((r) => r.error
        ? `<div class="sync-block"><h4>${name[r.source]}</h4><p class="bad">${h(r.error)}</p></div>`
        : `<div class="sync-block"><h4>${name[r.source]} <span class="muted">${r.matched} von ${r.total} Titeln zugeordnet</span></h4>
          ${r.unmatched.length ? `<p class="muted" style="font-size:12px;margin:4px 0 8px">Diese Titel sind (noch) nicht in deiner Bibliothek. Häkchen setzen, um sie anzulegen – oder später im Spiel unter „Verknüpfen“ zuordnen.</p>
          <div class="sync-list">${r.unmatched.sort((a, b) => String(b.lastPlayed).localeCompare(String(a.lastPlayed))).map((t) => `
            <label class="sync-item"><input type="checkbox" data-add="${r.source}:${h(t.id)}">
              <span class="sg-thumb" style="width:30px;height:30px">${t.icon ? `<img src="${h(t.icon)}" alt="">` : ''}</span>
              <span class="sg-text"><b>${h(t.name)}</b><small>${h(t.platforms.map(shortPlatform).join(', '))} · ${Math.round(t.progress)} %</small></span>
            </label>`).join('')}</div>
          <div class="inline" style="margin-top:10px;align-items:center">
            <span class="muted" style="font-size:12px">Anlegen als</span>
            <select class="select" data-add-format><option value="digital">Digital</option><option value="physical">Physisch</option></select>
            <button class="btn small" data-act="add-selected">Ausgewählte anlegen</button>
          </div>` : '<p class="ok" style="font-size:12.5px">Alles zugeordnet.</p>'}</div>`).join('');
    }
    const done = el.querySelector('[data-submit]');
    done.disabled = false;
    done.onclick = () => { closeModal('ok'); App.render(); };
    for (const b of $$('[data-act="add-selected"]', el)) {
      b.onclick = () => {
        const block = b.closest('.sync-block');
        const format = block.querySelector('[data-add-format]').value;
        let n = 0;
        for (const cb of $$('[data-add]:checked', block)) {
          const [source, ...rest] = cb.dataset.add.split(':');
          const id = rest.join(':');
          const t = (Store.data.sync[source + 'Titles'] || []).find((x) => x.id === id);
          if (!t) continue;
          const g = newGame({
            title: t.name, platform: t.platforms[0] || '', format,
            store: format === 'digital' ? (source === 'psn' ? 'PlayStation Store' : 'Microsoft Store') : '',
            status: t.progress >= 100 ? 'completed' : t.progress > 0 ? 'active' : 'backlog',
            trophies: trophySnapshot(t), playtime: t.playtime || null
          });
          if (format === 'physical') g.inventory = Store.nextInventory('game');
          Store.games.push(g);
          cb.closest('.sync-item').remove();
          n++;
          // Cover im Hintergrund nachladen (IGDB, sonst Konto-Bild)
          Accounts.fetchCover(g, t);
        }
        Store.save();
        toast(n ? `${n} Spiel${n === 1 ? '' : 'e'} angelegt` : 'Nichts ausgewählt');
      };
    }
  },

  async fetchCover(g, t) {
    let url = '';
    if (Online.configured) {
      try {
        const res = await Online.searchGames(g.title);
        const hit = res.find((r) => Accounts.norm(r.title) === Accounts.norm(g.title)) || res[0];
        if (hit) {
          url = hit.coverUrl;
          for (const k of ['publisher', 'developer', 'genre', 'series']) if (!g[k] && hit[k]) g[k] = hit[k];
          if (!g.year && hit.year) g.year = hit.year;
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
