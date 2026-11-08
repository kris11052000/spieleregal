/* Datenmodell, Konstanten und Speicher */

const STATUS = {
  backlog:   { label: 'Ungespielt',  icon: 'dashed',  color: 'var(--faint)' },
  active:    { label: 'Am Spielen',  icon: 'play',    color: 'var(--accent)' },
  paused:    { label: 'Pausiert',    icon: 'pause',   color: 'var(--orange)' },
  completed: { label: 'Erledigt',    icon: 'done',    color: 'var(--green)' },
  abandoned: { label: 'Abgebrochen', icon: 'xcircle', color: 'var(--muted)' }
};

const CONDITION = {
  sealed:  { label: 'Versiegelt (Sealed)',          short: 'SEALED',  color: '#8b5cf6' },
  cib:     { label: 'Komplett (CIB)',               short: 'CIB',     color: '#2f9e55' },
  boxed:   { label: 'OVP ohne Anleitung',           short: 'OVP',     color: '#0e9aa7' },
  loose:   { label: 'Lose (nur Disc/Modul/Gerät)',  short: 'LOSE',    color: '#e08a1e' },
  digital: { label: 'Digital',                      short: 'DIGITAL', color: '#3b82f6' },
  damaged: { label: 'Beschädigt',                   short: 'DEFEKT',  color: '#e0453a' }
};

const EDITION = {
  standard:   { label: 'Standard',            short: '' },
  special:    { label: 'Special Edition',     short: 'SPECIAL' },
  limited:    { label: 'Limited Edition',     short: 'LIMITED' },
  collectors: { label: "Collector's Edition", short: "COLLECTOR'S" },
  steelbook:  { label: 'Steelbook',           short: 'STEELBOOK' },
  goty:       { label: 'GOTY / Complete',     short: 'GOTY' },
  bundle:     { label: 'Bundle',              short: 'BUNDLE' }
};

const FORMAT = {
  physical: { label: 'Physisch', short: 'PHYSISCH' },
  digital:  { label: 'Digital',  short: 'DIGITAL' }
};

const STORES = ['PlayStation Store', 'PlayStation Plus', 'Microsoft Store', 'Game Pass', 'Nintendo eShop', 'Steam',
  'Epic Games', 'GOG', 'EA app', 'Ubisoft Connect', 'Battle.net', 'Sonstige'];

const ACCESSORY_TYPES = {
  controller: { label: 'Controller', group: 'hardware', icon: 'gamepad' },
  headset:    { label: 'Headset / Audio', group: 'hardware', icon: 'headphones' },
  vr:         { label: 'VR / Kamera', group: 'hardware', icon: 'disc' },
  charging:   { label: 'Ladestation / Akku', group: 'hardware', icon: 'plug' },
  storage:    { label: 'Speicher / Karte', group: 'hardware', icon: 'layers' },
  cable:      { label: 'Kabel / Adapter', group: 'hardware', icon: 'plug' },
  hwother:    { label: 'Sonstige Hardware', group: 'hardware', icon: 'box' },
  amiibo:     { label: 'amiibo / Toys-to-Life', group: 'collectible', icon: 'star' },
  figure:     { label: 'Figur / Statue', group: 'collectible', icon: 'star' },
  steelbook:  { label: 'Steelbook (einzeln)', group: 'collectible', icon: 'box' },
  artbook:    { label: 'Artbook / Buch', group: 'collectible', icon: 'note' },
  soundtrack: { label: 'Soundtrack / Vinyl', group: 'collectible', icon: 'disc' },
  merch:      { label: 'Merchandise / Kleidung', group: 'collectible', icon: 'sparkle' },
  poster:     { label: 'Poster / Druck', group: 'collectible', icon: 'note' },
  other:      { label: 'Sonstiges Sammlerstück', group: 'collectible', icon: 'dots' }
};

const USK = { '': 'Keine Angabe', '0': 'USK 0', '6': 'USK 6', '12': 'USK 12', '16': 'USK 16', '18': 'USK 18' };

