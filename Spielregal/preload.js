// Sichere Brücke zwischen Oberfläche und Hauptprozess
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadDb: () => ipcRenderer.invoke('db:load'),
  saveDb: (data) => ipcRenderer.invoke('db:save', data),
  appInfo: () => ipcRenderer.invoke('app:info'),
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
  coverFromDataUrl: (dataUrl) => ipcRenderer.invoke('cover:fromDataUrl', dataUrl),
  chooseCover: () => ipcRenderer.invoke('cover:choose'),
  deleteCover: (name) => ipcRenderer.invoke('cover:delete', name),
  coverUrl: (name) => (name ? 'cover://img/' + encodeURIComponent(name) : ''),
  labelsPdf: (html, layout, name) => ipcRenderer.invoke('labels:pdf', { html, layout, name }),
  labelsPrint: (html, layout) => ipcRenderer.invoke('labels:print', { html, layout }),
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onMenu: (fn) => ipcRenderer.on('menu', (_e, cmd) => fn(cmd)),
  platform: process.platform,
  hasNativeMenu: true
});
