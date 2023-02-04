const { app, BrowserWindow, Menu, session, ipcMain } = require("electron");

try {
  // 实现热加载
  require("electron-reloader")(module, {});
} catch (_) {}

Menu.setApplicationMenu(null);

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    minWidth: 1200,
    height: 800,
    webPreferences: {
      webSecurity: false,
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
  // win.webContents.openDevTools();
  setLocatProxy(win);
  xFrameOptionsHandler(win);
}

ipcMain.on("set-proxy", function (event, args) {
  setLocatProxy(win, args);
});

ipcMain.on("open-devtool", function (event, args) {
  win.webContents.openDevTools();
});

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", function () {
  // darwin platform -> macOS
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function setLocatProxy(win, proxyRules="http://127.0.0.1:10800") {
  win.webContents.session.setProxy({
    proxyRules,
  });
}

function xFrameOptionsHandler(win) {
  // We set an intercept on incoming requests to disable x-frame-options
  // headers.
  win.webContents.session.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    (d, c) => {
      if (d.responseHeaders["X-Frame-Options"]) {
        delete d.responseHeaders["X-Frame-Options"];
      } else if (d.responseHeaders["x-frame-options"]) {
        delete d.responseHeaders["x-frame-options"];
      }
      if (d.responseHeaders["referrer-policy"]) {
        delete d.responseHeaders["referrer-policy"];
      }

      c({ cancel: false, responseHeaders: d.responseHeaders });
    }
  );
}
