import { app, shell, BrowserWindow, ipcMain, desktopCapturer } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { closeWebSocket, createWebSocket, getWebSocket } from './socket'
import { requestMediaAccess } from './requestMediaAccess'
import { runWorker } from './workers'
import { fetchRequest } from './net'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegrationInWorker: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  ipcMain.on('close', () => {
    mainWindow.close()
  })
  ipcMain.on('minimize', () => {
    mainWindow.minimize()
  })
  ipcMain.on('maxmize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore()
    } else {
      mainWindow.maximize()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.conf.assistant')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  testWorker()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const testWorker = async () => {
  const result = await runWorker({ test: 'value' })
  console.log(result)
}

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('fetch', async (event, url, options, body) => {
  const result = await fetchRequest(url, options, body)
  return result
})

ipcMain.handle('audio:source', async (event, capturerType, appName) => {
  // 类型分为
  // 捕获应用音频
  // 捕获整个屏幕
  // 捕获麦克风输入
  let source = null
  if (capturerType === 'app') {
    const sources = await desktopCapturer.getSources({
      types: ['window']
    })
    source = sources.find((source) => source.name === appName)
  }
  if (capturerType === 'screen') {
    source = await desktopCapturer.getSources({
      types: ['screen']
    })[0]
  }
  if (capturerType === 'microphone') {
    source = capturerType
  }
  return source
})

ipcMain.handle('request-media-access', (event, args) => {
  return requestMediaAccess(args)
})

ipcMain.on('ws:create', (event, key, url) => {
  createWebSocket(
    key,
    url,
    () => {
      // 广播连接成功
      BrowserWindow.getAllWindows().map((window) => {
        window.webContents.send('ws:created', {
          key,
          code: 200,
          message: 'connection success'
        })
      })
    },
    (message) => {
      // 广播接收到ws的消息
      BrowserWindow.getAllWindows().map((window) => {
        window.webContents.send('ws:received', message)
      })
    },
    () => {
      // 广播连接关闭
      BrowserWindow.getAllWindows().map((window) => {
        window.webContents.send('ws:closed', { key })
      })
    },
    () => {
      // 广播连接错误
      BrowserWindow.getAllWindows().map((window) => {
        window.webContents.send('ws:error', { key })
      })
    }
  )
})

ipcMain.on('ws:send', (event, key, message) => {
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
})

ipcMain.on('ws:close', (event, key) => {
  closeWebSocket(key)
})
