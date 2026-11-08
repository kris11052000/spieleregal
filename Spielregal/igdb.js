// Spielregal – IGDB-Anbindung (läuft im Hauptprozess)
// Doku: https://api-docs.igdb.com – Zugang über einen kostenlosen Twitch-Developer-Account.

const fs = require('fs');

class IgdbError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

// Namen aus IGDB → Namen in Spielregal
const PLATFORM_NAMES = {
  'PC (Microsoft Windows)': 'PC',
  'PlayStation Vita': 'PS Vita',
  'PlayStation Portable': 'PSP',
  'Nintendo GameCube': 'GameCube',
  'Super Nintendo Entertainment System': 'SNES',
  'Nintendo Entertainment System': 'NES',
  'Sega Saturn': 'Saturn',
  'Sega Mega Drive/Genesis': 'Mega Drive',
  'Sega Master System/Mark III': 'Master System',
  'Sega Game Gear': 'Game Gear',
  'Super Famicom': 'SNES',
  'Family Computer': 'NES'
};
const toLocalPlatform = (name) => PLATFORM_NAMES[name] || name || '';
const toIgdbPlatform = (name) => Object.keys(PLATFORM_NAMES).find((k) => PLATFORM_NAMES[k] === name) || name;

const GENRES = {
  'Role-playing (RPG)': 'Rollenspiel', Racing: 'Rennspiel', Sport: 'Sport', Strategy: 'Strategie',
  Platform: 'Jump ’n’ Run', Fighting: 'Beat ’em up', Simulator: 'Simulation',
  "Hack and slash/Beat 'em up": 'Hack & Slay', 'Real Time Strategy (RTS)': 'Echtzeitstrategie',
  'Turn-based strategy (TBS)': 'Rundenstrategie', Tactical: 'Taktik', Music: 'Musik',
  'Card & Board Game': 'Karten- & Brettspiel', 'Point-and-click': 'Point & Click', 'Quiz/Trivia': 'Quiz',
  Adventure: 'Adventure', Shooter: 'Shooter', Puzzle: 'Puzzle', Indie: 'Indie', Arcade: 'Arcade'
};

// Spieltypen (game_type bzw. veraltet category)
const TYPE_BY_ID = ['Main Game', 'DLC', 'Expansion', 'Bundle', 'Standalone Expansion', 'Mod', 'Episode', 'Season',
  'Remake', 'Remaster', 'Expanded Game', 'Port', 'Fork', 'Pack', 'Update'];
const TYPE_INFO = {
  'main game': { group: 'game', label: 'Spiel' },
  'standalone expansion': { group: 'game', label: 'Standalone' },
  remake: { group: 'game', label: 'Remake' },
  remaster: { group: 'game', label: 'Remaster' },
  'expanded game': { group: 'game', label: 'Erweiterte Fassung' },
  port: { group: 'game', label: 'Portierung' },
  dlc: { group: 'dlc', label: 'DLC' },
  expansion: { group: 'dlc', label: 'Erweiterung' },
  pack: { group: 'dlc', label: 'Pack' },
  episode: { group: 'dlc', label: 'Episode' },
  season: { group: 'dlc', label: 'Season' },
  bundle: { group: 'edition', label: 'Bundle / Edition' }
};
function typeOf(g) {
  if (!g) return null;
  let t = g.game_type;
  if (t && typeof t === 'object') t = t.type;
  if (typeof t === 'number') t = TYPE_BY_ID[t];
  if (!t && typeof g.category === 'number') t = TYPE_BY_ID[g.category];
  t = String(t || 'Main Game').toLowerCase();
  return TYPE_INFO[t] || null; // null = Mod, Fork, Update … ausblenden
}

const USK_VALUES = ['0', '6', '12', '16', '18'];
const OLD_USK = { 18: '0', 19: '6', 20: '12', 21: '16', 22: '18' };
function uskFrom(ratings) {
  for (const r of ratings || []) {
    if (!r || typeof r !== 'object') continue;
    const org = r.organization;
    const orgName = org && typeof org === 'object' ? String(org.name || '') : '';
    const isUsk = org === 4 || /usk/i.test(orgName) || r.category === 4;
    const cat = r.rating_category;
    const label = cat && typeof cat === 'object' ? String(cat.rating || '') : '';
    if (label && (isUsk || /usk/i.test(label))) {
      const m = label.match(/\d+/);
      if (m && USK_VALUES.includes(m[0])) return m[0];
    }
    if (r.category === 4 && OLD_USK[r.rating]) return OLD_USK[r.rating];
  }
  return '';
}

