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
  accessory: { label: 'Zubehör',               icon: 'headphones', collectible: false }
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
      settings: { prefixGame: 'SP', prefixConsole: 'KO', defaultInterval: 6 },
      games: [], consoles: [], wishlist: []
    };
  },

  async load() {
    const loaded = await window.api.loadDb();
    const base = this.empty();
    this.data = loaded ? { ...base, ...loaded, settings: { ...base.settings, ...(loaded.settings || {}) } } : base;
    for (const key of ['games', 'consoles', 'wishlist']) if (!Array.isArray(this.data[key])) this.data[key] = [];
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
    return ['games', 'consoles', 'wishlist'].some((k) => this.data[k].some((x) => x.cover === name));
  },

  // ---------- Inventarnummern ----------

  prefix(type) {
    const s = this.settings;
    const p = String((type === 'console' ? s.prefixConsole : s.prefixGame) || '').trim();
    return p || (type === 'console' ? 'KO' : 'SP');
  },

  allInventory(excludeId) {
    return [...this.games, ...this.consoles]
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
    for (const key of ['games', 'consoles', 'wishlist']) {
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
    year: null, usk: '', edition: 'standard', editionNote: '', condition: 'cib',
    status: 'backlog', progress: 0, playtime: null, inventory: '', barcode: '',
    price: null, purchaseDate: '', notes: '', cover: '', createdAt: now, updatedAt: now, ...fields
  };
}

function newConsole(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(), name: '', platform: '', model: '', edition: '', serial: '', condition: 'cib',
    inventory: '', price: null, purchaseDate: '', interval: Store.settings.defaultInterval ?? 6,
    notes: '', cover: '', maintenance: [], createdAt: now, updatedAt: now, ...fields
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
    return [g.title, g.platform, g.publisher, g.developer, g.genre, g.series, g.inventory, g.barcode, g.editionNote]
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
    add('Zustand', CONDITION[g.condition]?.label);
    add('Inventar-Nr.', g.inventory);
    add('Barcode', g.barcode);
    add('Kaufpreis', fmt.euro(g.price));
    add('Kaufdatum', fmt.date(g.purchaseDate));
    if (g.playtime) add('Spielzeit', g.playtime + ' Std.');
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
    add('Zustand', CONDITION[c.condition]?.label);
    add('Inventar-Nr.', c.inventory);
    add('Kaufpreis', fmt.euro(c.price));
    add('Kaufdatum', fmt.date(c.purchaseDate));
    add('Wartungsintervall', c.interval ? `alle ${c.interval} Monate` : 'aus');
    return f;
  }
};

// ---------- Sortieren & Gruppieren ----------

const SORTS = {
  title: 'Titel', platform: 'Plattform', manufacturer: 'Hersteller', publisher: 'Publisher',
  developer: 'Entwickler', genre: 'Genre', series: 'Spielereihe', year: 'Erscheinungsjahr',
  inventory: 'Inventar-Nr.', progress: 'Fortschritt', added: 'Zuletzt hinzugefügt'
};

const GROUPS = {
  off: 'Keine Gruppierung', platform: 'Plattform', manufacturer: 'Hersteller', publisher: 'Publisher',
  developer: 'Entwickler', genre: 'Genre', series: 'Spielereihe', status: 'Status',
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
    case 'condition': v = CONDITION[g.condition]?.label; break;
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
