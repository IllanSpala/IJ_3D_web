/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — db.js
   IndexedDB abstraction layer.
   Mirrors the SQLite tables from the desktop app.
   ═══════════════════════════════════════════════════════════════ */

const DB_NAME    = 'IJ3D_WebCache';
const DB_VERSION = 7;

/* Tables from core/database.py that we replicate as object stores. */
const TABLE_STORES = [
    'configuracoes',
    'filamentos',
    'hist_impressoes',
    'hist_filamentos',
    'hist_fotos',
    'ferramentas_insumos',
    'pedidos',
    'pedidos_v2',
    'pedidos_itens',
    'manutencao',
    'historico_impressao',
    'producao_partes',
    'producao_pedidos',
    'historico_sprints',
    'vendas_manuais',
    'orcamentos_salvos'
];

/* Special stores */
const MEDIA_STORE = 'media';
const META_STORE  = '_meta';

const ALL_STORES = [...TABLE_STORES, MEDIA_STORE, META_STORE];

let _db = null;

/**
 * Open (or upgrade) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            for (const name of ALL_STORES) {
                if (!db.objectStoreNames.contains(name)) {
                    if (name === MEDIA_STORE) {
                        db.createObjectStore(name);              // key = path string
                    } else if (name === META_STORE) {
                        db.createObjectStore(name);              // key = meta key string
                    } else {
                        db.createObjectStore(name, { autoIncrement: true });
                    }
                }
            }
        };

        req.onsuccess = (e) => {
            _db = e.target.result;
            resolve(_db);
        };

        req.onerror = (e) => reject(e.target.error);
    });
}

/* ── Generic CRUD helpers ────────────────────────────────────── */

/**
 * Clear a single store.
 */
export async function clearStore(storeName) {
    if (window.electron) return await window.electron.writeDB({ action: 'clear', storeName });
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) return;
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(storeName, 'readwrite');
        const st  = tx.objectStore(storeName);
        const req = st.clear();
        req.onsuccess = () => resolve();
        req.onerror   = (e) => reject(e.target.error);
    });
}

/**
 * Insert multiple rows into a store (clearing it first).
 */
export async function putAll(storeName, rows) {
    if (window.electron) return await window.electron.writeDB({ action: 'putAll', storeName, rows });
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) return;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const st = tx.objectStore(storeName);
        st.clear();
        for (const row of rows) {
            // Use the row's own id as the key if it exists, so that records
            // imported from SQLite backup keep their original IDs.
            const key = (row.id !== undefined && row.id !== null) ? row.id : undefined;
            st.put(row, key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror    = (e) => reject(e.target.error);
    });
}

/**
 * Get all rows from a store.
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
    if (window.electron && !['media', '_meta'].includes(storeName)) {
        let rows = await window.electron.readDB(storeName);
        return rows.map(r => {
            try { return JSON.parse(JSON.stringify(r), (k,v) => {
                if (typeof v === 'string' && v.startsWith('{') && v.endsWith('}')) return JSON.parse(v);
                if (typeof v === 'string' && v.startsWith('[') && v.endsWith(']')) return JSON.parse(v);
                return v;
            }); } catch(e) { return r; }
        });
    }
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) return [];
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(storeName, 'readonly');
        const st  = tx.objectStore(storeName);
        const req = st.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = () => resolve([]);
    });
}

/** Insert or replace one record and return its key when available. */
export async function put(storeName, obj) {
    if (window.electron) {
        await window.electron.writeDB({ action: 'put', storeName, obj });
        return obj.id;
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const st = tx.objectStore(storeName);
        const key = (obj.id !== undefined && obj.id !== null) ? obj.id : undefined;
        const req = key === undefined ? st.put(obj) : st.put(obj, key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

/** Delete one record by key. */
export async function deleteItem(storeName, id) {
    if (window.electron) return window.electron.writeDB({ action: 'delete', storeName, id });
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

/* ── Media (Blob) helpers ────────────────────────────────────── */

/**
 * Store a media Blob by its relative path key.
 */
export async function putMedia(path, blob) {
    if (window.electron) {
        const arrayBuffer = await blob.arrayBuffer();
        return await window.electron.saveMedia(arrayBuffer, path);
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(MEDIA_STORE, 'readwrite');
        const st  = tx.objectStore(MEDIA_STORE);
        const req = st.put(blob, path);
        req.onsuccess = () => resolve();
        req.onerror   = (e) => reject(e.target.error);
    });
}

/**
 * Retrieve a media Blob by its relative path key.
 * @returns {Promise<Blob|null>}
 */
export async function getMedia(path) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(MEDIA_STORE, 'readonly');
        const st  = tx.objectStore(MEDIA_STORE);
        const req = st.get(path);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror   = (e) => reject(e.target.error);
    });
}