const MAINTENANCE = {
  dusting:      { label: 'Ausgeblasen / entstaubt',   short: 'Ausgeblasen', icon: 'wind' },
  isopropyl:    { label: 'Isopropyl-Reinigung',       short: 'Isopropyl',   icon: 'drop' },
  exterior:     { label: 'Gehäuse gereinigt',         short: 'Gehäuse',     icon: 'sparkle' },
  fan:          { label: 'Lüfter gereinigt',          short: 'Lüfter',      icon: 'fan' },
  thermalPaste: { label: 'Wärmeleitpaste erneuert',   short: 'WLP',         icon: 'thermo' },
  thermalPads:  { label: 'Wärmeleitpads erneuert',    short: 'Pads',        icon: 'layers' },
  contacts:     { label: 'Kontakte / Ports gereinigt', short: 'Kontakte',   icon: 'plug' },
  repair:       { label: 'Reparatur',                 short: 'Reparatur',   icon: 'wrench' },
  other:        { label: 'Sonstiges',                 short: 'Sonstiges',   icon: 'dots' }
};

const WISH_KIND = {
  game:      { label: 'Spiel',                 icon: 'disc',       collectible: true },
  limited:   { label: "Limited / Collector's", icon: 'box',        collectible: true },
  console:   { label: 'Konsole',               icon: 'gamepad',    collectible: true },
  dlc:       { label: 'DLC / Erweiterung',     icon: 'puzzle',     collectible: false },
  accessory: { label: 'Zubehör / Sammlerstück', icon: 'headphones', collectible: true }
};

const PRIORITY = {
  high:   { label: 'Hoch',    rank: 2, color: 'var(--red)' },
  normal: { label: 'Mittel',  rank: 1, color: 'var(--orange)' },
  low:    { label: 'Niedrig', rank: 0, color: 'var(--faint)' }
};

const PLATFORM_GROUPS = [
  ['Sony', ['PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation 2', 'PlayStation', 'PS Vita', 'PSP']],
  ['Microsoft', ['Xbox Series X|S', 'Xbox One', 'Xbox 360', 'Xbox']],
  ['Nintendo', ['Nintendo Switch 2', 'Nintendo Switch', 'Wii U', 'Wii', 'GameCube', 'Nintendo 64', 'SNES', 'NES',
    'Nintendo 3DS', 'Nintendo DS', 'Game Boy Advance', 'Game Boy Color', 'Game Boy']],
  ['Sega', ['Dreamcast', 'Saturn', 'Mega Drive', 'Master System', 'Game Gear']],
  ['PC', ['PC', 'Steam Deck']]
];
const ALL_PLATFORMS = PLATFORM_GROUPS.flatMap(([, list]) => list);

function manufacturerFor(platform) {
  const p = String(platform || '').trim();
  if (!p) return '';
  for (const [maker, list] of PLATFORM_GROUPS) {
    if (list.some((x) => x.toLowerCase() === p.toLowerCase())) return maker;
  }
  const l = p.toLowerCase();
  if (l.includes('playstation') || l.startsWith('ps')) return 'Sony';
  if (l.includes('xbox')) return 'Microsoft';
  if (/nintendo|switch|wii|game ?boy|gamecube/.test(l)) return 'Nintendo';
  if (l.includes('sega')) return 'Sega';
  return 'Sonstige';
}

// ---------- Speicher ----------

