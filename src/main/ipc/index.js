import { ipcMain, desktopCapturer, shell } from 'electron'
import { requestMediaAccess } from '@main/utils/permission-access/requestMediaAccess'
import { machineId } from 'node-machine-id'

let targetWindows = []

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
