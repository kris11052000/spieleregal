/* Release-Kalender: kommende Spiele, DLCs und Editionen + eigene Wunsch-Termine */

const CAL_PLATFORMS = ['PlayStation 5', 'PlayStation 4', 'Nintendo Switch 2', 'Nintendo Switch', 'Xbox Series X|S', 'Xbox One', 'PC'];
const CAL_RANGES = { 30: 'Nächste 30 Tage', 90: 'Nächste 3 Monate', 180: 'Nächste 6 Monate', 365: 'Nächstes Jahr' };
const CAL_TYPES = { '': 'Alles', game: 'Spiele', dlc: 'DLCs & Erweiterungen', edition: 'Bundles & Editionen', own: 'Nur Wunschliste' };
const CAL_CACHE_KEY = 'spielregal.calendar';
const CAL_CACHE_HOURS = 6;

const Calendar = {
  key: '', loading: false, error: null, items: [], at: null, from: '', to: '',

  range(state) {
    const from = isoDate(today());
    const end = today();
    end.setDate(end.getDate() + Number(state.calRange || 90));
    return { from, to: isoDate(end) };
  },

  keyFor(state) {
    const { from, to } = this.range(state);
    return [from, to, [...state.calPlatforms].sort().join('|')].join('#');
  },

  restore(key) {
    try {
      const c = JSON.parse(localStorage.getItem(CAL_CACHE_KEY) || 'null');
      if (c && c.key === key && Date.now() - c.at < CAL_CACHE_HOURS * 3600000) {
        Object.assign(this, { key, items: c.items, at: c.at, error: null });
        return true;
      }
    } catch (_) { /* egal */ }
    return false;
  },

  async load(state, force = false) {
    if (!Online.configured || !state.calPlatforms.length) return;
    const key = this.keyFor(state);
    if (!force && (this.key === key && (this.items.length || this.loading))) return;
    if (!force && this.restore(key)) return App.renderCalendar();
    const { from, to } = this.range(state);
    Object.assign(this, { key, loading: true, error: null, from, to });
    App.renderCalendar();
    try {
      const items = await Online.releases({ from, to, platforms: state.calPlatforms });
      if (this.key !== key) return;
      Object.assign(this, { items, at: Date.now(), loading: false });
      try { localStorage.setItem(CAL_CACHE_KEY, JSON.stringify({ key, at: this.at, items })); } catch (_) { /* voll */ }
    } catch (err) {
      if (this.key !== key) return;
      Object.assign(this, { loading: false, error: err.message, items: [] });
    }
    App.renderCalendar();
  },

  /** IGDB-Termine + eigene Wunschliste zusammenführen und filtern */
  entries(state) {
    const { from, to } = this.range(state);
    const q = state.search.trim().toLowerCase();
    const wishByIgdb = new Map(Store.wishlist.filter((w) => w.igdbId).map((w) => [w.igdbId, w]));
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    const wishByTitle = new Map(Store.wishlist.map((w) => [norm(w.title), w]));
    const ownedTitles = new Set(Store.games.map((g) => norm(g.title)));
    const anyHype = this.items.some((i) => i.hype > 0);

    let list = this.items.map((i) => ({
      ...i,
      wish: wishByIgdb.get(i.igdbId) || wishByTitle.get(norm(i.title)) || null,
      owned: ownedTitles.has(norm(i.title))
    }));
    if (state.calType === 'own') list = [];
    else {
      if (state.calType) list = list.filter((i) => i.group === state.calType);
      if (state.calPopular && anyHype) list = list.filter((i) => i.hype > 0 || i.wish);
    }

    // Eigene Termine (z. B. Konsolen, Limited Editions), die IGDB nicht kennt
    const shown = new Set(list.map((i) => i.wish && i.wish.id).filter(Boolean));
    for (const w of Store.wishlist) {
      if (!w.releaseDate || w.releaseDate < from || w.releaseDate > to || shown.has(w.id)) continue;
      if (state.calType && state.calType !== 'own') {
        const g = w.kind === 'dlc' ? 'dlc' : w.kind === 'limited' ? 'edition' : 'game';
        if (g !== state.calType) continue;
      }
      list.push({
        own: true, wish: w, title: w.title, date: w.releaseDate, platforms: w.platform ? [w.platform] : [],
        type: WISH_KIND[w.kind]?.label || 'Wunsch', group: 'own', cover: w.cover
      });
    }
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q) || (i.parent || '').toLowerCase().includes(q));
    return list.sort((a, b) => a.date.localeCompare(b.date) || (b.own ? 1 : 0) - (a.own ? 1 : 0) || (b.hype || 0) - (a.hype || 0));
  }
};

// ---------- Darstellung ----------

Views.calendarFilters = function (state) {
  return `<div class="cal-filters">
    <div class="chips">${CAL_PLATFORMS.map((p) => `<button class="chip ${state.calPlatforms.includes(p) ? 'on' : ''}" data-cal-platform="${h(p)}">${h(shortPlatform(p))}</button>`).join('')}</div>
    <div class="seg text">${Object.entries(CAL_TYPES).map(([k, l]) => `<button class="${state.calType === k ? 'on' : ''}" data-cal-type="${k}">${h(l)}</button>`).join('')}</div>
    <label class="toggle" title="Blendet Titel ohne Interesse bei IGDB aus (viele kleine PC-Veröffentlichungen)"><input type="checkbox" data-cal-popular ${state.calPopular ? 'checked' : ''}><span>Nur gefragte Titel</span></label>
  </div>`;
};

