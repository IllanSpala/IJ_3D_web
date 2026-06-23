/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — backup-loader.js
   Reads a .zip backup exported from the Windows desktop app,
   extracts the SQLite DB + media files, and populates IndexedDB.
   ═══════════════════════════════════════════════════════════════ */

import * as idb from './db.js';

/**
 * Process a backup .zip File.
 *
 * @param {File}     file     - The .zip from <input> or drag-and-drop
 * @param {Function} onProgress - callback(percent: number, label: string)
 * @returns {Promise<{tables: number, media: number}>}
 */
export async function processBackup(file, onProgress = () => {}) {
    onProgress(2, 'Descompactando arquivo…');

    /* 1 ── Unzip ────────────────────────────────────────────── */
    const zip = await JSZip.loadAsync(file);

    /* 2 ── Locate SQLite DB ─────────────────────────────────── */
    const dbEntry = zip.file('print_manager_v2.db');
    if (!dbEntry) {
        throw new Error(
            'Backup inválido: o arquivo "print_manager_v2.db" não foi encontrado dentro do .zip.\n\n'
            + 'Certifique-se de que este arquivo foi exportado pelo botão 💾 do app desktop.'
        );
    }

    onProgress(10, 'Lendo banco de dados…');
    const dbBuffer = await dbEntry.async('arraybuffer');

    /* 3 ── Open with sql.js ─────────────────────────────────── */
    onProgress(20, 'Inicializando leitor SQLite…');
    const SQL = await initSqlJs({
        locateFile: (f) => `lib/${f}`
    });
    const sqlDb = new SQL.Database(new Uint8Array(dbBuffer));

    /* 4 ── Discover tables ──────────────────────────────────── */
    onProgress(30, 'Extraindo tabelas…');
    const tableResult = sqlDb.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const tableNames = tableResult.length > 0
        ? tableResult[0].values.map(r => r[0])
        : [];

    /* 5 ── Extract each table → IndexedDB ───────────────────── */
    let tablesProcessed = 0;
    const totalTables = tableNames.length;

    for (const tableName of tableNames) {
        const pct = 30 + Math.round((tablesProcessed / totalTables) * 30);
        onProgress(pct, `Tabela: ${tableName}…`);

        try {
            const result = sqlDb.exec(`SELECT * FROM "${tableName}"`);
            if (result.length > 0) {
                const columns = result[0].columns;
                const rows = result[0].values.map(row => {
                    const obj = {};
                    columns.forEach((col, i) => { obj[col] = row[i]; });
                    return obj;
                });
                await idb.putAll(tableName, rows);
            }
        } catch (err) {
            console.warn(`[backup-loader] Skipping table "${tableName}":`, err.message);
        }
        tablesProcessed++;
    }

    sqlDb.close();

    /* 6 ── Extract media files ──────────────────────────────── */
    onProgress(65, 'Extraindo imagens…');
    const mediaFiles = Object.keys(zip.files).filter(
        path => path.startsWith('src_media/') && !zip.files[path].dir
    );

    let mediaProcessed = 0;
    const totalMedia = mediaFiles.length;

    // Clear old media first
    await idb.clearStore('media');

    for (const path of mediaFiles) {
        const pct = 65 + Math.round((mediaProcessed / Math.max(totalMedia, 1)) * 30);
        onProgress(pct, `Imagem ${mediaProcessed + 1}/${totalMedia}…`);

        try {
            const blob = await zip.file(path).async('blob');
            await idb.putMedia(path, blob);
        } catch (err) {
            console.warn(`[backup-loader] Skipping media "${path}":`, err.message);
        }
        mediaProcessed++;
    }

    /* 7 ── Mark as loaded ───────────────────────────────────── */
    onProgress(98, 'Finalizando…');
    await idb.setMeta('data_loaded', true);
    await idb.setMeta('loaded_at', new Date().toISOString());
    await idb.setMeta('backup_name', file.name);

    onProgress(100, 'Concluído!');

    return { tables: tablesProcessed, media: mediaProcessed };
}
