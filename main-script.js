const { ipcRenderer } = require("electron");
const urlSetting = document.querySelector("#url-setting");
const proxySetting = document.querySelector("#proxy-setting");
const proxySwitch = document.querySelector("#proxy-switch");
const openDevtool = document.querySelector("#open-devtool");
const information = document.querySelector("#show-information");
const webview = document.querySelector("#webview");

let oldUrlSetting = urlSetting.value;
let oldProxySetting = proxySetting.value;
let proxyOn = false;
let timer = null;
let config = {};

function proxySwitchText() {
    if (proxyOn) {
        proxySwitch.innerHTML = "代理：开";
    }
    else {
        proxySwitch.innerHTML = "代理：关";
    }
}

function setInformation(info, seconds = 3) {
    clearTimeout(timer);
    information.innerHTML = info;
    if (seconds !== null) {
        timer = setTimeout(function () { information.innerHTML = ""; }, seconds * 1000);
    }
}

//#region ipc events

ipcRenderer.on("hide-devtool", function (event, args) {
    openDevtool.style.display = "none";
});

ipcRenderer.on("config-changed", function (event, args) {
    config = JSON.parse(args);

    const newProxy = config["proxy"] || "";
    if (newProxy !== proxySetting.value) {
        proxyOn = !!newProxy;
        oldUrlSetting = newProxy;
        proxySetting.value = newProxy;
        proxySwitchText(proxyOn);
    }
});

//#endregion

//#region handles

function setUrlHandle() {
    openUrlHandle(urlSetting.value);
}

function openUrlHandle(url) {
    if (!!oldUrlSetting && oldUrlSetting.includes(url)) {
        return;
    }
    webview.loadURL(url);
    urlSetting.value = url;
    oldUrlSetting = url;
    setInformation(`加载：${url}`)
}

function toggleProxyHandle() {
    if (proxyOn) {
        // 关闭代理
        oldProxySetting = null;
        ipcRenderer.send('set-proxy', null);
    }
    else {
        // 开启代理
        setProxyHandle();
    }
    proxyOn = !proxyOn;
    proxySwitchText();
}

function refreshHandle() {
    webview.reloadIgnoringCache();
    setInformation("刷新成功");
}

function clearCacheHandle() {
    ipcRenderer.send('clear-cache', null);
}

function setProxyHandle() {
    if (oldProxySetting === proxySetting.value) {
        return;
    }
    oldProxySetting = proxySetting.value;
    ipcRenderer.send('set-proxy', proxySetting.value);
    proxySwitchText();
    setInformation("代理更新成功");
}

function openDevtoolHandle() {
    ipcRenderer.send('open-devtool', null);
}

function goBackHandle() {
    if (webview.canGoBack()) {
        webview.goBack();
    }
    else {
        setInformation("已经到第一页", 3);
    }
}

//#endregion

//#region webview events

webview.addEventListener("load-commit", function (e) {
});

webview.addEventListener("did-start-loading", function (e) {
});

webview.addEventListener("did-finish-load", function (e) {
    setInformation("页面加载完成", 3);
    const url = webview.getURL() || "";
    if (url.startsWith("http:") || url.startsWith("https:")) {
        urlSetting.value = webview.getURL();
        oldUrlSetting = urlSetting.value;
    }
});

//#endregion