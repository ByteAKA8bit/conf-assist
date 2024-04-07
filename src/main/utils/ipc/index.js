import { ipcMain, BrowserWindow, desktopCapturer, shell } from 'electron'
import { createWebSocket, closeWebSocket, getWebSocket } from '@main/utils/socket'
import { requestMediaAccess } from '@main/utils/permission-access/requestMediaAccess'

//
function onWebSocketOpen(key) {
  // 广播连接成功
  BrowserWindow.getAllWindows().map((window) => {
    window.webContents.send('ws:created', {
      key,
      code: 200,
      message: 'connection success',
    })
  })
}
function onWebSocketReceiveMessage(message) {
  // 广播接收到ws的消息
  BrowserWindow.getAllWindows().map((window) => {
    window.webContents.send('ws:received', message)
  })
}
function onWebSocketClose(key) {
  BrowserWindow.getAllWindows().map((window) => {
    window.webContents.send('ws:closed', { key })
  })
}
function onWebSocketError(key) {
  BrowserWindow.getAllWindows().map((window) => {
    window.webContents.send('ws:error', { key })
  })
}

function handleWebSocketCreate(event, key, url) {
  createWebSocket(
    key,
    url,
    onWebSocketOpen,
    onWebSocketReceiveMessage,
    onWebSocketClose,
    onWebSocketError,
  )
}

function handleWebSocketSend(event, key, message) {
  const socket = getWebSocket(key)
  if (socket) {
    if (socket.readyState !== 1) {
      setTimeout(() => {
        if (!socket || socket.readyState !== 1) {
          this.socket.send(message)
        }
      }, 40)
    }
    socket.send(message)
  }
}

function handleWebSocketClose(event, key) {
  closeWebSocket(key)
}

export function registerWebSocketProxy() {
  ipcMain.on('ws:create', handleWebSocketCreate)

  ipcMain.on('ws:send', handleWebSocketSend)

  ipcMain.on('ws:close', handleWebSocketClose)
}

export function registerPermissionAccess() {
  ipcMain.handle('request-media-access', (event, args) => {
    return requestMediaAccess(args)
  })
}

export function registerGetAuidoSource() {
  ipcMain.handle('audio:source', async (event, capturerType, appName) => {
    let source = null
    if (capturerType === 'app') {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
      })
      source = sources.find((source) => source.name === appName)
    }
    if (capturerType === 'screen') {
      source = await desktopCapturer.getSources({
        types: ['screen'],
      })[0]
    }
    if (capturerType === 'microphone') {
      source = capturerType
    }
    return source
  })
}

export function registerOpenExternal() {
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url)
  })
}

export default function registerIPC() {
  registerWebSocketProxy()
  registerPermissionAccess()
  registerGetAuidoSource()
  registerOpenExternal()
}