const Store = {
  data: null,
  saveTimer: null,

  empty() {
    return {
      version: 1,
      settings: { prefixGame: 'SP', prefixConsole: 'KO', prefixAccessory: 'ZB', defaultInterval: 6, amazonTag: '', ebayCampaign: '' },
      games: [], consoles: [], wishlist: [], accessories: [], sync: {}
    };
  },

  async load() {
    const loaded = await window.api.loadDb();
    const base = this.empty();
    this.data = loaded ? { ...base, ...loaded, settings: { ...base.settings, ...(loaded.settings || {}) } } : base;
    for (const key of ['games', 'consoles', 'wishlist', 'accessories']) if (!Array.isArray(this.data[key])) this.data[key] = [];
    if (!this.data.sync || typeof this.data.sync !== 'object') this.data.sync = {};
    // Migration: „Digital“ war früher ein Zustand
    for (const g of this.data.games) {
      if (!g.format) g.format = g.condition === 'digital' ? 'digital' : 'physical';
      if (g.condition === 'digital') g.condition = 'cib';
      if (!Array.isArray(g.checklist)) g.checklist = [];
    }
  },

  /** Speichert sofort oder (bei Reglern) leicht verzögert */
  save(delayed = false) {
    clearTimeout(this.saveTimer);
    if (delayed) {
      this.saveTimer = setTimeout(() => window.api.saveDb(this.data), 400);
    } else {
      return window.api.saveDb(this.data);
    }
  },

  get games() { return this.data.games; },
  get consoles() { return this.data.consoles; },
  get wishlist() { return this.data.wishlist; },
  get accessories() { return this.data.accessories; },
  get settings() { return this.data.settings; },

  find(kind, id) { return this.data[kind].find((x) => x.id === id) || null; },

  upsert(kind, item) {
    const list = this.data[kind];
    const i = list.findIndex((x) => x.id === item.id);
    item.updatedAt = new Date().toISOString();
    if (i >= 0) list[i] = item; else list.push(item);
    this.save();
    return item;
  },

  remove(kind, id) {
    const item = this.find(kind, id);
    this.data[kind] = this.data[kind].filter((x) => x.id !== id);
    if (item && item.cover && !this.coverInUse(item.cover)) window.api.deleteCover(item.cover);
    this.save();
  },

  coverInUse(name) {
    return ['games', 'consoles', 'wishlist', 'accessories'].some((k) => this.data[k].some((x) => x.cover === name));
  },

  // ---------- Inventarnummern ----------

  prefix(type) {
    const s = this.settings;
    const p = String((type === 'console' ? s.prefixConsole : type === 'accessory' ? s.prefixAccessory : s.prefixGame) || '').trim();
    return p || (type === 'console' ? 'KO' : type === 'accessory' ? 'ZB' : 'SP');
  },

  allInventory(excludeId) {
    return [...this.games, ...this.consoles, ...this.accessories]
      .filter((x) => x.id !== excludeId && x.inventory)
      .map((x) => x.inventory);
  },

  nextInventory(type) {
    const prefix = this.prefix(type) + '-';
    let max = 0;
    for (const n of this.allInventory()) {
      if (n.startsWith(prefix)) {
        const v = parseInt(n.slice(prefix.length), 10);
        if (Number.isFinite(v) && v > max) max = v;
      }
    }
    return prefix + String(max + 1).padStart(4, '0');
  },

  inventoryTaken(number, excludeId) {
    const n = String(number || '').trim().toLowerCase();
    return !!n && this.allInventory(excludeId).some((x) => x.toLowerCase() === n);
  },

  /** Ergänzt Einträge aus einer Sicherung (bestehende IDs bleiben unangetastet) */
  merge(imported) {
    let added = 0;
    for (const key of ['games', 'consoles', 'wishlist', 'accessories']) {
      const ids = new Set(this.data[key].map((x) => x.id));
      for (const item of imported[key] || []) {
        if (item && item.id && !ids.has(item.id)) { this.data[key].push(item); added++; }
      }
    }
    this.save();
    return added;
  }
};

// ---------- Neue Einträge ----------

function newGame(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(), title: '', platform: '', publisher: '', developer: '', genre: '', series: '',
    year: null, usk: '', edition: 'standard', editionNote: '', condition: 'cib', format: 'physical', store: '',
    status: 'backlog', progress: 0, progressAuto: false, playtime: null, inventory: '', barcode: '',
    price: null, value: null, valueDate: '', valueNote: '', purchaseDate: '', notes: '', cover: '',
    checklist: [], trophies: null, createdAt: now, updatedAt: now, ...fields
  };
}

