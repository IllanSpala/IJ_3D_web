/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — app.js
   Main SPA orchestrator: barrier screen ↔ tab navigation.
   ═══════════════════════════════════════════════════════════════ */

import * as idb from './db.js';
import { processBackup } from './backup-loader.js';
import { exportBackup } from './backup-exporter.js';

/* ── Tab module registry ─────────────────────────────────────── */
const CACHE_VER = Date.now(); // Cache buster to ensure latest tab JS loads
const TABS = [
    { id: 'filamentos',   icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',  label: 'Filamentos',   mod: () => import('./tabs/filamentos.js?v=' + CACHE_VER) },
    { id: 'almoxarifado', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>', label: 'Almoxarifado', mod: () => import('./tabs/almoxarifado.js?v=' + CACHE_VER) },
    { id: 'financeiro',   icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>', label: 'Calculadora', mod: () => import('./tabs/financeiro.js?v=' + CACHE_VER) },
    { id: 'pedidos',      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>', label: 'Pedidos',      mod: () => import('./tabs/pedidos.js?v=' + CACHE_VER) },
    { id: 'producao',     icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="9"></rect><rect x="14" y="7" width="3" height="5"></rect></svg>', label: 'Produção (Sprint)', mod: () => import('./tabs/producao.js?v=' + CACHE_VER) },
    { id: 'historico',    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',  label: 'Histórico',    mod: () => import('./tabs/historico.js?v=' + CACHE_VER) },
    { id: 'sumario',      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', label: 'Sumário',      mod: () => import('./tabs/sumario.js?v=' + CACHE_VER) }
];

let _activeTabId = null;
const _tabCache = {};   // module cache

async function boot() {
    try {
        const loaded = await idb.isDataLoaded();
        if (loaded) {
            showApp();
        } else {
            showBarrier();
        }
    } catch (err) {
        console.error("Boot error:", err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

/* ═══════════════════════════════════════════════════════════════
   Barrier Screen (Upload Gate)
   ═══════════════════════════════════════════════════════════════ */
function showBarrier() {
    document.getElementById('app-shell').style.display = 'none';
    const barrier = document.getElementById('barrier-screen');
    barrier.style.display = 'flex';

    const zone   = document.getElementById('upload-zone');
    const input  = document.getElementById('upload-input');
    const bar    = document.getElementById('progress-fill');
    const label  = document.getElementById('progress-label');

    // O campo de arquivo cobre a área de upload de forma transparente. Assim,
    // o clique é uma ativação nativa (inclusive no Electron), sem input.click().
    input.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0], bar, label);
        }
    });

    // Drag-and-drop
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0], bar, label);
    });
}

async function handleFile(file, bar, label) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
        label.textContent = 'Formato inválido. Selecione um .zip';
        label.style.color = '#f87171';
        return;
    }

    label.style.color = '';
    try {
        const stats = await processBackup(file, (pct, msg) => {
            bar.style.width = pct + '%';
            label.textContent = msg;
        });
        label.textContent = `${stats.tables} tabelas · ${stats.media} imagens carregadas`;
        setTimeout(() => showApp(), 800);
    } catch (err) {
        bar.style.width = '0%';
        label.textContent = `Erro: ${err.message}`;
        label.style.color = '#f87171';
        console.error('[backup]', err);
    }
}

/* ═══════════════════════════════════════════════════════════════
   App Shell (Sidebar + Tabs)
   ═══════════════════════════════════════════════════════════════ */
function showApp() {
    document.getElementById('barrier-screen').style.display = 'none';
    const shell = document.getElementById('app-shell');
    shell.style.display = 'flex';

    buildSidebar();
    switchTab(TABS[0].id);
    checkBackupStatus();
}

