const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileman', {
  listLocalDirectory: (path) => ipcRenderer.invoke('fs:list', path),
  searchLocalShallow: (path, maxDepth) => ipcRenderer.invoke('fs:search', path, maxDepth),
  createLocalDirectory: (path) => ipcRenderer.invoke('fs:mkdir', path),
  renameLocalEntry: (from, to) => ipcRenderer.invoke('fs:rename', from, to),
  removeLocalEntry: (path, kind) => ipcRenderer.invoke('fs:remove', path, kind),
  copyLocalEntry: (from, toDir) => ipcRenderer.invoke('fs:copy', from, toDir),
  moveLocalEntry: (from, toDir) => ipcRenderer.invoke('fs:move', from, toDir),
  homeDirectory: () => ipcRenderer.invoke('fs:home'),
  listFavorites: () => ipcRenderer.invoke('favorites:list'),
  addFavorite: (path, label) => ipcRenderer.invoke('favorites:add', path, label),
  removeFavorite: (path) => ipcRenderer.invoke('favorites:remove', path),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  showItemInFolder: (path) => ipcRenderer.invoke('shell:showItem', path),
  openWith: (path, app) => ipcRenderer.invoke('shell:openWith', path, app),
  onMenuCommand: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', handler);
    return () => ipcRenderer.removeListener('menu:command', handler);
  }
});
