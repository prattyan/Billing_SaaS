const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow;
let server;

function startStaticServer(outDir) {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let rawPath = req.url.split('?')[0];
      let targetFile = path.join(outDir, rawPath);

      // 1. Check if exact file + .html exists (Next.js route pages like /login -> login.html)
      if (fs.existsSync(targetFile + '.html') && !fs.statSync(targetFile + '.html').isDirectory()) {
        targetFile += '.html';
      }
      // 2. Check if targetFile exists directly
      else if (fs.existsSync(targetFile)) {
        if (fs.statSync(targetFile).isDirectory()) {
          const idx = path.join(targetFile, 'index.html');
          if (fs.existsSync(idx)) {
            targetFile = idx;
          } else {
            targetFile = path.join(outDir, 'index.html');
          }
        }
      }
      // 3. Fallback to SPA index.html
      else {
        targetFile = path.join(outDir, 'index.html');
      }

      const ext = path.extname(targetFile).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.txt': 'text/plain; charset=utf-8',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(targetFile, (err, data) => {
        if (err) {
          const fallbackIndex = path.join(outDir, 'index.html');
          fs.readFile(fallbackIndex, (err2, data2) => {
            if (err2) {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end('<h1>404 Page Not Found</h1>');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(data2);
            }
          });
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`Desktop POS static server running on http://127.0.0.1:${port}`);
      resolve(port);
    });
  });
}

function createWindow(port) {
  const iconPath = path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'BillFlow Pro POS v1.0.0',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/login`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const { autoUpdater } = require('electron-updater');

autoUpdater.logger = console;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// 100% Silent Background Update Engine — No Reinstallation Required!
autoUpdater.on('update-downloaded', (info) => {
  console.log('New update downloaded silently:', info.version);
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true);
  }, 2000);
});

app.whenReady().then(async () => {
  const outDir = app.isPackaged
    ? path.join(process.resourcesPath, 'out')
    : path.join(__dirname, '../out');

  const port = await startStaticServer(outDir);
  createWindow(port);

  if (app.isPackaged) {
    // Check on launch
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('Initial update check:', err.message);
      });
    }, 4000);

    // Periodic check every 15 minutes
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('Periodic update check:', err.message);
      });
    }, 15 * 60 * 1000);
  }
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
