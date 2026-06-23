/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — db.js
   IndexedDB abstraction layer.
   Mirrors the SQLite tables from the desktop app.
   ═══════════════════════════════════════════════════════════════ */

const DB_NAME    = 'IJ3D_WebCache';
const DB_VERSION = 1;

/* Tables from core/database.py that we replicate as object stores. */
const TABLE_STORES = [
    'configuracoes',
    'filamentos',
    'acervo',
    'acervo_filamentos',
    'acervo_impressoes',
    'acervo_fotos_extras',
    'hist_impressoes',
    'hist_filamentos',
    'hist_fotos',
    'kits_acervo',
    'kit_itens',
    'ferramentas_insumos',
    'pedidos_v2',
    'pedidos_itens',
    'manutencao',
    'historico_impressao',
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
    const db = await openDB();
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const st = tx.objectStore(storeName);
        st.clear();
        for (const row of rows) {
            st.add(row);
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(storeName, 'readonly');
        const st  = tx.objectStore(storeName);
        const req = st.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = (e) => reject(e.target.error);
    });
}

/* ── Media (Blob) helpers ────────────────────────────────────── */

/**
 * Store a media Blob by its relative path key.
 */
export async function putMedia(path, blob) {
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

/* ── Meta helpers ────────────────────────────────────────────── */

/**
 * Set a meta key.
 */
export async function setMeta(key, value) {
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
 * Resolve a stored image filename to an object URL.
 * @param {string} storedPath  - filename as stored in the SQLite DB
 * @param {string} subfolder   - optional subfolder inside src_media/
 * @returns {Promise<string|null>}
 */
export async function resolveMediaUrl(storedPath, subfolder = '') {
    if (!storedPath) return null;

    // Build the key as it appears inside the zip
    let key;
    if (storedPath.startsWith('src_media/')) {
        key = storedPath;
    } else {
        key = subfolder
            ? `src_media/${subfolder}/${storedPath}`
            : `src_media/${storedPath}`;
    }

    const blob = await getMedia(key);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

/** Expose TABLE_STORES for the loader */
export { TABLE_STORES };
