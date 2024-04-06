import { ipcRenderer } from 'electron'
export const wsCollection = {
  wsCreate: (...args) => ipcRenderer.send('ws:create', ...args),
  wsCreated: (callback) => ipcRenderer.on('ws:created', (_event, value) => callback(value)),

  wsSend: (...args) => ipcRenderer.send('ws:send', ...args),
  wsReceived: (callback) =>
    ipcRenderer.on('ws:received', (_event, value) => {
      callback(value)
    }),

  wsClose: (...args) => ipcRenderer.send('ws:close', ...args),
  wsClosed: (callback) => ipcRenderer.on('ws:closed', (_event, value) => callback(value)),

  wsError: (callback) => ipcRenderer.on('ws:error', (_event, value) => callback(value)),
}