Views.calendar = function (state) {
  if (!Online.configured) {
    return `<div class="pad">${Views.calendarFilters(state)}</div>` + emptyState('calendar', 'Release-Kalender einrichten',
      'Der Kalender holt kommende Spiele, DLCs und Editionen von IGDB. Dafür einmal die kostenlosen Zugangsdaten in den Einstellungen eintragen. Eigene Termine aus der Wunschliste siehst du trotzdem unter „Nur Wunschliste“.',
      `<button class="btn primary" data-action="settings">${icon('settings')}Online-Daten einrichten</button>`);
  }
  if (!state.calPlatforms.length) {
    return `<div class="pad">${Views.calendarFilters(state)}${emptyState('gamepad', 'Keine Plattform gewählt', 'Wähle oben mindestens eine Plattform aus.')}</div>`;
  }
  let body;
  if (Calendar.loading && !Calendar.items.length) {
    body = `<div class="cal-loading"><span class="spinner"></span>Termine werden von IGDB geladen …</div>`;
  } else if (Calendar.error) {
    body = emptyState('alert', 'Kalender konnte nicht geladen werden', Calendar.error,
      `<button class="btn" data-action="cal-refresh">Erneut versuchen</button>`);
  } else {
    const list = Calendar.entries(state);
    if (!list.length) {
      body = emptyState('calendar', 'Keine Termine', 'Für diese Auswahl gibt es im Zeitraum keine Veröffentlichungen.');
    } else {
      const months = new Map();
      for (const e of list) {
        const k = e.date.slice(0, 7);
        if (!months.has(k)) months.set(k, []);
        months.get(k).push(e);
      }
      body = [...months.entries()].map(([k, entries]) => {
        const label = new Date(k + '-15T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        return `<div class="group">
          <div class="group-head"><h2>${h(label)}</h2><span class="n">${entries.length}</span></div>
          <div class="cal-list">${entries.map((e, i) => Views.calRow(e, entries[i - 1])).join('')}</div>
        </div>`;
      }).join('');
    }
  }
  return `<div class="pad">${Views.calendarFilters(state)}${body}</div>`;
};

Views.calRow = function (e, prev) {
  const d = new Date(e.date + 'T12:00:00');
  const sameDay = prev && prev.date === e.date;
  const isToday = e.date === isoDate(today());
  const thumb = e.own
    ? coverInner(e.cover, e.title, '')
    : (e.thumbUrl ? `<img src="${h(e.thumbUrl)}" alt="" loading="lazy">` : coverInner('', e.title, ''));
  let action;
  if (e.own) action = `<span class="pill" style="--c:var(--accent)">${icon('star')}Wunschliste</span>`;
  else if (e.wish) action = `<span class="cal-state">${icon('check')}Auf der Wunschliste</span>`;
  else if (e.owned) action = `<span class="cal-state">${icon('library')}In der Sammlung</span>`;
  else action = `<button class="btn small" data-action="cal-add" data-igdb="${e.igdbId}">${icon('plus')}Wunschliste</button>`;
  return `<div class="cal-row ${isToday ? 'today' : ''}" ${e.own ? `data-cal-wish="${e.wish.id}"` : ''}>
    <div class="cal-date ${sameDay ? 'same' : ''}"><b>${d.getDate()}</b><small>${d.toLocaleDateString('de-DE', { weekday: 'short' })}</small></div>
    <div class="cover thumb">${thumb}</div>
    <div class="cal-main">
      <div class="t">${h(e.title)}</div>
      <div class="s">
        ${e.group !== 'game' && !e.own ? `<span class="pill" style="--c:${e.group === 'dlc' ? 'var(--orange)' : '#8b5cf6'}">${h(e.type)}</span>` : ''}
        ${e.own ? `<span class="pill" style="--c:var(--muted)">${h(e.type)}</span>` : ''}
        ${e.parent ? `<span class="muted">für ${h(e.parent)}</span>` : ''}
        ${e.platforms.map((p) => `<span class="plat">${h(shortPlatform(p))}</span>`).join('')}
      </div>
    </div>
    <div class="cal-act">${action}</div>
  </div>`;
};

// ---------- Aktionen ----------

async function addReleaseToWishlist(igdbId, button) {
  const e = Calendar.items.find((i) => String(i.igdbId) === String(igdbId));
  if (!e) return;
  if (button) { button.disabled = true; button.innerHTML = '<span class="spinner"></span>…'; }
  const kind = e.group === 'dlc' ? 'dlc' : e.group === 'edition' ? 'limited' : 'game';
  const w = newWish({
    title: e.title, platform: bestPlatform(e.platforms, App.state.calPlatforms), kind,
    releaseDate: e.date, igdbId: e.igdbId, notes: e.parent ? `Erweiterung für ${e.parent}` : ''
  });
  try { w.cover = await Online.cover(e.coverUrl); } catch (_) { /* ohne Cover weiter */ }
  Store.upsert('wishlist', w);
  App.render();
  toast(`„${e.title}“ auf die Wunschliste gesetzt`);
}
