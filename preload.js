const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the frontend via the `window.electron` object
contextBridge.exposeInMainWorld('electron', {
    // These match the handlers we set up in main.js
    readDB: (query) => ipcRenderer.invoke('read-db', query),
    writeDB: (data) => ipcRenderer.invoke('write-db', data),
    saveMedia: (buffer, filename) => ipcRenderer.invoke('save-media', buffer, filename),
});
