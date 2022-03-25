const path = require('path');
const open = require('open');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, Tray, clipboard, Menu, dialog } = require('electron');
const ejs = require('ejs-electron')
const url = require("url");
const { autoUpdater } = require('electron-updater');
const Alert = require("electron-alert");
const log = require("electron-log");
require('dotenv').config({path: path.join(__dirname, '.env')});

const env = process.env;
// Set the full path of the background image
env.LAUNCHER_BG_IMAGE = path.join(__dirname, env.LAUNCHER_BG_IMAGE);
env.CONNECTION_STRING = `fivem://connect/${env.SERVER_ADDRESS}:${env.SERVER_PORT}`;
ejs.data('config', env);

let win;

function createWindow () {
    const win = new BrowserWindow({
        show: false,
        width: env.LAUNCHER_WIDTH,
        height: env.LAUNCHER_HEIGHT,
        minWidth: 600,
        minHeight: 550,
        resizable: false,
        icon: path.join(__dirname, env.SERVER_ICON),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.once('ready-to-show', () => win.show());

    win.setMenuBarVisibility(false);
    win.setAspectRatio(env.LAUNCHER_WIDTH / env.LAUNCHER_HEIGHT);
    win.loadURL('file://' + __dirname + '/html/index.ejs');

    appTray = new Tray(__dirname + '/assets/icon.ico');
    appTray.setToolTip(`Launcher ${env.SERVER_NAME}`)
    const contextMenu = Menu.buildFromTemplate([
        { type: 'separator' },
        { label: `${env.SERVER_NAME} | Versão: ` + app.getVersion() },
        { type: 'separator' },
        {
            label: 'Sobre',
            click: () => {
              const options = {
                type: 'info',
                buttons: ['OK'],
                defaultId: 1,
                title: `Launcher ${env.SERVER_NAME}`,
                message: `Launcher ${env.SERVER_NAME}`,
                detail: `Desenvolvidor por: RenildoMarcio \nElectron ${process.versions['electron']} - Chrome ${
                  process.versions['chrome']
                } - Node.js ${process.versions['node']} - Arch ${process.arch}`,
              };
      
              dialog.showMessageBox(options);
            },
          },
        { type: 'separator' },
        { label: 'Verifique se há atualizações', click: menuItem => autoUpdater.checkForUpdates(), },
        { type: 'separator' },
        { label: `Discord | ${env.SERVER_NAME}`, click() { open(`${env.SERVER_DISCORD}`); } },
        { type: 'separator' },
        { label: 'Sair do Launcher', click() { app.quit() } },
        { type: 'separator' },
    ])
    appTray.setContextMenu(contextMenu)
    win.webContents.once('dom-ready', () => {
        //log.info('Bootstrap window is ready.')
        win.show()
        autoUpdater.checkForUpdates()
        appTray.on('click', () => {
            win.isVisible() ? win.hide() : win.show()
        })
    })
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

function clearCache() {
    const fivemData = path.join(process.env.LOCALAPPDATA, "FiveM\\FiveM.app\\data");
    const cache = path.join(fivemData, "cache");
    const serverCache = path.join(fivemData, "server-cache");

    if (fs.existsSync(cache)) {
        fs.rm(cache, { recursive: true, force: true }, () => {});
    }

    if (fs.existsSync(serverCache)) {
        fs.rm(serverCache, { recursive: true, force: true }, () => {});
    }
}

ipcMain.on('cache:clear', (event, message) => {
    clearCache();
    event.reply('cache:clear', { status: "done" });
});

ipcMain.on('url:open', (event, url) => open(url));

ipcMain.on('minimize', () => {
    win.isMinimized() ? win.restore() : win.minimize()
    // or alternatively: win.isVisible() ? win.hide() : win.show()
});

/*Checking updates just after app launch and also notify for the same*/
/*app.on("ready", function() {
  autoUpdater.checkForUpdates();
});*/

app.on("ready", () => {
	process.on(
		"uncaughtException",
		Alert.uncaughtException(false, err => {
			console.error("Uncaught Exception:", err);
			app.quit();
		}, true, true)
	);
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

ipcMain.on("updates-check-and-download", event => {
    // This will immediately download an update, then install when the
    // app quits.
    log.info("Starting check for updates (with auto-download if any)");
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify();
  });

  ipcMain.on("updates-check", event => {
    log.info("Starting check for updates (without auto-download)");
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();
  });

  function sendUpdateStatus(status) {
    log.info(status);
    if (win) win.webContents.send("update-status", status);
  }
  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({
      message: "Checking for update...",
      status: "checking-for-update"
    });
  });
  autoUpdater.on("update-available", info => {
    sendUpdateStatus({
      message: "Update available.",
      status: "update-available"
    });
  });
  autoUpdater.on("update-not-available", info => {
    sendUpdateStatus({
      message: "Update not available.",
      status: "update-not-available"
    });
  });
  autoUpdater.on("error", err => {
    sendUpdateStatus({
      message: "Error in auto-updater. " + err,
      status: "error",
      err
    });
  });
  autoUpdater.on("download-progress", progressObj => {
    let logMessage = "Download speed: " + progressObj.bytesPerSecond;
    logMessage = logMessage + " - Downloaded " + progressObj.percent + "%";
    logMessage =
      logMessage +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    sendUpdateStatus({
      message: logMessage,
      status: "download-progress",
      bytesPerSecond: progressObj.bytesPerSecond,
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });
  autoUpdater.on("update-downloaded", info => {
    sendUpdateStatus({
      message: "Update downloaded",
      status: "update-downloaded",
      info
    });
    autoUpdater.quitAndInstall();
  });

  function handleSquirrelEvent(application) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);
            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            application.quit();
            return true;
    }
};