const fs = require("fs");
const path = require("path");
const {
  app,
  Menu,
  dialog,
  session,
  ipcMain,
  BrowserView,
  BrowserWindow,
} = require("electron");

const filename = path.join(app.getPath("userData"), "gpt.json");
console.log(filename);

// try {
//   // 实现热加载
//   require("electron-reloader")(module, {});
// } catch (_) { }

Menu.setApplicationMenu(null);

let win;
async function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    minWidth: 1200,
    height: 800,
    webPreferences: {
      webviewTag: true,
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
      nodeIntegrationInSubFrames: true,
    },
  });

  await win.loadFile("index.html");
  afterWindowCreated();
  // win.webContents.openDevTools();
  // frameOptionsHandle(win);
}

// 限制单实例
if (app.requestSingleInstanceLock(null)) {
  app.whenReady().then(createWindow);
  app.on(
    "second-instance",
    (event, commandLine, workingDirectory, additionalData) => {
      if (win) {
        dialog.showMessageBox({ title: "提示", message: "已有程序在运行" });
        if (win.isMinimized()) {
          win.restore();
        }
        win.focus();
      }
    }
  );
} else {
  app.quit();
}

ipcMain.on("set-proxy", function (event, args) {
  setLocatProxy(args);
});

ipcMain.on("clear-cache", async function (event, args) {
  const session = win.webContents.session;
  const cacheSize = await session.getCacheSize();
  await session.clearCache();
  await session.clearStorageData();
  dialog.showMessageBox({
    title: "提示",
    message: `缓存已清除（${(cacheSize / 1024 / 1024).toFixed(2)} MB）`,
  });
});

ipcMain.on("config-request", async function (event, args) {
  const json = loadConfig();
  console.log("ipc main got config-request event and resopnse with: ", json);
  if (win) {
    win.webContents.send("config-response", json);
    // console.log(win.webContents.session);
  }
});

ipcMain.on("open-devtool", function (event, args) {
  win.webContents.openDevTools();
});

app.on("window-all-closed", function () {
  // darwin platform -> macOS
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 代理
function setLocatProxy({ proxy, disabled }) {
  if (disabled) {
    win.webContents.session.setProxy({ proxyRules: null });
  } else if (proxy) {
    win.webContents.session.setProxy({ proxyRules: proxy });
  } else {
    win.webContents.session.setProxy({ proxyRules: null });
  }
  setConfig({ proxy, disabled });
}

// 改同源安全
function frameOptionsHandle(win) {
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

// 监听网络请求错误
function listenRequestError() {
  win.webContents.session.webRequest.onErrorOccurred(async ({ error }) => {
    if (!app.isPackaged) {
      await dialog.showMessageBox({
        type: "error",
        title: "请求出错",
        message: `错误：${error}`,
      });
    } else {
      const errorType = ["net::ERR_PROXY_CONNECTION_FAILED"];
      if (!errorType.includes(error)) {
        return;
      }
      let errorMessage = "请检查网络";
      if ("net::ERR_PROXY_CONNECTION_FAILED" === error) {
        errorMessage = "请检查网络或代理配置";
      }
      dialog.showMessageBox({
        type: "error",
        title: "请求出错",
        message: `错误：${error}\r\n\r\n${errorMessage}`,
      });
    }
  });
}

// 初始化
function afterWindowCreated() {
  listenRequestError();

  // const view = new BrowserView()
  // win.setBrowserView(view)
  // view.setBounds({ x: 0, y: 0, width: 1200, height: 300 })
  // view.webContents.loadURL('https://www.baidu.com')

  const json = loadConfig();
  win.webContents.send("config-changed", json);

  // 构建模式下隐藏devtool
  if (app.isPackaged) {
    win.webContents.send("hide-devtool", null);
  }
}

// 配置
function loadConfig(key = "") {
  const content = fs.readFileSync(filename, { encoding: "utf-8", flag: "a+" });
  if (content.length === 0) return "{}";
  else return content;
}

// 持久化配置
function setConfig(keyValues) {
  if (!keyValues || Object.keys(keyValues).length === 0) {
    return;
  }
  const content = fs.readFileSync(filename, { encoding: "utf-8", flag: "a+" });
  let config = {};
  if (content.length === 0) {
    config = {};
  } else {
    try {
      config = JSON.parse(content);
    } finally {
      config = {};
    }
  }
  Object.keys(keyValues).forEach((key) => {
    config[key] = keyValues[key];
  });
  fs.writeFileSync(filename, JSON.stringify(config), {
    encoding: "utf-8",
    flag: "w+",
  });
}
