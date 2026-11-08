// Spielregal – Hauptprozess (Fenster, Dateien, Druck)
const { app, BrowserWindow, ipcMain, dialog, nativeImage, protocol, net, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const crypto = require('crypto');
const { createIgdb } = require('./igdb');

const isMac = process.platform === 'darwin';

// Covers werden als Dateien gespeichert und über cover://img/<datei> geladen
protocol.registerSchemesAsPrivileged([
  { scheme: 'cover', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

const paths = {
  get data() { return app.getPath('userData'); },
  get db() { return path.join(this.data, 'spielregal.json'); },
  get covers() { return path.join(this.data, 'covers'); }
};

function ensureDirs() {
  fs.mkdirSync(paths.covers, { recursive: true });
}

// ---------- Datenbank (JSON) ----------

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(paths.db, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Beschädigte Datei sichern, Backup versuchen
      try { fs.copyFileSync(paths.db, paths.db + '.defekt-' + Date.now()); } catch (_) {}
      try { return JSON.parse(fs.readFileSync(paths.db + '.bak', 'utf8')); } catch (_) {}
    }
    return null;
  }
}

function saveDb(data) {
  const json = JSON.stringify(data, null, 1);
  const tmp = paths.db + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  if (fs.existsSync(paths.db)) fs.copyFileSync(paths.db, paths.db + '.bak');
  fs.renameSync(tmp, paths.db);
  return true;
}

// ---------- Cover ----------

function safeCoverPath(name) {
  if (typeof name !== 'string' || !/^[a-f0-9-]+\.jpg$/i.test(name)) return null;
  return path.join(paths.covers, name);
}

function saveCoverFromImage(image) {
  if (!image || image.isEmpty()) return null;
  const { width, height } = image.getSize();
  const max = 900;
  if (width > max || height > max) {
    image = width >= height
      ? image.resize({ width: max, quality: 'best' })
      : image.resize({ height: max, quality: 'best' });
  }
  const name = crypto.randomUUID() + '.jpg';
  fs.writeFileSync(path.join(paths.covers, name), image.toJPEG(86));
  return name;
}

// ---------- Etiketten: PDF & Druck ----------

const MM_PER_INCH = 25.4;

async function withLabelWindow(html, fn) {
  // Über eine Temp-Datei laden (data:-URLs sind für viele Etiketten zu lang)
  const file = path.join(app.getPath('temp'), `spielregal-etiketten-${Date.now()}.html`);
  fs.writeFileSync(file, html, 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  try {
    await win.loadFile(file);
    return await fn(win);
  } finally {
    if (!win.isDestroyed()) win.destroy();
    fs.rm(file, { force: true }, () => {});
  }
}

function pageSizeFor(layout) {
  return layout === 'single'
    ? { width: 60 / MM_PER_INCH, height: 30 / MM_PER_INCH }
    : 'A4';
}

// ---------- Fenster ----------

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 980,
    minHeight: 620,
    title: 'Spielregal',
    backgroundColor: '#f5f5f7',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    autoHideMenuBar: !isMac,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Externe Links im Standardbrowser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
}

function buildMenu() {
  const send = (cmd) => () => mainWindow && mainWindow.webContents.send('menu', cmd);
  const template = [
    ...(isMac ? [{ role: 'appMenu', label: 'Spielregal', submenu: [
      { role: 'about', label: 'Über Spielregal' },
      { type: 'separator' },
      { label: 'Einstellungen …', accelerator: 'Cmd+,', click: send('settings') },
      { type: 'separator' },
      { role: 'hide', label: 'Spielregal ausblenden' },
      { role: 'hideOthers', label: 'Andere ausblenden' },
      { type: 'separator' },
      { role: 'quit', label: 'Spielregal beenden' }
    ] }] : []),
    { label: 'Ablage', submenu: [
      { label: 'Neuer Eintrag', accelerator: 'CmdOrCtrl+N', click: send('new') },
      { type: 'separator' },
      { label: 'Sicherung exportieren …', click: send('export') },
      { label: 'Sicherung importieren …', click: send('import') },
      ...(isMac ? [] : [{ type: 'separator' }, { label: 'Einstellungen …', accelerator: 'Ctrl+,', click: send('settings') }, { role: 'quit', label: 'Beenden' }])
    ] },
    { label: 'Bearbeiten', submenu: [
      { role: 'undo', label: 'Widerrufen' }, { role: 'redo', label: 'Wiederholen' }, { type: 'separator' },
      { role: 'cut', label: 'Ausschneiden' }, { role: 'copy', label: 'Kopieren' }, { role: 'paste', label: 'Einfügen' },
      { role: 'selectAll', label: 'Alles auswählen' },
      { type: 'separator' },
      { label: 'Suchen', accelerator: 'CmdOrCtrl+F', click: send('find') }
    ] },
    { label: 'Darstellung', submenu: [
      { label: 'Übersicht', accelerator: 'CmdOrCtrl+1', click: send('view:overview') },
      { label: 'Bibliothek', accelerator: 'CmdOrCtrl+2', click: send('view:library') },
      { label: 'Konsolen', accelerator: 'CmdOrCtrl+3', click: send('view:consoles') },
      { label: 'Wunschliste', accelerator: 'CmdOrCtrl+4', click: send('view:wishlist') },
      { label: 'Release-Kalender', accelerator: 'CmdOrCtrl+5', click: send('view:calendar') },
      { label: 'Etiketten', accelerator: 'CmdOrCtrl+6', click: send('view:labels') },
      { type: 'separator' },
      { role: 'reload', label: 'Neu laden' },
      { role: 'toggleDevTools', label: 'Entwicklerwerkzeuge' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Originalgröße' }, { role: 'zoomIn', label: 'Vergrößern' }, { role: 'zoomOut', label: 'Verkleinern' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Vollbild' }
    ] },
    { role: 'windowMenu', label: 'Fenster' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC ----------

function registerIpc() {
  ipcMain.handle('db:load', () => loadDb());
  ipcMain.handle('db:save', (_e, data) => saveDb(data));
  ipcMain.handle('app:info', () => ({ dataPath: paths.data, platform: process.platform, version: app.getVersion() }));
  ipcMain.handle('app:openDataFolder', () => shell.openPath(paths.data));

  ipcMain.handle('cover:fromDataUrl', (_e, dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
    return saveCoverFromImage(nativeImage.createFromDataURL(dataUrl));
  });

  ipcMain.handle('cover:choose', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Cover auswählen',
      properties: ['openFile'],
      filters: [{ name: 'Bilder', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic'] }]
    });
    if (res.canceled || !res.filePaths[0]) return null;
    return saveCoverFromImage(nativeImage.createFromPath(res.filePaths[0]));
  });

  ipcMain.handle('cover:delete', (_e, name) => {
    const p = safeCoverPath(name);
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  });

  ipcMain.handle('labels:pdf', async (_e, { html, layout, name }) => {
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Etiketten als PDF sichern',
      defaultPath: (name || 'Etiketten') + '.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (res.canceled || !res.filePath) return false;
    const pdf = await withLabelWindow(html, (win) => win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: pageSizeFor(layout),
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    }));
    fs.writeFileSync(res.filePath, pdf);
    shell.showItemInFolder(res.filePath);
    return true;
  });

  ipcMain.handle('labels:print', async (_e, { html, layout }) => {
    return withLabelWindow(html, (win) => new Promise((resolve) => {
      win.webContents.print({
        silent: false,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: layout === 'single' ? { width: 60000, height: 30000 } : 'A4'
      }, (success) => resolve(success));
    }));
  });

  ipcMain.handle('backup:export', async (_e, data) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Sicherung exportieren',
      defaultPath: `Spielregal-Sicherung-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (res.canceled || !res.filePath) return null;
    // Cover als Base64 einbetten, damit die Datei vollständig ist
    const covers = {};
    for (const list of [data.games, data.consoles, data.wishlist]) {
      for (const item of list || []) {
        const p = safeCoverPath(item.cover);
        if (p && fs.existsSync(p) && !covers[item.cover]) covers[item.cover] = fs.readFileSync(p).toString('base64');
      }
    }
    fs.writeFileSync(res.filePath, JSON.stringify({ ...data, covers, exportedAt: new Date().toISOString() }, null, 1), 'utf8');
    return res.filePath;
  });

  ipcMain.handle('backup:import', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Sicherung importieren',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const parsed = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
    const covers = parsed.covers || {};
    for (const [name, b64] of Object.entries(covers)) {
      const p = safeCoverPath(name);
      if (p && !fs.existsSync(p)) fs.writeFileSync(p, Buffer.from(b64, 'base64'));
    }
    delete parsed.covers;
    return parsed;
  });

  ipcMain.handle('shell:openExternal', (_e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  // ---------- Online-Daten (IGDB) ----------
  const igdb = createIgdb({
    configFile: path.join(paths.data, 'igdb.json'),
    fetchImpl: (...args) => (net.fetch ? net.fetch(...args) : fetch(...args))
  });
  // Ergebnis immer als { ok, data } bzw. { ok:false, code, message }
  const wrap = (fn) => async (_e, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      return { ok: false, code: err.code || 'error', message: err.message || String(err) };
    }
  };
  ipcMain.handle('igdb:getConfig', () => igdb.publicConfig());
  ipcMain.handle('igdb:setConfig', (_e, cfg) => igdb.saveConfig(cfg || {}));
  ipcMain.handle('igdb:test', wrap(() => igdb.test()));
  ipcMain.handle('igdb:searchGames', wrap((q) => igdb.searchGames(q)));
  ipcMain.handle('igdb:searchPlatforms', wrap((q) => igdb.searchPlatforms(q)));
  ipcMain.handle('igdb:releases', wrap((opts) => igdb.releases(opts || {})));

  ipcMain.handle('cover:fromUrl', wrap(async (url) => {
    if (typeof url !== 'string' || !/^https:\/\/images\.igdb\.com\//.test(url)) throw new Error('Ungültige Bildadresse');
    const res = await (net.fetch ? net.fetch(url) : fetch(url));
    if (!res.ok) throw new Error('Cover konnte nicht geladen werden (' + res.status + ')');
    const buf = Buffer.from(await res.arrayBuffer());
    const name = saveCoverFromImage(nativeImage.createFromBuffer(buf));
    if (!name) throw new Error('Cover konnte nicht gelesen werden');
    return name;
  }));
}

// ---------- Start ----------

app.setName('Spielregal');

app.whenReady().then(() => {
  ensureDirs();
  protocol.handle('cover', (request) => {
    const name = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ''));
    const p = safeCoverPath(name);
    if (!p || !fs.existsSync(p)) return new Response('', { status: 404 });
    return net.fetch(pathToFileURL(p).toString());
  });
  registerIpc();
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (!isMac) app.quit(); });
