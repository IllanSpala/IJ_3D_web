const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        // fullscreen: true, // You can toggle fullscreen if you like
        icon: path.join(__dirname, 'assets', 'app_icon.png'),
        webPreferences: {
            nodeIntegration: false, // Keep false for security
            contextIsolation: true, // Keep true to use contextBridge
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Remove the default menu for a cleaner app look
    mainWindow.setMenuBarVisibility(false);
    
    mainWindow.loadFile('index.html');
}

let db;
let mediaDir;

app.whenReady().then(() => {
    const dbDir = path.join(app.getPath('documents'), 'IJ3D_Data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    
    mediaDir = path.join(dbDir, 'src_media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    
    db = new sqlite3.Database(path.join(dbDir, 'print_manager_v2.db'));

    protocol.handle('ij3d', (request) => {
        // request.url is something like ij3d://src_media/filamentos/foto.webp
        const urlPath = request.url.replace('ij3d://', '');
        // urlPath could be "src_media/filamentos/foto.webp"
        // we map everything inside src_media to the physical mediaDir
        const relative = urlPath.startsWith('src_media/') ? urlPath.replace('src_media/', '') : urlPath;
        const physicalPath = path.join(mediaDir, relative);
        return net.fetch('file://' + physicalPath);
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('read-db', async (event, storeName) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM "${storeName}"`, [], (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) return resolve([]);
                return reject(err);
            }
            resolve(rows);
        });
    });
});

ipcMain.handle('write-db', async (event, req) => {
    const { action, storeName, rows, obj, id } = req;
    
    return new Promise((resolve, reject) => {
        const runQuery = (sql, params = []) => {
            return new Promise((res, rej) => {
                db.run(sql, params, function (err) {
                    if (err) rej(err); else res(this.lastID);
                });
            });
        };

        const createTableFromRows = async (rowsArr) => {
            if (!rowsArr || rowsArr.length === 0) return;
            const keySet = new Set();
            rowsArr.forEach(r => Object.keys(r).forEach(k => keySet.add(k)));
            const keys = Array.from(keySet);
            const colDefs = keys.map(k => (k === 'id') ? 'id TEXT PRIMARY KEY' : `"${k}" TEXT`).join(', ');
            await runQuery(`CREATE TABLE IF NOT EXISTS "${storeName}" (${colDefs})`);
        };

        const createTableFromObj = async (sample) => {
            if (!sample) return;
            const keys = Object.keys(sample);
            const colDefs = keys.map(k => (k === 'id') ? 'id TEXT PRIMARY KEY' : `"${k}" TEXT`).join(', ');
            await runQuery(`CREATE TABLE IF NOT EXISTS "${storeName}" (${colDefs})`);
        };

        const insertObj = async (item) => {
            const cols = Object.keys(item).map(k => `"${k}"`).join(', ');
            const placeholders = Object.keys(item).map(() => '?').join(', ');
            const vals = Object.values(item).map(v => (v === null || v === undefined) ? null : (typeof v === 'object' ? JSON.stringify(v) : v));
            await runQuery(`INSERT OR REPLACE INTO "${storeName}" (${cols}) VALUES (${placeholders})`, vals);
        };

        (async () => {
            try {
                if (action === 'putAll') {
                    if (rows && rows.length > 0) {
                        await runQuery('BEGIN TRANSACTION');
                        try {
                            await runQuery(`DROP TABLE IF EXISTS "${storeName}"`);
                            await createTableFromRows(rows);
                            for (const r of rows) await insertObj(r);
                            await runQuery('COMMIT');
                        } catch(e) {
                            await runQuery('ROLLBACK');
                            throw e;
                        }
                    } else if (rows && rows.length === 0) {
                        await runQuery(`DELETE FROM "${storeName}"`);
                    }
                } else if (action === 'put') {
                    if (obj) {
                        await createTableFromObj(obj);
                        try {
                            await insertObj(obj);
                        } catch (err) {
                            if (err.message.includes('datatype mismatch')) {
                                await runQuery(`DROP TABLE IF EXISTS "${storeName}"`);
                                await createTableFromObj(obj);
                                await insertObj(obj);
                            } else {
                                throw err;
                            }
                        }
                    }
                } else if (action === 'clear') {
                    await runQuery(`DELETE FROM "${storeName}"`);
                } else if (action === 'delete') {
                    await runQuery(`DELETE FROM "${storeName}" WHERE id = ?`, [id]);
                }
                resolve({ success: true });
            } catch (err) {
                if (err.message.includes('no such table')) resolve({ success: true });
                else {
                    console.error('SQLite Error:', err);
                    reject(err);
                }
            }
        })();
    });
});

ipcMain.handle('save-media', async (event, arrayBuffer, relativePath) => {
    try {
        const fullPath = path.join(app.getPath('documents'), 'IJ3D_Data', relativePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(fullPath, Buffer.from(arrayBuffer));
        return { success: true };
    } catch (err) {
        console.error('Media save error:', err);
        return { success: false, error: err.message };
    }
});
