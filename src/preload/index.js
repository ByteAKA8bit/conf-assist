import { contextBridge, ipcRenderer } from 'electron'
import { wsCollection } from '@preload/ipc/websocket'

// Custom APIs for renderer
const api = {
  ...wsCollection,
  requestMediaAccess: (args) => ipcRenderer.invoke('request-media-access', args),
  audioGetSource: () => ipcRenderer.invoke('audio:source'),
  openExternal: (...args) => ipcRenderer.send('open-external', ...args),
  getMachineID: () => ipcRenderer.invoke('get:machine-id'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      close: () => ipcRenderer.send('close'),
      minimize: () => ipcRenderer.send('minimize'),
      maxmize: () => ipcRenderer.send('maxmize'),
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
