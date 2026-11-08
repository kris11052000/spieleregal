// Spielregal – PSN, Xbox (OpenXBL), eBay-Wertschätzung, Wikipedia-Bilder
// PSN und Xbox sind inoffizielle Schnittstellen und können sich jederzeit ändern.

const fs = require('fs');

class ServiceError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jsonStore(file) {
  return {
    load() { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return {}; } },
    save(obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 1), { encoding: 'utf8', mode: 0o600 }); }
  };
}

/** ISO-8601-Dauer (PT123H45M10S) → Stunden */
function durationHours(s) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/.exec(String(s || ''));
  if (!m) return null;
  const [, d, hh, mm, ss] = m.map((x) => Number(x) || 0);
  return Math.round(((d * 24) + hh + mm / 60 + ss / 3600) * 10) / 10;
}

// =====================================================================
// PlayStation Network
// =====================================================================

const PSN = {
  clientId: '09515159-7237-4370-9b40-3806e67c0891',
  basic: 'MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=',
  redirect: 'com.scee.psxandroid.scecompcall://redirect',
  scope: 'psn:mobile.v2.core psn:clientapp',
  auth: 'https://ca.account.sony.com/api/authz/v3/oauth',
  api: 'https://m.np.playstation.com/api'
};

const PSN_PLATFORM = { PS5: 'PlayStation 5', PS4: 'PlayStation 4', PS3: 'PlayStation 3', PSVITA: 'PS Vita', PSPC: 'PC' };

