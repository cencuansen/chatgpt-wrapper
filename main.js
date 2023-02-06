const { app, BrowserWindow, Menu, session, ipcMain, dialog } = require("electron");
const os = require("os");
const fs = require("fs");
const path = require("path");

const filename = "gpt.json";
const filepath = path.join(os.homedir(), filename);
const proxyKey = "proxy";

// try {
//   // 实现热加载
//   require("electron-reloader")(module, {});
// } catch (_) { }

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
  afterCreateWindow();
  // win.webContents.openDevTools();
  // frameOptionsHandler(win);
}

const gotTheLock = app.requestSingleInstanceLock(null);
if (!gotTheLock) {
  // 获得锁失败表明已被占用，退出，不再创建

  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory, additionalData) => {
    if (win) {
      dialog.showMessageBox({ title: "提示", message: "已有程序在运行" });
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  app.whenReady().then(() => { createWindow(); });
}

ipcMain.on("set-proxy", function (event, args) {
  setLocatProxy(args);
});

ipcMain.on("clear-cache", async function (event, args) {
  const session = win.webContents.session;
  const cacheSize = await session.getCacheSize();
  await session.clearCache();
  await session.clearStorageData();
  dialog.showMessageBox({ title: "提示", message: `缓存已清除（${(cacheSize / 1024 / 1024).toFixed(2)} MB）` });
});

ipcMain.on("open-devtool", function (event, args) {
  win.webContents.openDevTools();
});

app.on("window-all-closed", function () {
  // darwin platform -> macOS
  if (process.platform !== "darwin") { app.quit(); }
});

// 代理
function setLocatProxy(proxyRules = null) {
  win.webContents.session.setProxy({ proxyRules, });
  setConfig(proxyKey, proxyRules);
}

// 改同源安全
function frameOptionsHandler(win) {
  // We set an intercept on incoming requests to disable x-frame-options headers.
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

// 初始化
function afterCreateWindow() {
  const config = loadConfig();
  win.webContents.send("config-changed", JSON.stringify(config));

  const proxy = config[proxyKey];
  if (proxy) { setLocatProxy(proxy); }

  // 构建模式下隐藏devtool
  if (app.isPackaged) {
    win.webContents.send("hide-devtool", null);
  }
}

// 配置
function loadConfig(key = "") {
  const content = fs.readFileSync(filename, { encoding: "utf-8", flag: "a+" });
  if (content.length === 0) return {};
  const json = JSON.parse(content);
  if (key) {
    return { key: json[key] };
  }
  else {
    return json;
  }
}

function setConfig(key, value) {
  if (!key) { return; }
  const content = fs.readFileSync(filename, { encoding: "utf-8", flag: "a+" });
  if (content.length === 0) return;
  const json = JSON.parse(content);
  json[key] = value;
  fs.writeFileSync(filename, JSON.stringify(json), { encoding: "utf-8", flag: "w+" });
}