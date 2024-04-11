import { ipcMain, desktopCapturer, shell } from 'electron'
import { createWebSocket, closeWebSocket, getWebSocket } from '@main/utils/socket'
import { requestMediaAccess } from '@main/utils/permission-access/requestMediaAccess'
import { machineId } from 'node-machine-id'

let targetWindows = []

function onWebSocketOpen(key) {
  // 广播连接成功
  targetWindows.map((window) => {
    window.webContents.send('ws:created', {
      key,
      code: 200,
      message: 'connection success',
    })
  })
}

function onWebSocketReceiveMessage(message) {
  // 广播接收到ws的消息
  targetWindows.map((window) => {
    window.webContents.send('ws:received', message)
  })
}

function onWebSocketClose(key) {
  targetWindows.map((window) => {
    window.webContents.send('ws:closed', { key })
  })
}

function onWebSocketError(key) {
  targetWindows.map((window) => {
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
  ipcMain.handle('audio:source', async () => {
    // 全部返回回去让用户选择
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { height: 256, width: 256 },
      fetchWindowIcons: true,
    })
    sources.forEach((item) => {
      item.thumbnailURL = item.thumbnail.toDataURL()
    })

    return sources
  })
}

export function registerOpenExternal() {
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url)
  })
}

function getMachineID() {
  ipcMain.handle('get:machine-id', async () => {
    return await machineId()
  })
}

export default function registerIPC(windows) {
  targetWindows = windows
  registerWebSocketProxy()
  registerPermissionAccess()
  registerGetAuidoSource()
  registerOpenExternal()
  getMachineID()

  // Todo 窗口最大最小关闭控制 这里还是不精确 需要后期修正
  ipcMain.on('close', () => {
    targetWindows.forEach((window) => window.close())
  })
  ipcMain.on('minimize', () => {
    targetWindows.forEach((window) => window.minimize())
  })
  ipcMain.on('maxmize', () => {
    targetWindows.forEach((window) => {
      if (window.isMaximized()) {
        window.restore()
      } else {
        window.maximize()
      }
    })
  })
}
