/**
 * Electron main process
 *
 * Responsibilities:
 *  1. Redirect data/ and uploads/ to AppData so they persist across updates
 *  2. Spawn the bundled server.js as a child process
 *  3. Wait for the server to be ready, then open the BrowserWindow
 *  4. Handle auto-update via electron-updater
 *  5. Kill the server when the app closes
 */

const { app, BrowserWindow, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const log = require('electron-log')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

// ── Logging ────────────────────────────────────────────────────────────────
log.transports.file.level = 'info'
autoUpdater.logger = log

// ── Paths ──────────────────────────────────────────────────────────────────
// appRoot: inside the asar/unpacked directory where server.js lives
const appRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..', 'app')

// userData: C:\Users\<user>\AppData\Roaming\<appName>  — persists across updates
const userDataPath = app.getPath('userData')
const dataDir     = path.join(userDataPath, 'data')
const uploadsDir  = path.join(userDataPath, 'uploads')
const cardsDir    = path.join(userDataPath, 'cards')
const carrouselDir = path.join(userDataPath, 'carrousel')

// Create persistent dirs if they don't exist yet
for (const dir of [dataDir, uploadsDir, cardsDir, carrouselDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ── Server process ─────────────────────────────────────────────────────────
let serverProcess = null
const SERVER_PORT = 3000

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(appRoot, 'server.js')
    log.info('Starting server:', serverPath)

    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: String(SERVER_PORT),
        // Tell server.js where to store persistent data
        DATA_DIR:      dataDir,
        CARDS_DIR:     cardsDir,
        CARROUSEL_DIR: carrouselDir,
        NODE_ENV: 'production',
      },
      // Don't inherit stdio in production to avoid console windows on Windows
      stdio: app.isPackaged ? 'ignore' : 'inherit',
    })

    serverProcess.on('error', (err) => {
      log.error('Server process error:', err)
      reject(err)
    })

    serverProcess.on('exit', (code) => {
      log.info('Server process exited with code:', code)
    })

    // Poll until the server responds on localhost:PORT
    waitForServer(SERVER_PORT, 30, resolve, reject)
  })
}

function waitForServer(port, retries, resolve, reject) {
  http.get(`http://localhost:${port}/api/config`, (res) => {
    log.info('Server is ready on port', port)
    resolve()
  }).on('error', () => {
    if (retries <= 0) {
      reject(new Error(`Server did not start on port ${port}`))
      return
    }
    setTimeout(() => waitForServer(port, retries - 1, resolve, reject), 500)
  })
}

function stopServer() {
  if (serverProcess) {
    log.info('Stopping server process')
    serverProcess.kill()
    serverProcess = null
  }
}

// ── Window ─────────────────────────────────────────────────────────────────
let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.loadURL(`http://localhost:${SERVER_PORT}`)

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ── Auto-update ────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.allowDowngrade = false

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version)
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Atualização disponível',
      message: `Versão ${info.version} disponível.`,
      detail: 'Deseja baixar e instalar agora?',
      buttons: ['Baixar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate()
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent)
    if (win && !win.isDestroyed()) {
      win.setTitle(`Baixando atualização... ${pct}%`)
      win.setProgressBar(progress.percent / 100)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version)
    if (win && !win.isDestroyed()) {
      win.setTitle(app.name)
      win.setProgressBar(-1)
    }
    dialog.showMessageBox(win, {
      type: 'question',
      title: 'Atualização pronta',
      message: `Versão ${info.version} baixada.`,
      detail: 'Reiniciar agora para instalar?',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true)
    })
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-update error:', err.message)
  })

  setTimeout(() => autoUpdater.checkForUpdates(), 3000)
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await startServer()
    createWindow()

    if (app.isPackaged) {
      setupAutoUpdater()
    } else {
      log.info('Dev mode — auto-updater disabled')
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err) {
    log.error('Failed to start:', err)
    dialog.showErrorBox('Erro ao iniciar', err.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  stopServer()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopServer()
})
