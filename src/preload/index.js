import { contextBridge, ipcRenderer } from 'electron'
import { wsCollection } from './websocket'

// Custom APIs for renderer
const api = {
  ...wsCollection,
  requestMediaAccess: (args) => ipcRenderer.invoke('request-media-access', args),
  mainFetch: (...args) => {
    return ipcRenderer.invoke('fetch', ...args)
  },
  audioGetSource: (...args) => ipcRenderer.invoke('audio:source', ...args),
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
    contextBridge.exposeInMainWorld('localEnv', import.meta.env)
  } catch (error) {
    console.error(error)
  }
}
