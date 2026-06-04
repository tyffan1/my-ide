const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('myIde', {
  platform: process.platform,
})
