const { ipcMain, shell, app } = require('electron');
const { join } = require('path');

module.exports = class IpcHandler {
  #store;
  #settings;
  #updater;
  #tray;
  #getToken;

  constructor(getWindow, handler, sendUpdate, store, sendNotification, settings, updater, tray, getToken) {
    this.getWindow = getWindow;
    this.handler = handler;
    this.sendUpdate = sendUpdate;
    this.sendNotification = sendNotification;

    this.#store = store;
    this.#settings = settings;
    this.#updater = updater;
    this.#tray = tray;
    this.#getToken = getToken;

    this.#register();

    if (!app.isPackaged) this.#registerDev();
  }

  async #fetchPlayer(username) {
    const res = await fetch(`https://${process.env.SERVER_HOSTNAME}${process.env.SERVER_API_PATH}?action=player&name=${username}`, {
      signal: AbortSignal.timeout(10000)
    });

    return {
      code: res.status,
      data: await res.json()
    };
  }

  async #searchPlayers(query) {
    const res = await fetch(`https://${process.env.SERVER_HOSTNAME}${process.env.SERVER_API_PATH}?action=players&search=${query}`, {
      signal: AbortSignal.timeout(10000)
    });

    return {
      code: res.status,
      data: await res.json()
    };
  }

  async #fetchPlayers() {
    const res = await fetch(`https://${process.env.SERVER_HOSTNAME}${process.env.SERVER_API_PATH}?action=server-status`, {
      signal: AbortSignal.timeout(10000)
    });

    return {
      code: res.status,
      data: await res.json()
    };
  }

  async #checkUser(username) {
    const token = this.#getToken();
    if (!token) return false;
  
    const res = await fetch(`http://${process.env.API}/users?username=${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000)
    });
  
    const data = await res.json();
  
    if (!res.ok) return false;
    return Array.isArray(data) && data.some((u) => u.username?.toLowerCase() === username.toLowerCase());
  }
  
  #getPlayerPage(username) {
    return `https://${process.env.SERVER_HOSTNAME}${process.env.SERVER_PLAYER_PATH}${username}`;
  }

  #register() {
    ipcMain.on('window:minimize', () => this.getWindow()?.minimize());
    ipcMain.on('window:close', () => this.getWindow()?.close());

    ipcMain.handle('app:version', () => app.getVersion());

    ipcMain.on('shell:openExternal', (_e, url) => shell.openExternal(url));
    ipcMain.on('shell:openDataFolder', () => shell.openPath(join(process.env.APPDATA, process.env.STORE_DIR)));

    ipcMain.on('game:stop', async () => {
      if (this.handler.game.started) await this.handler.save();
      await this.handler.reset();
      this.sendUpdate();
    });

    ipcMain.on('game:delete', (_e, id) => {
      this.#store.remove(id);
      this.sendUpdate();
      this.sendNotification('partie supprimée', `identifiant: ${id}`);
    });

    ipcMain.handle('player:fetch', (_e, username) => this.#fetchPlayer(username).catch(() => null));
    ipcMain.handle('player:get', (_e, username) => this.#getPlayerPage(username));
    ipcMain.handle('player:check', (_e, username) => this.#checkUser(username).catch(() => false));

    ipcMain.handle('players:fetch', async () => await this.#fetchPlayers());
    ipcMain.handle('players:search', (_e, query) => this.#searchPlayers(query).catch(() => null));

    ipcMain.handle('settings:get', () => this.#settings.get());

    ipcMain.handle('settings:set', (_e, key, value) => {
      const updated = this.#settings.set(key, value);

      if (key === 'tray') value ? this.#tray.createTray() : this.#tray.destroyTray();

      this.getWindow()?.webContents.send('settings:update', updated);

      return updated;
    });

    ipcMain.on('update:install', (_e, downloadUrl) => {
      const win = this.getWindow();
      const onProgress = (data) => win?.webContents.send('download:progress', data);
      const onError = () => win?.webContents.send('update:error');

      this.#updater.on('download:progress', onProgress);
      this.#updater.once('update:error', onError);

      this.#updater.install(downloadUrl).finally(() => {
        this.#updater.off('download:progress', onProgress);
        this.#updater.off('update:error', onError);
      });
    });
  }

  #registerDev() {
    const Simulator = require('../../tests/Simulator');
    const sim = new Simulator(this.handler, this.sendUpdate);

    ipcMain.on('sim:start', () => sim.start());
    ipcMain.on('sim:stop', () => sim.stop());
  }
};