let { ipcRenderer } = require("electron");
ipcRenderer.on("config-response", function (event, args) {
    console.log("config-response in main renderer welcome-script.js and got datas: ", args);
    displayConfig.innerHTML = JSON.stringify(JSON.parse(args), null, 4)
});