import { join } from 'path'
import icon from '@resources/icon.png?asset'
import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'

const windows = new Set()
/**
 * 根据路径创建窗口
 * @param {string} path 需要加载的页面路径 从renderer目录下开始 如 src/windows/main/index.html
 * @returns
 */
export function createWindow(path) {
  // Create the browser window.
  const newWindow = new BrowserWindow({
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
      nodeIntegrationInWorker: true,
    },
  })

  newWindow.on('ready-to-show', () => {
    newWindow.show()
    // auto open DevTools
    // mainWindow.webContents.openDevTools()
  })

  newWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    newWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    newWindow.loadFile(join(__dirname, '../renderer/' + path))
  }

  newWindow.HTMLPath = path

  windows.add(newWindow)
  return newWindow
}

export default windows
