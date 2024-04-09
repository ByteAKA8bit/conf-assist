import { ipcRenderer } from 'electron'
export const wsCollection = {
  wsCreate: (...args) => ipcRenderer.send('ws:create', ...args),
  wsOnOpen: (callback) => ipcRenderer.on('ws:created', (_event, value) => callback(value)),

  wsSend: (...args) => ipcRenderer.send('ws:send', ...args),
  wsOnMessage: (callback) =>
    ipcRenderer.on('ws:received', (_event, value) => {
      callback(value)
    }),

  wsClose: (...args) => ipcRenderer.send('ws:close', ...args),
  wsOnClose: (callback) => ipcRenderer.on('ws:closed', (_event, value) => callback(value)),

  wsOnError: (callback) => ipcRenderer.on('ws:error', (_event, value) => callback(value)),
}