/** Delete a media file/blob by its relative path key. */
export async function deleteMedia(path) {
    if (window.electron) return window.electron.deleteMedia(path);
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE, 'readwrite');
        const req = tx.objectStore(MEDIA_STORE).delete(path);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

/* ── Meta helpers ────────────────────────────────────────────── */

/**
 * Set a meta key.
 */
export async function setMeta(key, value) {
    if (window.electron) return await window.electron.writeDB({ action: 'put', storeName: '_meta', obj: { id: key, value } });
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(META_STORE, 'readwrite');
        const st  = tx.objectStore(META_STORE);
        const req = st.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror   = (e) => reject(e.target.error);
    });
}

/**
 * Get a meta key.
 */
export async function getMeta(key) {
    if (window.electron) {
        const rows = await window.electron.readDB('_meta');
        const row = rows.find(r => r.id === key);
        if (!row) return undefined;
        let v = row.value;
        try {
            if (typeof v === 'string' && v.startsWith('{') && v.endsWith('}')) return JSON.parse(v);
            if (typeof v === 'string' && v.startsWith('[') && v.endsWith(']')) return JSON.parse(v);
            if (v === 'true') return true;
            if (v === 'false') return false;
        } catch (e) {}
        return v;
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(META_STORE, 'readonly');
        const st  = tx.objectStore(META_STORE);
        const req = st.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}

/**
 * Check if data has been loaded.
 * @returns {Promise<boolean>}
 */
export async function isDataLoaded() {
    const val = await getMeta('data_loaded');
    return val === true;
}

/**
 * Wipe everything (all stores).
 */
export async function clearAll() {
    if (window.electron) {
        const tables = [...TABLE_STORES, 'pedidos', '_meta'];
        for (const t of tables) {
            await window.electron.writeDB({ action: 'clear', storeName: t });
        }
        return;
    }
    const db = await openDB();
    const storeNames = [...db.objectStoreNames];
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeNames, 'readwrite');
        for (const name of storeNames) {
            tx.objectStore(name).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror    = (e) => reject(e.target.error);
    });
}

/**
 * Get all keys from a store
 * @param {string} storeName 
 * @returns {Promise<Array>} Array of keys
 */
export async function getAllKeys(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Resolve a stored image filename to an object URL.
 * @param {string} storedPath  - filename as stored in the SQLite DB
 * @param {string} subfolder   - optional subfolder inside src_media/
 * @returns {Promise<string|null>}
 */
export async function resolveMediaUrl(storedPath, subfolder = '') {
    if (!storedPath) return null;

    let key;
    if (storedPath.startsWith('src_media/')) {
        key = storedPath;
    } else {
        key = subfolder
            ? `src_media/${subfolder}/${storedPath}`
            : `src_media/${storedPath}`;
    }

    if (window.electron) {
        return `ij3d://${key}`;
    }

    const blob = await getMedia(key);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

/** Expose TABLE_STORES for the loader */
export { TABLE_STORES };
