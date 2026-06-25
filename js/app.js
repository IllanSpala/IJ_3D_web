/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — app.js
   Main SPA orchestrator: barrier screen ↔ tab navigation.
   ═══════════════════════════════════════════════════════════════ */

import * as idb from './db.js';
import { processBackup } from './backup-loader.js';

/* ── Tab module registry ─────────────────────────────────────── */
const TABS = [
    { id: 'filamentos',   icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',  label: 'Filamentos',   mod: () => import('./tabs/filamentos.js') },
    { id: 'almoxarifado', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>', label: 'Almoxarifado', mod: () => import('./tabs/almoxarifado.js') },
    { id: 'acervo',       icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', label: 'Acervo',       mod: () => import('./tabs/acervo.js') },
    { id: 'kits',         icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>', label: 'Kits',         mod: () => import('./tabs/kits.js') },
    { id: 'pedidos',      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>', label: 'Pedidos',      mod: () => import('./tabs/pedidos.js') },
    { id: 'historico',    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',  label: 'Histórico',    mod: () => import('./tabs/historico.js') },
    { id: 'financeiro',   icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', label: 'Financeiro',   mod: () => import('./tabs/financeiro.js') }
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

    // Click to browse
    zone.addEventListener('click', () => input.click());
    input.addEventListener('click', (e) => e.stopPropagation()); // Previne loop infinito
    
    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0], bar, label);
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
    if (!file.name.endsWith('.zip')) {
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

    // Bottom: re-import
    bottom.innerHTML = '';

    const btnReload = document.createElement('button');
    btnReload.className = 'sidebar-btn btn-export';
    btnReload.dataset.tooltip = 'Carregar Backup';
    btnReload.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';
    btnReload.addEventListener('click', async () => {
        if (confirm('Carregar um novo backup? (os dados atuais serão substituídos)')) {
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