function newConsole(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(), name: '', platform: '', model: '', edition: '', serial: '', condition: 'cib',
    inventory: '', price: null, value: null, valueDate: '', purchaseDate: '', interval: Store.settings.defaultInterval ?? 6,
    year: null, summary: '', notes: '', cover: '', maintenance: [], createdAt: now, updatedAt: now, ...fields
  };
}

function newAccessory(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(), name: '', type: 'controller', platform: '', manufacturer: '', edition: '', condition: 'cib',
    inventory: '', price: null, value: null, valueDate: '', purchaseDate: '', linkedGame: '', notes: '', cover: '',
    createdAt: now, updatedAt: now, ...fields
  };
}

/** Wert eines Eintrags: aktueller Wert, sonst Kaufpreis */
function itemValue(x) {
  const v = Number(x && (x.value ?? x.price));
  return Number.isFinite(v) ? v : 0;
}

function collectionValue() {
  const games = Store.games.filter((g) => g.format !== 'digital');
  const all = [...games, ...Store.consoles, ...Store.accessories];
  return {
    current: all.reduce((s, x) => s + itemValue(x), 0),
    purchase: [...Store.games, ...Store.consoles, ...Store.accessories].reduce((s, x) => s + (Number(x.price) || 0), 0),
    estimated: all.filter((x) => x.value != null).length,
    total: all.length
  };
}

function newWish(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(), title: '', platform: '', kind: 'game', priority: 'normal', releaseDate: '',
    targetPrice: null, link: '', notes: '', cover: '', createdAt: now, updatedAt: now, ...fields
  };
}

// ---------- Abgeleitete Werte ----------

const Game = {
  subtitle(g) { return [g.platform, g.year].filter(Boolean).join(' · '); },
  matches(g, q) {
    return [g.title, g.platform, g.publisher, g.developer, g.genre, g.series, g.inventory, g.barcode, g.editionNote, g.store]
      .some((v) => String(v || '').toLowerCase().includes(q));
  },
  facts(g) {
    const f = [];
    const add = (l, v) => { if (v !== null && v !== undefined && v !== '') f.push([l, v]); };
    add('Hersteller', manufacturerFor(g.platform));
    add('Publisher', g.publisher);
    add('Entwickler', g.developer);
    add('Erscheinungsjahr', g.year);
    add('Genre', g.genre);
    add('Reihe', g.series);
    if (g.edition !== 'standard') add('Edition', EDITION[g.edition].label + (g.editionNote ? ' – ' + g.editionNote : ''));
    add('Format', g.format === 'digital' ? 'Digital' + (g.store ? ' – ' + g.store : '') : 'Physisch');
    if (g.format !== 'digital') add('Zustand', CONDITION[g.condition]?.label);
    add('Inventar-Nr.', g.inventory);
    add('Barcode', g.barcode);
    add('Kaufpreis', fmt.euro(g.price));
    add('Kaufdatum', fmt.date(g.purchaseDate));
    if (g.playtime) add('Spielzeit', fmt.num(g.playtime) + ' Std.');
    return f;
  }
};

