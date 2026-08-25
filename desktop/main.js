/**
 * ZAIan Studio desktop shell (Electron main process).
 *
 * The desktop app wraps the live web build so updates ship instantly with
 * each Vercel deploy. Native menus, system tray, and keyboard shortcuts
 * are wired here.
 */

const { app, BrowserWindow, Menu, shell, globalShortcut } = require("electron");
const path = require("path");

const APP_URL = process.env.ZAIAN_STUDIO_URL ||
  process.env.PROMPTSZAIAN_URL || // legacy alias kept for backwards-compat
  "https://promptops-kappa.vercel.app";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0b1120",
    autoHideMenuBar: process.platform !== "darwin",
    title: "ZAIan Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadURL(APP_URL);

  // Open external links in the system browser, not inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Quick reload + DevTools for power users.
  mainWindow.on("closed", () => { mainWindow = null; });
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{
      label: "ZAIan Studio",
      submenu: [
        { role: "about" }, { type: "separator" },
        { role: "services" }, { type: "separator" },
        { role: "hide" }, { role: "hideOthers" }, { role: "unhide" },
        { type: "separator" }, { role: "quit" }
      ]
    }] : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" }
      ]
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open privacy policy",
          click: () => shell.openExternal(`${APP_URL}/privacy`)
        },
        {
          label: "Email support",
          click: () => shell.openExternal("mailto:ahmad.zaian@outlook.com")
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // Global Ctrl/Cmd+Shift+P opens the workspace from anywhere.
  try {
    globalShortcut.register("CommandOrControl+Shift+P", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.loadURL(`${APP_URL}/workspace`);
      }
    });
  } catch { /* shortcut may already be registered */ }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