function createPsn({ configFile, fetchImpl, getNoRedirect }) {
  const store = jsonStore(configFile);
  let access = null;

  async function tokenRequest(params) {
    let res;
    try {
      res = await fetchImpl(PSN.auth + '/token', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + PSN.basic, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...params, token_format: 'jwt' }).toString()
      });
    } catch (_) {
      throw new ServiceError('network', 'Keine Verbindung zu PlayStation – Internet prüfen.');
    }
    if (!res.ok) return null;
    return res.json();
  }

  function remember(t) {
    const now = Date.now();
    access = { token: t.access_token, expires: now + (Number(t.expires_in) || 3600) * 1000 };
    const cfg = store.load();
    cfg.refreshToken = t.refresh_token || cfg.refreshToken;
    cfg.refreshExpires = t.refresh_token_expires_in ? now + Number(t.refresh_token_expires_in) * 1000 : cfg.refreshExpires;
    store.save(cfg);
  }

  /** NPSSO → Zugangstoken (einmalig beim Verbinden) */
  async function connect(npsso) {
    npsso = String(npsso || '').trim();
    // Nutzer kopiert manchmal das ganze JSON {"npsso":"…"}
    const m = /"npsso"\s*:\s*"([^"]+)"/.exec(npsso);
    if (m) npsso = m[1];
    if (!/^[A-Za-z0-9]{40,100}$/.test(npsso)) throw new ServiceError('input', 'Das sieht nicht nach einem gültigen NPSSO-Code aus (64 Zeichen, nur Buchstaben und Ziffern).');
    const url = PSN.auth + '/authorize?' + new URLSearchParams({
      access_type: 'offline', client_id: PSN.clientId, response_type: 'code', scope: PSN.scope, redirect_uri: PSN.redirect
    }).toString();
    let res;
    try {
      res = await getNoRedirect(url, { Cookie: 'npsso=' + npsso });
    } catch (_) {
      throw new ServiceError('network', 'Keine Verbindung zu PlayStation – Internet prüfen.');
    }
    const loc = res.headers.location || '';
    const code = /[?&]code=([^&]+)/.exec(loc);
    if (!code) throw new ServiceError('auth', 'PlayStation hat den NPSSO-Code abgelehnt. Bitte neu anmelden und einen frischen Code holen.');
    const t = await tokenRequest({ code: decodeURIComponent(code[1]), redirect_uri: PSN.redirect, grant_type: 'authorization_code' });
    if (!t || !t.access_token) throw new ServiceError('auth', 'Anmeldung bei PlayStation fehlgeschlagen.');
    remember(t);
    const me = await get('/userProfile/v1/internal/users/me/profiles').catch(() => null);
    const cfg = store.load();
    cfg.onlineId = (me && me.onlineId) || cfg.onlineId || '';
    cfg.connectedAt = new Date().toISOString();
    store.save(cfg);
    return status();
  }

  async function token() {
    if (access && access.expires > Date.now() + 60000) return access.token;
    const cfg = store.load();
    if (!cfg.refreshToken) throw new ServiceError('setup', 'PlayStation ist nicht verbunden (Einstellungen → Konten).');
    const t = await tokenRequest({ refresh_token: cfg.refreshToken, grant_type: 'refresh_token', scope: PSN.scope });
    if (!t || !t.access_token) throw new ServiceError('auth', 'Die PlayStation-Anmeldung ist abgelaufen. Bitte unter Einstellungen → Konten neu verbinden.');
    remember(t);
    return access.token;
  }

  async function get(path) {
    const t = await token();
    let res;
    try {
      res = await fetchImpl(PSN.api + path, { headers: { Authorization: 'Bearer ' + t, 'Accept-Language': 'de-DE', Accept: 'application/json' } });
    } catch (_) {
      throw new ServiceError('network', 'Keine Verbindung zu PlayStation.');
    }
    if (res.status === 401) { access = null; throw new ServiceError('auth', 'PlayStation-Anmeldung abgelaufen – bitte neu verbinden.'); }
    if (!res.ok) throw new ServiceError('http', 'PlayStation-Fehler ' + res.status);
    return res.json();
  }

  async function titles() {
    const list = [];
    for (let offset = 0; offset < 4000; offset += 800) {
      const r = await get(`/trophy/v1/users/me/trophyTitles?limit=800&offset=${offset}`);
      list.push(...(r.trophyTitles || []));
      if (!r.nextOffset || (r.trophyTitles || []).length < 800) break;
    }
    // Spielzeit aus der Spieleliste (nur PS4/PS5)
    const played = [];
    try {
      for (let offset = 0; offset < 2000; offset += 200) {
        const r = await get(`/gamelist/v2/users/me/titles?categories=ps4_game,ps5_native_game&limit=200&offset=${offset}`);
        played.push(...(r.titles || []));
        if (!r.nextOffset || (r.titles || []).length < 200) break;
      }
    } catch (_) { /* Spielzeit ist optional */ }
    const norm = (s) => String(s || '').toLowerCase().replace(/[™®©]/g, '').replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    const byName = new Map(played.map((p) => [norm(p.name || p.localizedName), p]));

    return list.map((t) => {
      const plats = String(t.trophyTitlePlatform || '').split(',').map((p) => PSN_PLATFORM[p.trim()]).filter(Boolean);
      const play = byName.get(norm(t.trophyTitleName));
      const def = t.definedTrophies || {};
      const earned = t.earnedTrophies || {};
      return {
        source: 'psn',
        id: t.npCommunicationId,
        service: t.npServiceName || (plats.includes('PlayStation 5') ? 'trophy2' : 'trophy'),
        name: String(t.trophyTitleName || '').replace(/[™®]/g, '').trim(),
        platforms: plats,
        icon: t.trophyTitleIconUrl || '',
        progress: Number(t.progress) || 0,
        earned: { platinum: earned.platinum || 0, gold: earned.gold || 0, silver: earned.silver || 0, bronze: earned.bronze || 0 },
        defined: { platinum: def.platinum || 0, gold: def.gold || 0, silver: def.silver || 0, bronze: def.bronze || 0 },
        lastPlayed: (play && play.lastPlayedDateTime) || t.lastUpdatedDateTime || '',
        playtime: play ? durationHours(play.playDuration) : null
      };
    });
  }

  async function trophies(id, service) {
    const svc = service === 'trophy2' ? 'trophy2' : 'trophy';
    const [defs, mine] = await Promise.all([
      get(`/trophy/v1/npCommunicationIds/${encodeURIComponent(id)}/trophyGroups/all/trophies?npServiceName=${svc}`),
      get(`/trophy/v1/users/me/npCommunicationIds/${encodeURIComponent(id)}/trophyGroups/all/trophies?npServiceName=${svc}`)
    ]);
    const earned = new Map((mine.trophies || []).map((t) => [t.trophyId, t]));
    return (defs.trophies || []).map((t) => {
      const e = earned.get(t.trophyId) || {};
      return {
        id: 'psn:' + t.trophyId,
        name: t.trophyName || (t.trophyHidden ? 'Geheime Trophäe' : 'Trophäe ' + t.trophyId),
        detail: t.trophyDetail || '',
        kind: t.trophyType || 'bronze',
        done: !!e.earned,
        hidden: !!t.trophyHidden
      };
    });
  }

  function status() {
    const cfg = store.load();
    const valid = !!cfg.refreshToken && (!cfg.refreshExpires || cfg.refreshExpires > Date.now());
    return { connected: valid, onlineId: cfg.onlineId || '', expires: cfg.refreshExpires || null };
  }

  function disconnect() { access = null; store.save({}); return status(); }

  return { connect, titles, trophies, status, disconnect };
}

