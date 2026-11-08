/* Online-Daten über IGDB: Vorschläge beim Anlegen, Cover-Download */

const Online = {
  configured: false,
  clientId: '',

  async refresh() {
    try {
      const c = await window.api.igdbGetConfig();
      this.configured = !!(c && c.clientId && c.hasSecret);
      this.clientId = (c && c.clientId) || '';
      return c;
    } catch (_) {
      this.configured = false;
      return { clientId: '', hasSecret: false };
    }
  },

  async call(fn, ...args) {
    const r = await window.api[fn](...args);
    if (!r || !r.ok) {
      const err = new Error((r && r.message) || 'Unbekannter Fehler');
      err.code = r && r.code;
      throw err;
    }
    return r.data;
  },

  searchGames(q) { return this.call('igdbSearchGames', q); },
  searchPlatforms(q) { return this.call('igdbSearchPlatforms', q); },
  releases(opts) { return this.call('igdbReleases', opts); },
  cover(url) { return url ? this.call('coverFromUrl', url) : Promise.resolve(''); }
};

/** Wählt die passendste Plattform: bevorzugt die, die in der Sammlung am häufigsten vorkommt */
function bestPlatform(list, preferred = []) {
  if (!list || !list.length) return '';
  for (const p of preferred) if (list.includes(p)) return p;
  const counts = {};
  for (const g of Store.games) if (g.platform) counts[g.platform] = (counts[g.platform] || 0) + 1;
  const owned = list.filter((p) => counts[p]).sort((a, b) => counts[b] - counts[a]);
  if (owned.length) return owned[0];
  const order = ['PlayStation 5', 'PlayStation 4', 'Nintendo Switch 2', 'Nintendo Switch', 'Xbox Series X|S', 'Xbox One', 'PC'];
  return order.find((p) => list.includes(p)) || list[0];
}

const PLATFORM_SHORT = {
  'PlayStation 5': 'PS5', 'PlayStation 4': 'PS4', 'PlayStation 3': 'PS3', 'PlayStation 2': 'PS2', PlayStation: 'PS1',
  'Nintendo Switch 2': 'Switch 2', 'Nintendo Switch': 'Switch', 'Xbox Series X|S': 'Xbox Series', 'Xbox One': 'Xbox One',
  'Xbox 360': 'X360', PC: 'PC'
};
const shortPlatform = (p) => PLATFORM_SHORT[p] || p;

// ---------- Vorschlagsliste ----------

let openSuggest = null;

function closeOpenSuggest() {
  if (openSuggest) { openSuggest.close(); return true; }
  return false;
}

/**
 * Hängt eine Online-Suche an ein Eingabefeld.
 * kind: 'game' | 'platform'; auto: beim Tippen automatisch suchen
 */