const Consoles = {
  subtitle(c) { return [c.model, c.edition].filter(Boolean).join(' · ') || manufacturerFor(c.platform || c.name); },
  lastMaintenance(c) {
    return (c.maintenance || []).map((m) => m.date).sort().at(-1) || '';
  },
  nextDue(c) {
    if (!c.interval) return '';
    const base = this.lastMaintenance(c) || c.purchaseDate || (c.createdAt || '').slice(0, 10);
    return base ? addMonths(base, c.interval) : '';
  },
  isDue(c) {
    const due = this.nextDue(c);
    return !!due && due <= isoDate(today());
  },
  statusText(c) {
    const due = this.nextDue(c);
    if (!due) return 'Keine Wartungserinnerung';
    if (this.isDue(c)) return this.lastMaintenance(c) ? `Wartung fällig (${fmt.relative(due)})` : 'Noch keine Wartung erfasst';
    return `Nächste Wartung ${fmt.relative(due)}`;
  },
  matches(c, q) {
    return [c.name, c.platform, c.model, c.edition, c.serial, c.inventory, c.notes]
      .some((v) => String(v || '').toLowerCase().includes(q));
  },
  facts(c) {
    const f = [];
    const add = (l, v) => { if (v !== null && v !== undefined && v !== '') f.push([l, v]); };
    add('Plattform', c.platform);
    add('Hersteller', manufacturerFor(c.platform || c.name));
    add('Modell', c.model);
    add('Edition', c.edition);
    add('Seriennummer', c.serial);
    add('Erschienen', c.year);
    add('Zustand', CONDITION[c.condition]?.label);
    add('Inventar-Nr.', c.inventory);
    add('Kaufpreis', fmt.euro(c.price));
    add('Aktueller Wert', fmt.euro(c.value));
    add('Kaufdatum', fmt.date(c.purchaseDate));
    add('Wartungsintervall', c.interval ? `alle ${c.interval} Monate` : 'aus');
    return f;
  }
};

const Accessories = {
  subtitle(a) {
    return [ACCESSORY_TYPES[a.type]?.label, a.platform, a.edition].filter(Boolean).join(' · ');
  },
  matches(a, q) {
    return [a.name, a.platform, a.manufacturer, a.edition, a.inventory, a.notes, ACCESSORY_TYPES[a.type]?.label]
      .some((v) => String(v || '').toLowerCase().includes(q));
  },
  facts(a) {
    const f = [];
    const add = (l, v) => { if (v !== null && v !== undefined && v !== '') f.push([l, v]); };
    add('Art', ACCESSORY_TYPES[a.type]?.label);
    add('Plattform', a.platform);
    add('Hersteller', a.manufacturer);
    add('Edition / Farbe', a.edition);
    const linked = a.linkedGame && Store.find('games', a.linkedGame);
    add('Gehört zu', linked ? linked.title : '');
    add('Zustand', CONDITION[a.condition]?.label);
    add('Inventar-Nr.', a.inventory);
    add('Kaufpreis', fmt.euro(a.price));
    add('Aktueller Wert', fmt.euro(a.value));
    add('Kaufdatum', fmt.date(a.purchaseDate));
    return f;
  }
};

// ---------- Sortieren & Gruppieren ----------

const SORTS = {
  title: 'Titel', platform: 'Plattform', manufacturer: 'Hersteller', publisher: 'Publisher',
  developer: 'Entwickler', genre: 'Genre', series: 'Spielereihe', year: 'Erscheinungsjahr',
  inventory: 'Inventar-Nr.', progress: 'Fortschritt', value: 'Wert', added: 'Zuletzt hinzugefügt'
};

const GROUPS = {
  off: 'Keine Gruppierung', platform: 'Plattform', manufacturer: 'Hersteller', publisher: 'Publisher',
  developer: 'Entwickler', genre: 'Genre', series: 'Spielereihe', status: 'Status', format: 'Physisch / Digital',
  condition: 'Zustand', year: 'Erscheinungsjahr'
};

function sortValue(g, key) {
  if (key === 'manufacturer') return manufacturerFor(g.platform);
  return g[key] ?? '';
}

function sortGames(list, key) {
  const byTitle = (a, b) => compareText(a.title, b.title);
  return [...list].sort((a, b) => {
    if (key === 'added') return String(b.createdAt).localeCompare(String(a.createdAt));
    if (key === 'progress') return (b.progress - a.progress) || byTitle(a, b);
    if (key === 'value') return (itemValue(b) - itemValue(a)) || byTitle(a, b);
    if (key === 'year') return ((a.year ?? 9999) - (b.year ?? 9999)) || byTitle(a, b);
    const va = String(sortValue(a, key)), vb = String(sortValue(b, key));
    if (va !== vb) {
      if (!va) return 1;
      if (!vb) return -1;
      return compareText(va, vb);
    }
    if (key === 'series') return ((a.year ?? 9999) - (b.year ?? 9999)) || byTitle(a, b);
    return byTitle(a, b);
  });
}