// =====================================================================
// Xbox über OpenXBL (xbl.io)
// =====================================================================

function xboxPlatform(devices) {
  const d = (devices || []).map(String);
  const out = [];
  if (d.some((x) => /XboxSeries|Scarlett/i.test(x))) out.push('Xbox Series X|S');
  if (d.some((x) => /^XboxOne$|Durango/i.test(x))) out.push('Xbox One');
  if (d.some((x) => /Xbox360/i.test(x))) out.push('Xbox 360');
  if (d.some((x) => /^PC$|Win32/i.test(x))) out.push('PC');
  return out;
}

function createXbox({ configFile, fetchImpl }) {
  const store = jsonStore(configFile);

  async function get(path, key) {
    key = key || store.load().apiKey;
    if (!key) throw new ServiceError('setup', 'Xbox ist nicht verbunden (Einstellungen → Konten).');
    let res;
    try {
      res = await fetchImpl('https://xbl.io/api/v2' + path, {
        headers: { 'X-Authorization': key, Accept: 'application/json', 'Accept-Language': 'de-DE' }
      });
    } catch (_) {
      throw new ServiceError('network', 'Keine Verbindung zu OpenXBL.');
    }
    if (res.status === 401 || res.status === 403) throw new ServiceError('auth', 'OpenXBL lehnt den API-Schlüssel ab.');
    if (res.status === 429) throw new ServiceError('limit', 'OpenXBL-Limit erreicht (150 Anfragen pro Stunde). Bitte später erneut versuchen.');
    if (!res.ok) throw new ServiceError('http', 'OpenXBL-Fehler ' + res.status);
    return res.json();
  }

  async function connect(key) {
    key = String(key || '').trim();
    if (key.length < 20) throw new ServiceError('input', 'Bitte den API-Schlüssel von xbl.io einfügen.');
    const me = await get('/account', key);
    const user = (me && (me.profileUsers || [])[0]) || {};
    const setting = (n) => ((user.settings || []).find((s) => s.id === n) || {}).value || '';
    store.save({ apiKey: key, gamertag: setting('Gamertag') || setting('GameDisplayName') || '', connectedAt: new Date().toISOString() });
    return status();
  }

  async function titles() {
    const r = await get('/achievements');
    return (r.titles || []).map((t) => {
      const a = t.achievement || {};
      return {
        source: 'xbox',
        id: String(t.titleId),
        name: String(t.name || '').replace(/[™®]/g, '').trim(),
        platforms: xboxPlatform(t.devices),
        icon: t.displayImage || '',
        progress: Number(a.progressPercentage) || 0,
        earned: { achievements: a.currentAchievements || 0, gamerscore: a.currentGamerscore || 0 },
        defined: { achievements: a.totalAchievements || 0, gamerscore: a.totalGamerscore || 0 },
        lastPlayed: (t.titleHistory && t.titleHistory.lastTimePlayed) || '',
        playtime: null
      };
    }).filter((t) => t.defined.achievements > 0 || t.lastPlayed);
  }

  async function trophies(titleId) {
    const r = await get('/achievements/title/' + encodeURIComponent(titleId));
    return (r.achievements || []).map((a) => {
      const gs = ((a.rewards || []).find((x) => x.type === 'Gamerscore') || {}).value;
      return {
        id: 'xbox:' + a.id,
        name: a.name || 'Erfolg',
        detail: a.description || a.lockedDescription || '',
        kind: gs ? gs + 'G' : 'erfolg',
        done: a.progressState === 'Achieved',
        hidden: !!a.isSecret
      };
    });
  }

  function status() {
    const cfg = store.load();
    return { connected: !!cfg.apiKey, gamertag: cfg.gamertag || '' };
  }

  function disconnect() { store.save({}); return status(); }

  return { connect, titles, trophies, status, disconnect };
}

// =====================================================================
// eBay: Wert aus aktuellen Angeboten schätzen (Browse API, ebay.de)
// =====================================================================