function checkBackupStatus() {
    const lastBackup   = localStorage.getItem('lastBackupDate');
    const lastDismiss  = localStorage.getItem('backupToastDismissed');
    const now = Date.now();
    const isOld        = !lastBackup  || (now - parseInt(lastBackup))  > (24 * 60 * 60 * 1000);
    const isDismissed  = lastDismiss  && (now - parseInt(lastDismiss)) < (24 * 60 * 60 * 1000);

    if (isOld && !isDismissed) {
        const toast = document.createElement('div');
        toast.id = 'backup-toast';
        toast.style = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(220,38,38,0.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;padding:12px 24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:16px;z-index:9000;font-family:sans-serif;font-weight:600;border:1px solid rgba(255,255,255,0.2);';
        toast.innerHTML = `
            <span>⚠️ Atenção: Seu último backup tem mais de 24 horas. Exporte os dados agora para evitar perda!</span>
            <button style="background:#fff;color:#dc2626;border:none;padding:6px 14px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="document.getElementById('btn-export-backup').click();">Exportar Agora</button>
            <button title="Fechar" style="background:rgba(255,255,255,0.15);color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;" onclick="localStorage.setItem('backupToastDismissed', Date.now()); this.closest('#backup-toast').remove();">✕</button>
        `;
        document.body.appendChild(toast);
    }
}

function buildSidebar() {
    const nav    = document.getElementById('sidebar-nav');
    const bottom = document.getElementById('sidebar-bottom');
    nav.innerHTML = '';

    for (const tab of TABS) {
        const btn = document.createElement('button');
        btn.className = 'sidebar-btn';
        btn.dataset.tab = tab.id;
        btn.dataset.tooltip = tab.label;
        btn.innerHTML = tab.icon;
        btn.addEventListener('click', () => switchTab(tab.id));
        nav.appendChild(btn);
    }

    // Bottom: re-import and export
    bottom.innerHTML = '';

    const btnExport = document.createElement('button');
    btnExport.id = 'btn-export-backup';
    btnExport.className = 'sidebar-btn btn-export';
    btnExport.dataset.tooltip = 'Exportar Backup (.zip)';
    btnExport.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
    btnExport.addEventListener('click', async () => {
        // We need a simple progress overlay
        const ov = document.createElement('div');
        ov.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;';
        ov.innerHTML = `<h3>Exportando Backup...</h3><div style="width:300px;background:#333;height:8px;border-radius:4px;margin-top:10px;"><div id="exp-bar" style="width:0%;height:100%;background:#4ade80;border-radius:4px;transition:0.2s;"></div></div><div id="exp-lbl" style="margin-top:10px;font-size:0.8rem;color:#aaa;">Preparando...</div>`;
        document.body.appendChild(ov);
        const bar = ov.querySelector('#exp-bar');
        const lbl = ov.querySelector('#exp-lbl');
        try {
            await exportBackup((pct, msg) => {
                bar.style.width = pct + '%';
                lbl.textContent = msg;
            });
            lbl.textContent = 'Download iniciado!';
            localStorage.setItem('lastBackupDate', Date.now());
            const toast = document.getElementById('backup-toast');
            if (toast) toast.remove();
            setTimeout(() => ov.remove(), 1500);
        } catch(e) {
            lbl.textContent = 'Erro: ' + e.message;
            bar.style.background = '#f87171';
            setTimeout(() => ov.remove(), 3000);
        }
    });
    bottom.appendChild(btnExport);

    const btnReload = document.createElement('button');
    btnReload.className = 'sidebar-btn btn-export';
    btnReload.dataset.tooltip = 'Carregar Novo Backup (Limpar)';
    btnReload.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';
    btnReload.addEventListener('click', async () => {
        if (confirm('Carregar um novo backup? (os dados atuais serão apagados e substituídos)')) {
            await idb.clearAll();
            location.reload();
        }
    });
    bottom.appendChild(btnReload);
}

async function switchTab(tabId) {
    _activeTabId = tabId;

    // Highlight sidebar button
    document.querySelectorAll('.sidebar-btn[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Get or create tab pane
    const mainContent = document.getElementById('main-content');
    const tabDef = TABS.find(t => t.id === tabId);
    if (!tabDef) return;

    // Hide all panes
    mainContent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    let pane = document.getElementById(`pane-${tabId}`);
    if (!pane) {
        pane = document.createElement('div');
        pane.id = `pane-${tabId}`;
        pane.className = 'tab-pane';
        mainContent.appendChild(pane);
    }

    pane.classList.add('active');

    // Render tab content (lazy-load module)
    if (!_tabCache[tabId]) {
        _tabCache[tabId] = await tabDef.mod();
    }
    pane.innerHTML = '';
    await _tabCache[tabId].render(pane);
}