function attachSuggest({ input, kind, auto, onPick }) {
  const field = input.closest('.field');
  field.classList.add('has-suggest');
  const box = document.createElement('div');
  box.className = 'suggest';
  field.appendChild(box);

  let items = [];
  let active = -1;
  let lastQuery = '';
  let seq = 0;
  let suppressed = false;

  const api = {
    get isOpen() { return box.classList.contains('open'); },
    open() { box.classList.add('open'); openSuggest = api; },
    close() { box.classList.remove('open'); if (openSuggest === api) openSuggest = null; },
    async search(q, { force = false } = {}) {
      q = String(q || '').trim();
      if (q.length < 2) return api.close();
      if (!Online.configured) {
        if (!force) return;
        box.innerHTML = `<div class="sg-msg">${icon('info')}<div><b>Online-Daten sind noch nicht eingerichtet.</b><br>
          Trage unter <i>Einstellungen → Online-Daten</i> deine IGDB-Zugangsdaten ein.</div></div>`;
        return api.open();
      }
      if (!force && q === lastQuery) return;
      lastQuery = q;
      const my = ++seq;
      box.innerHTML = `<div class="sg-msg"><span class="spinner"></span>Suche „${h(q)}“ bei IGDB …</div>`;
      api.open();
      try {
        const res = kind === 'platform' ? await Online.searchPlatforms(q) : await Online.searchGames(q);
        if (my !== seq) return;
        items = kind === 'platform'
          ? res.flatMap((p) => [{ ...p, version: null }, ...p.versions.map((v) => ({ ...p, version: v }))])
          : res;
        active = -1;
        render();
      } catch (err) {
        if (my !== seq) return;
        box.innerHTML = `<div class="sg-msg bad">${icon('alert')}<div>${h(err.message)}</div></div>`;
      }
    }
  };

  function render() {
    if (!items.length) {
      box.innerHTML = `<div class="sg-msg">${icon('search')}Keine Treffer bei IGDB.</div>`;
      return;
    }
    box.innerHTML = `<div class="sg-head">Vorschläge von IGDB</div>` + items.map((r, i) => {
      if (kind === 'platform') {
        const name = r.version ? r.version.name : r.name;
        const logo = r.version ? r.version.logoUrl : r.logoUrl;
        return `<button type="button" class="sg-item ${r.version ? 'sub' : ''} ${i === active ? 'on' : ''}" data-i="${i}">
          <span class="sg-logo">${logo ? `<img src="${h(logo)}" alt="">` : icon('gamepad')}</span>
          <span class="sg-text"><b>${h(name)}</b><small>${h(r.version ? 'Modell von ' + r.name : [r.family, r.abbreviation].filter(Boolean).join(' · '))}</small></span>
        </button>`;
      }
      const meta = [r.year, r.platforms.slice(0, 4).map(shortPlatform).join(', ') + (r.platforms.length > 4 ? ' …' : '')].filter(Boolean).join(' · ');
      return `<button type="button" class="sg-item ${i === active ? 'on' : ''}" data-i="${i}">
        <span class="sg-thumb">${r.thumbUrl ? `<img src="${h(r.thumbUrl)}" alt="">` : ''}</span>
        <span class="sg-text"><b>${h(r.title)}</b><small>${h(meta)}</small></span>
        ${r.group !== 'game' || r.type !== 'Spiel' ? `<span class="pill" style="--c:var(--accent)">${h(r.type)}</span>` : ''}
      </button>`;
    }).join('');
  }

  function pick(i) {
    const r = items[i];
    if (!r) return;
    suppressed = true;
    lastQuery = '';
    api.close();
    onPick(r);
  }

  box.addEventListener('mousedown', (e) => e.preventDefault()); // Fokus im Feld lassen
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) pick(Number(b.dataset.i));
  });

  const autoSearch = debounce(() => { if (!suppressed) api.search(input.value); }, 500);
  input.addEventListener('input', () => {
    suppressed = false;
    if (auto && Online.configured && input.value.trim().length >= 3) autoSearch();
    if (!input.value.trim()) api.close();
  });
  input.addEventListener('keydown', (e) => {
    if (!api.isOpen || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; render(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); e.stopPropagation(); pick(active); }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (!box.matches(':hover')) api.close(); }, 150));

  return api;
}

/** Kleiner Button „Online suchen“ neben einem Feld */
function onlineButton() {
  return `<button type="button" class="btn small" data-online-search title="Bei IGDB suchen" style="height:30px">${icon('search')}Online</button>`;
}

/** Plattform-Chips unter dem Plattform-Feld anzeigen */
function showPlatformChips(root, platforms, onChoose) {
  const holder = root.querySelector('[data-platform-chips]');
  if (!holder) return;
  if (!platforms || !platforms.length) { holder.innerHTML = ''; return; }
  holder.innerHTML = `<span class="muted">Erhältlich für:</span>` + platforms.slice(0, 10)
    .map((p) => `<button type="button" class="chip" data-chip="${h(p)}">${h(shortPlatform(p))}</button>`).join('');
  holder.onclick = (e) => {
    const c = e.target.closest('[data-chip]');
    if (c) onChoose(c.dataset.chip);
  };
}

/** Cover aus einer IGDB-Adresse ins Cover-Feld übernehmen */
async function applyOnlineCover(coverField, url, { replace = false } = {}) {
  if (!url || (!replace && coverField.state.cover)) return false;
  coverField.loading(true);
  try {
    const name = await Online.cover(url);
    coverField.set(name);
    return true;
  } catch (err) {
    toast('Cover konnte nicht geladen werden');
    return false;
  } finally {
    coverField.loading(false);
  }
}