const image = (id, size) => (id ? `https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg` : '');
const isoFromUnix = (s) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : '');
const quote = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const yearOf = (dates) => {
  const ys = (dates || []).map((d) => d && d.date).filter(Boolean).map((s) => new Date(s * 1000).getUTCFullYear());
  return ys.length ? Math.min(...ys) : null;
};

function createIgdb({ configFile, fetchImpl }) {
  let token = null;
  let nextSlot = 0;
  const prunedFields = new Map();
  let platformIds = null;

  const loadConfig = () => {
    try { return JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (_) { return {}; }
  };

  function saveConfig({ clientId, clientSecret }) {
    const cur = loadConfig();
    const next = { clientId: String(clientId || '').trim(), clientSecret: clientSecret === undefined ? cur.clientSecret : String(clientSecret || '').trim() };
    fs.writeFileSync(configFile, JSON.stringify(next, null, 1), { encoding: 'utf8', mode: 0o600 });
    token = null;
    platformIds = null;
    return { clientId: next.clientId, hasSecret: !!next.clientSecret };
  }

  function publicConfig() {
    const c = loadConfig();
    return { clientId: c.clientId || '', hasSecret: !!c.clientSecret };
  }

  async function getToken(cfg) {
    if (!cfg.clientId || !cfg.clientSecret) throw new IgdbError('setup', 'IGDB ist noch nicht eingerichtet (Einstellungen → Online-Daten).');
    if (token && token.clientId === cfg.clientId && token.expires > Date.now() + 60000) return token.value;
    let res;
    try {
      res = await fetchImpl('https://id.twitch.tv/oauth2/token?client_id=' + encodeURIComponent(cfg.clientId)
        + '&client_secret=' + encodeURIComponent(cfg.clientSecret) + '&grant_type=client_credentials', { method: 'POST' });
    } catch (_) {
      throw new IgdbError('network', 'Keine Verbindung zu Twitch – Internetverbindung prüfen.');
    }
    if (!res.ok) throw new IgdbError('auth', 'Anmeldung fehlgeschlagen – Client-ID oder Client-Secret prüfen.');
    const j = await res.json();
    token = { value: j.access_token, expires: Date.now() + (Number(j.expires_in) || 3600) * 1000, clientId: cfg.clientId };
    return token.value;
  }

  // max. 4 Anfragen pro Sekunde
  async function throttle() {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + 260;
    if (slot > now) await sleep(slot - now);
  }

  async function request(endpoint, body) {
    const cfg = loadConfig();
    let lastStatus = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
      const t = await getToken(cfg);
      await throttle();
      let res;
      try {
        res = await fetchImpl('https://api.igdb.com/v4/' + endpoint, {
          method: 'POST',
          headers: { 'Client-ID': cfg.clientId, Authorization: 'Bearer ' + t, Accept: 'application/json', 'Content-Type': 'text/plain' },
          body
        });
      } catch (_) {
        throw new IgdbError('network', 'Keine Verbindung zu IGDB – Internetverbindung prüfen.');
      }
      if (res.ok) return res.json();
      lastStatus = res.status;
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) { token = null; if (attempt < 1) continue; throw new IgdbError('auth', 'IGDB lehnt den Zugang ab – Zugangsdaten prüfen.'); }
      if (res.status === 429 || res.status >= 500) { await sleep(800 * (attempt + 1)); continue; }
      throw new IgdbError('http', 'IGDB-Fehler ' + res.status, { status: res.status, body: text });
    }
    throw new IgdbError('http', 'IGDB antwortet gerade nicht (' + lastStatus + '). Bitte später erneut versuchen.');
  }

  /** Fragt Felder ab und entfernt automatisch Felder, die IGDB (nicht mehr) kennt. */
  async function query(key, endpoint, fields, rest) {
    let list = prunedFields.get(key) || fields.slice();
    for (let round = 0; round < 10; round++) {
      try {
        const data = await request(endpoint, `fields ${list.join(',')}; ${rest}`);
        prunedFields.set(key, list);
        return data;
      } catch (err) {
        if (err.status !== 400 || !err.body) throw err;
        const text = err.body;
        let bad = list.filter((f) => text.includes(f));
        if (!bad.length) bad = list.filter((f) => f.split('.').some((seg) => text.includes(`'${seg}'`) || text.includes(`"${seg}"`) || text.includes(` ${seg} `)));
        bad = bad.filter((f) => f !== 'name');
        if (!bad.length) throw new IgdbError('http', 'IGDB hat die Anfrage abgelehnt.', { body: text });
        list = list.filter((f) => !bad.includes(f));
      }
    }
    throw new IgdbError('http', 'IGDB hat die Anfrage abgelehnt.');
  }

  function normalizeGame(g) {
    const companies = g.involved_companies || [];
    const names = (pred) => [...new Set(companies.filter(pred).map((c) => c.company && c.company.name).filter(Boolean))].slice(0, 2).join(', ');
    const genres = (g.genres || []).map((x) => GENRES[x.name] || x.name).filter(Boolean);
    const series = (g.collections && g.collections[0] && g.collections[0].name)
      || (g.collection && g.collection.name) || (g.franchises && g.franchises[0] && g.franchises[0].name) || '';
    const type = typeOf(g) || { group: 'game', label: 'Spiel' };
    return {
      igdbId: g.id,
      title: g.name || '',
      year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
      releaseDate: isoFromUnix(g.first_release_date),
      publisher: names((c) => c.publisher),
      developer: names((c) => c.developer),
      genre: genres.slice(0, 2).join(' / '),
      series,
      usk: uskFrom(g.age_ratings),
      platforms: (g.platforms || []).map((p) => toLocalPlatform(p.name)).filter(Boolean),
      type: type.label,
      group: type.group,
      coverUrl: image(g.cover && g.cover.image_id, 'cover_big'),
      thumbUrl: image(g.cover && g.cover.image_id, 'cover_small')
    };
  }

  const GAME_FIELDS = ['name', 'first_release_date', 'cover.image_id', 'genres.name', 'franchises.name', 'collections.name',
    'collection.name', 'involved_companies.company.name', 'involved_companies.publisher', 'involved_companies.developer',
    'platforms.name', 'age_ratings.organization.name', 'age_ratings.rating_category.rating', 'age_ratings.category',
    'age_ratings.rating', 'game_type.type', 'category', 'parent_game.name', 'total_rating_count'];

  async function searchGames(text) {
    const q = String(text || '').trim();
    if (q.length < 2) return [];
    const rows = await query('games', 'games', GAME_FIELDS, `search ${quote(q)}; limit 20;`);
    return rows.map((g) => ({ g, t: typeOf(g) }))
      .filter((x) => x.t) // keine Mods/Updates
      .map((x) => normalizeGame(x.g))
      .slice(0, 12);
  }

  async function searchPlatforms(text) {
    const q = String(text || '').trim();
    if (q.length < 2) return [];
    const rows = await query('platforms', 'platforms',
      ['name', 'abbreviation', 'alternative_name', 'generation', 'summary', 'platform_family.name', 'platform_logo.image_id',
        'versions.name', 'versions.summary', 'versions.platform_logo.image_id', 'versions.platform_version_release_dates.date',
        'versions.main_manufacturer.company.name', 'versions.storage', 'versions.memory'],
      `search ${quote(q)}; limit 10;`);
    return rows.map((p) => {
      const logo = image(p.platform_logo && p.platform_logo.image_id, 'logo_med');
      return {
        igdbId: p.id,
        name: toLocalPlatform(p.name),
        platform: toLocalPlatform(p.name),
        abbreviation: p.abbreviation || '',
        family: (p.platform_family && p.platform_family.name) || '',
        generation: p.generation || null,
        logoUrl: logo,
        summary: p.summary || '',
        year: yearOf(((p.versions || []).find((v) => v && (v.name === 'Initial version' || v.name === p.name)) || {}).platform_version_release_dates),
        versions: (p.versions || [])
          .filter((v) => v && v.name && v.name !== p.name && v.name !== 'Initial version')
          .map((v) => ({
            name: v.name,
            logoUrl: image(v.platform_logo && v.platform_logo.image_id, 'logo_med') || logo,
            summary: v.summary || '',
            year: yearOf(v.platform_version_release_dates),
            manufacturer: (v.main_manufacturer && v.main_manufacturer.company && v.main_manufacturer.company.name) || '',
            storage: v.storage || ''
          }))
      };
    });
  }

  async function resolvePlatformIds() {
    if (platformIds) return platformIds;
    const wanted = ['PlayStation 5', 'PlayStation 4', 'Nintendo Switch 2', 'Nintendo Switch', 'Xbox Series X|S', 'Xbox One', 'PC (Microsoft Windows)'];
    const rows = await query('platformIds', 'platforms', ['name'], `where name = (${wanted.map(quote).join(',')}); limit 50;`);
    platformIds = {};
    for (const r of rows) platformIds[toLocalPlatform(r.name)] = r.id;
    // Fallback auf bekannte IDs
    const known = { 'PlayStation 5': 167, 'PlayStation 4': 48, 'Nintendo Switch': 130, 'Xbox Series X|S': 169, 'Xbox One': 49, PC: 6 };
    for (const [k, v] of Object.entries(known)) if (!platformIds[k]) platformIds[k] = v;
    return platformIds;
  }

  /** Erscheinungstermine im Zeitraum, nach Spiel zusammengefasst */
  async function releases({ from, to, platforms }) {
    const ids = await resolvePlatformIds();
    const byId = Object.fromEntries(Object.entries(ids).map(([n, id]) => [id, n]));
    const wanted = (platforms || []).map((p) => ids[p]).filter(Boolean);
    if (!wanted.length) return [];
    const start = Math.floor(new Date(from + 'T00:00:00Z').getTime() / 1000);
    const end = Math.floor(new Date(to + 'T23:59:59Z').getTime() / 1000);
    const fields = ['date', 'human', 'platform', 'game.name', 'game.cover.image_id', 'game.game_type.type', 'game.category',
      'game.hypes', 'game.follows', 'game.parent_game.name'];
    const all = [];
    for (let page = 0; page < 4; page++) {
      const rows = await query('releases', 'release_dates', fields,
        `where date >= ${start} & date <= ${end} & platform = (${wanted.join(',')}); sort date asc; limit 500; offset ${page * 500};`);
      all.push(...rows);
      if (rows.length < 500) break;
    }
    const games = new Map();
    for (const r of all) {
      const g = r.game;
      if (!g || typeof g !== 'object' || !g.name || !r.date) continue;
      const t = typeOf(g);
      if (!t) continue;
      let e = games.get(g.id);
      if (!e) {
        e = {
          igdbId: g.id, title: g.name, date: isoFromUnix(r.date), platforms: [], type: t.label, group: t.group,
          parent: (g.parent_game && g.parent_game.name) || '',
          hype: (Number(g.hypes) || 0) + (Number(g.follows) || 0),
          coverUrl: image(g.cover && g.cover.image_id, 'cover_big'),
          thumbUrl: image(g.cover && g.cover.image_id, 'cover_small')
        };
        games.set(g.id, e);
      }
      const d = isoFromUnix(r.date);
      if (d < e.date) e.date = d;
      const pName = byId[typeof r.platform === 'object' ? r.platform.id : r.platform];
      if (pName && !e.platforms.includes(pName)) e.platforms.push(pName);
    }
    return [...games.values()].sort((a, b) => a.date.localeCompare(b.date) || b.hype - a.hype);
  }

  async function test() {
    await request('platforms', 'fields name; limit 1;');
    return true;
  }

  return { loadConfig, saveConfig, publicConfig, searchGames, searchPlatforms, releases, test, IgdbError, toIgdbPlatform };
}

module.exports = { createIgdb, IgdbError, uskFrom, typeOf };
