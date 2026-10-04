const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

// セーブデータの場所は、これまでの exe と同じフォルダを使い続ける（名前を変えても引き継ぐ）
app.setPath('userData', path.join(app.getPath('appData'), 'コンビニ箱庭'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 800,
    minHeight: 520,
    title: 'コンビニはじめちゃいました',
    backgroundColor: '#bcd8ea',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    else if (input.key === 'F12' && input.control) win.webContents.toggleDevTools();
  });
  return win;
}

/* ---- 自動アップデート（GitHub Releases を起動のたびに確認） ---- */
function setupAutoUpdate(win) {
  if (!app.isPackaged) return; // 開発中は何もしない
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // 「あとで」を選んでも、終了時に更新される
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['今すぐ再起動して更新', 'あとで'],
      defaultId: 0,
      cancelId: 1,
      title: 'アップデート',
      message: `新しいバージョン ${info.version} をダウンロードしました。`,
      detail: '再起動すると更新されます。「あとで」を選んでも、ゲームを終了したときに自動で更新されます。',
    }).then((r) => { if (r.response === 0) autoUpdater.quitAndInstall(); });
  });
  autoUpdater.on('error', (e) => console.error('auto-update error:', e && e.message));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 60 * 60 * 1000); // 起動しっぱなしでも1時間ごとに確認
}

Menu.setApplicationMenu(null);
ipcMain.on('app-quit', () => app.quit());
app.whenReady().then(() => {
  const win = createWindow();
  setupAutoUpdate(win);
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => app.quit());