const EMPTY_GROUP = 'Ohne Angabe';

function groupValue(g, key) {
  let v;
  switch (key) {
    case 'manufacturer': v = manufacturerFor(g.platform); break;
    case 'status': v = STATUS[g.status]?.label; break;
    case 'condition': v = g.format === 'digital' ? 'Digital' : CONDITION[g.condition]?.label; break;
    case 'format': v = g.format === 'digital' ? 'Digital' + (g.store ? ' · ' + g.store : '') : 'Physisch'; break;
    case 'year': v = g.year ? String(g.year) : ''; break;
    default: v = g[key];
  }
  v = String(v || '').trim();
  return v || EMPTY_GROUP;
}

function groupGames(list, key) {
  if (key === 'off') return [{ title: '', items: list }];
  const map = new Map();
  for (const g of list) {
    const k = groupValue(g, key);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(g);
  }
  const order = key === 'status' ? Object.values(STATUS).map((s) => s.label)
    : key === 'condition' ? Object.values(CONDITION).map((c) => c.label) : null;
  const keys = [...map.keys()].sort((a, b) => {
    if (a === EMPTY_GROUP) return 1;
    if (b === EMPTY_GROUP) return -1;
    if (order) return order.indexOf(a) - order.indexOf(b);
    if (key === 'year') return b.localeCompare(a);
    return compareText(a, b);
  });
  return keys.map((k) => ({ title: k, items: map.get(k) }));
}

// ---------- Beispieldaten ----------

function insertSampleData() {
  const add = (fields) => {
    const g = newGame(fields);
    g.inventory = Store.nextInventory('game');
    Store.games.push(g);
  };
  add({ title: 'Elden Ring', platform: 'PlayStation 5', publisher: 'Bandai Namco', developer: 'FromSoftware', year: 2022, genre: 'Action-RPG', usk: '16', status: 'active', progress: 62, price: 49.99 });
  add({ title: 'The Last of Us Part II', platform: 'PlayStation 4', publisher: 'Sony Interactive Entertainment', developer: 'Naughty Dog', year: 2020, genre: 'Action-Adventure', series: 'The Last of Us', usk: '18', status: 'completed', progress: 100, edition: 'steelbook', price: 39.99 });
  add({ title: 'Ghost of Tsushima', platform: 'PlayStation 4', publisher: 'Sony Interactive Entertainment', developer: 'Sucker Punch', year: 2020, genre: 'Action-Adventure', usk: '18', status: 'paused', progress: 35, price: 29.99 });
  add({ title: 'Gran Turismo 7', platform: 'PlayStation 5', publisher: 'Sony Interactive Entertainment', developer: 'Polyphony Digital', year: 2022, genre: 'Rennspiel', series: 'Gran Turismo', usk: '0', status: 'backlog', progress: 0, condition: 'sealed', price: 59.99 });
  add({ title: 'The Legend of Zelda: Tears of the Kingdom', platform: 'Nintendo Switch', publisher: 'Nintendo', developer: 'Nintendo EPD', year: 2023, genre: 'Action-Adventure', series: 'The Legend of Zelda', usk: '12', status: 'active', progress: 18, edition: 'collectors', editionNote: 'Steelbook, Artbook, Pins', price: 129.99 });

  const ago = (m) => { const d = today(); d.setMonth(d.getMonth() - m); return isoDate(d); };
  const ps5 = newConsole({ name: 'PlayStation 5', platform: 'PlayStation 5', model: 'CFI-1216A', purchaseDate: ago(14), interval: 6 });
  ps5.inventory = Store.nextInventory('console');
  ps5.maintenance.push({ id: uid(), date: ago(7), kinds: ['dusting', 'exterior'], notes: 'Staubfänger ausgesaugt, Lüfter mit Druckluft ausgeblasen.' });
  Store.consoles.push(ps5);

  Store.wishlist.push(newWish({ title: 'Grand Theft Auto VI', platform: 'PlayStation 5', priority: 'high' }));
  Store.save();
}
