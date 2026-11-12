const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileman', {
  listLocalDirectory: (path) => ipcRenderer.invoke('fs:list', path),
  searchLocalShallow: (path, maxDepth) => ipcRenderer.invoke('fs:search', path, maxDepth),
  readThumbnail: (path, maxEdge) => ipcRenderer.invoke('fs:thumbnail', path, maxEdge),
  createLocalDirectory: (path) => ipcRenderer.invoke('fs:mkdir', path),
  createLocalFile: (path, content) => ipcRenderer.invoke('fs:create-file', path, content),
  renameLocalEntry: (from, to) => ipcRenderer.invoke('fs:rename', from, to),
  removeLocalEntry: (path, kind) => ipcRenderer.invoke('fs:remove', path, kind),
  copyLocalEntry: (from, toDir) => ipcRenderer.invoke('fs:copy', from, toDir),
  moveLocalEntry: (from, toDir) => ipcRenderer.invoke('fs:move', from, toDir),
  homeDirectory: () => ipcRenderer.invoke('fs:home'),
  listLocalDrives: () => ipcRenderer.invoke('fs:drives'),
  listFavorites: () => ipcRenderer.invoke('favorites:list'),
  addFavorite: (path, label) => ipcRenderer.invoke('favorites:add', path, label),
  removeFavorite: (path) => ipcRenderer.invoke('favorites:remove', path),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  showItemInFolder: (path) => ipcRenderer.invoke('shell:showItem', path),
  openWith: (path, app) => ipcRenderer.invoke('shell:openWith', path, app),
  openTerminal: (path, options) => ipcRenderer.invoke('shell:openTerminal', path, options),
  speechApiKeyStatus: () => ipcRenderer.invoke('speechKey:status'),
  saveSpeechApiKey: (key) => ipcRenderer.invoke('speechKey:save', key),
  clearSpeechApiKey: () => ipcRenderer.invoke('speechKey:clear'),
  transcribeViaServer: (request) => ipcRenderer.invoke('speech:transcribeServer', request),
  showContextMenu: (target) => ipcRenderer.invoke('contextMenu:show', target),
  onMenuCommand: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', handler);
    return () => ipcRenderer.removeListener('menu:command', handler);
  }
});
