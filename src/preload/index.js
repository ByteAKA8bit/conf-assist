import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  requestMediaAccess: (args) => ipcRenderer.invoke('request-media-access', args),
  fetch: (...args) => ipcRenderer.invoke('fetch', args),

  wsCreate: (...args) => ipcRenderer.send('ws:create', ...args),
  wsCreated: (callback) => ipcRenderer.on('ws:created', (_event, value) => callback(value)),

  wsSend: (...args) => ipcRenderer.send('ws:send', ...args),
  wsReceived: (callback) =>
    ipcRenderer.on('ws:received', (_event, value) => {
      callback(value)
    }),

  wsClose: (...args) => ipcRenderer.send('ws:close', ...args),
  wsClosed: (callback) => ipcRenderer.on('ws:closed', (_event, value) => callback(value)),

  wsError: (callback) => ipcRenderer.on('ws:error', (_event, value) => callback(value))
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
