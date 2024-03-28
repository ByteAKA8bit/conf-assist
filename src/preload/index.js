import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  fetch: (...args) => ipcRenderer.invoke('fetch', args),
  wsCreate: (...args) => ipcRenderer.send('ws:create', args),
  wsCreated: (callback) => ipcRenderer.on('ws:created', (_event, value) => callback(value)),
  wsSend: (...args) => ipcRenderer.send('ws:send', args),
  wsReceived: (callback) =>
    ipcRenderer.on('ws:received', (_event, value) => {
      console.log(value)
      callback(value)
    }),
  wsClose: () => ipcRenderer.send('ws:close')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      close: () => ipcRenderer.send('close'),
      minimize: () => ipcRenderer.send('minimize'),
      maxmize: () => ipcRenderer.send('maxmize')
    })
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('localEnv', import.meta.env)
  } catch (error) {
    console.error(error)
  }
}