function createEbay({ configFile, fetchImpl }) {
  const store = jsonStore(configFile);
  let token = null;

  async function getToken(cfg) {
    if (!cfg.appId || !cfg.certId) throw new ServiceError('setup', 'eBay ist nicht eingerichtet (Einstellungen → Preise).');
    if (token && token.appId === cfg.appId && token.expires > Date.now() + 60000) return token.value;
    let res;
    try {
      res = await fetchImpl('https://api.ebay.com/identity/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(cfg.appId + ':' + cfg.certId).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope')
      });
    } catch (_) {
      throw new ServiceError('network', 'Keine Verbindung zu eBay.');
    }
    if (!res.ok) throw new ServiceError('auth', 'eBay lehnt die Zugangsdaten ab – App ID und Cert ID (Production) prüfen.');
    const j = await res.json();
    token = { value: j.access_token, expires: Date.now() + (Number(j.expires_in) || 7200) * 1000, appId: cfg.appId };
    return token.value;
  }

  /**
   * Schätzt den Marktwert aus aktuellen Sofortkauf-Angeboten auf ebay.de.
   * condition: 'new' | 'used'
   */
  async function estimate({ query, condition }) {
    const cfg = store.load();
    const t = await getToken(cfg);
    const conditionIds = condition === 'new' ? '1000' : '3000|2750|4000|5000|6000';
    const params = new URLSearchParams({
      q: query,
      limit: '60',
      filter: `buyingOptions:{FIXED_PRICE},conditionIds:{${conditionIds}},itemLocationCountry:DE,priceCurrency:EUR`
    });
    let res;
    try {
      res = await fetchImpl('https://api.ebay.com/buy/browse/v1/item_summary/search?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + t, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_DE', 'Accept-Language': 'de-DE' }
      });
    } catch (_) {
      throw new ServiceError('network', 'Keine Verbindung zu eBay.');
    }
    if (!res.ok) throw new ServiceError('http', 'eBay-Fehler ' + res.status);
    const j = await res.json();
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const prices = (j.itemSummaries || [])
      // Angebote, die nicht zum Titel passen, aussortieren
      .filter((i) => {
        const title = String(i.title || '').toLowerCase();
        return words.filter((w) => title.includes(w)).length >= Math.ceil(words.length * 0.6)
          && !/(nur hülle|ohne spiel|leerhülle|nur cover|defekt|bastler)/.test(title);
      })
      .map((i) => Number(i.price && i.price.value))
      .filter((p) => Number.isFinite(p) && p > 0)
      .sort((a, b) => a - b);
    if (prices.length < 3) {
      return { value: null, count: prices.length, low: prices[0] || null, high: prices.at(-1) || null };
    }
    const cut = Math.floor(prices.length * 0.2);
    const core = prices.slice(cut, prices.length - cut);
    const mid = Math.floor(core.length / 2);
    const median = core.length % 2 ? core[mid] : (core[mid - 1] + core[mid]) / 2;
    return { value: Math.round(median * 100) / 100, count: prices.length, low: core[0], high: core.at(-1) };
  }

  function saveConfig({ appId, certId }) {
    const cur = store.load();
    store.save({ appId: String(appId ?? cur.appId ?? '').trim(), certId: certId === undefined ? cur.certId : String(certId).trim() });
    token = null;
    return status();
  }

  function status() {
    const c = store.load();
    return { appId: c.appId || '', hasCert: !!c.certId, configured: !!(c.appId && c.certId) };
  }

  async function test() {
    await getToken(store.load());
    return true;
  }

  return { estimate, saveConfig, status, test };
}

// =====================================================================
// Wikipedia: Produktfoto für Konsolen
// =====================================================================

async function wikipediaImage(fetchImpl, names) {
  for (const lang of ['de', 'en']) {
    for (const name of names.filter(Boolean)) {
      try {
        const res = await fetchImpl(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`, {
          headers: { Accept: 'application/json', 'Api-User-Agent': 'Spielregal/0.3 (Sammlungsverwaltung)' }
        });
        if (!res.ok) continue;
        const j = await res.json();
        const orig = j.originalimage || {};
        const thumb = j.thumbnail || {};
        let src = '';
        if (orig.source && (orig.width || 0) <= 1600) src = orig.source;
        else if (thumb.source && (orig.width || 0) >= 800) src = thumb.source.replace(/\/(\d+)px-/, '/800px-');
        else src = thumb.source || orig.source || '';
        if (src && /upload\.wikimedia\.org/.test(src) && !/logo|\.svg/i.test(src)) return src;
      } catch (_) { /* nächster Versuch */ }
      await sleep(50);
    }
  }
  return '';
}

module.exports = { createPsn, createXbox, createEbay, wikipediaImage, durationHours, xboxPlatform, ServiceError };
