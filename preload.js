const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('konbiniApp', {
  quit: () => ipcRenderer.send('app-quit'),
});
