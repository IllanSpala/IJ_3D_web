/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — backup-exporter.js
   Exports IndexedDB state back into a .zip containing print_manager_v2.db
   and the src_media folder, allowing full bilateral sync with the desktop app.
   ═══════════════════════════════════════════════════════════════ */

import * as idb from './db.js';

export async function exportBackup(onProgress = () => {}) {
    onProgress(10, 'Iniciando exportação SQLite...');
    
    const SQL = await initSqlJs({
        locateFile: (f) => `lib/${f}`
    });
    
    const db = new SQL.Database();
    const stores = [
        'configuracoes', 'filamentos', 'hist_impressoes', 'hist_filamentos', 
        'hist_fotos', 'ferramentas_insumos', 'pedidos', 'pedidos_v2', 
        'pedidos_itens', 'manutencao', 'historico_impressao', 
        'producao_partes', 'producao_pedidos', 'historico_sprints', 'vendas_manuais'
    ];
    
    let processed = 0;
    for (const store of stores) {
        onProgress(10 + Math.round((processed / stores.length) * 40), `Exportando tabela: ${store}`);
        const items = await idb.getAll(store);
        
        if (items.length > 0) {
            const keys = new Set();
            items.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
            
            // Se nao tiver 'id' primary key em pedidos_itens e acervo_filamentos, tratar:
            // SQLite precisa de schemas corretos, faremos dinamico e permitimos SQLite gerenciar os tipos.
            const colDefs = Array.from(keys).map(k => {
                if (k === 'id') return 'id INTEGER PRIMARY KEY';
                return `"${k}" TEXT`;
            }).join(', ');
            
            try {
                db.exec(`CREATE TABLE "${store}" (${colDefs})`);
                
                items.forEach(obj => {
                    const cols = Object.keys(obj).map(k => `"${k}"`).join(', ');
                    const vals = Object.values(obj).map(v => {
                        if (v === null || v === undefined) return 'NULL';
                        if (typeof v === 'number') return v;
                        return `'${String(v).replace(/'/g, "''")}'`;
                    }).join(', ');
                    db.exec(`INSERT INTO "${store}" (${cols}) VALUES (${vals})`);
                });
            } catch (err) {
                console.warn(`Erro ao exportar tabela ${store}`, err);
            }
        }
        processed++;
    }
    
    onProgress(60, 'Gerando buffer do banco de dados...');
    const dbData = db.export();
    
    onProgress(70, 'Construindo arquivo ZIP...');
    const zip = new JSZip();
    zip.file('print_manager_v2.db', dbData);
    
    const mediaFolder = zip.folder('src_media');
    
    onProgress(80, 'Exportando imagens e mídias...');
    const mediaKeys = await idb.getAllKeys('media');
    for (const mediaPath of mediaKeys) {
        const mediaBlob = await idb.getMedia(mediaPath);
        if (mediaBlob) {
            // strip src_media/ if it starts with it, so we don't nest src_media/src_media/
            const relativePath = mediaPath.replace(/^src_media[\/\\]/, '');
            mediaFolder.file(relativePath, mediaBlob);
        }
    }
    
    onProgress(95, 'Finalizando download...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    downloadLink.download = `backup_ij3d_${timestamp}.zip`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);
    
    onProgress(100, 'Backup concluído!');
}
