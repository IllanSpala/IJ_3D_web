/* ═══════════════════════════════════════════════════════════════
   Tab: Filamentos
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, formatWeight, statusBadgeClass, escapeHtml, placeholderImg } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [];
let _displayed = 0;
let _filter = '';
let _statusFilter = 'all';

export async function render(container) {
    _allItems = await idb.getAll('filamentos');
    _displayed = 0;

    container.innerHTML = `
        <div class="card">
            <div class="card-header">⚙ Filamentos</div>
            <div class="filter-bar">
                <input type="text" id="fil-search" placeholder="Buscar por marca, material ou cor…">
                <select id="fil-status-filter">
                    <option value="all">Todos</option>
                    <option value="Ativo" selected>Ativos</option>
                    <option value="Arquivado">Arquivados</option>
                    <option value="Esgotado">Esgotados</option>
                </select>
            </div>
            <div class="items-grid" id="fil-grid"></div>
            <div class="load-more-container" id="fil-load-more"></div>
        </div>
    `;

    const searchEl = container.querySelector('#fil-search');
    const statusEl = container.querySelector('#fil-status-filter');

    searchEl.addEventListener('input', (e) => { _filter = e.target.value.toLowerCase(); _resetAndRender(container); });
    statusEl.addEventListener('change', (e) => { _statusFilter = e.target.value; _resetAndRender(container); });

    _statusFilter = 'Ativo';
    _resetAndRender(container);
}

function _getFiltered() {
    return _allItems.filter(f => {
        if (_statusFilter !== 'all' && (f.status || 'Ativo') !== _statusFilter) return false;
        if (_filter) {
            const hay = `${f.marca} ${f.material} ${f.cor} ${f.descricao || ''}`.toLowerCase();
            if (!hay.includes(_filter)) return false;
        }
        return true;
    });
}

function _resetAndRender(container) {
    _displayed = 0;
    const grid = container.querySelector('#fil-grid');
    grid.innerHTML = '';
    _renderPage(container);
}

async function _renderPage(container) {
    const filtered = _getFiltered();
    const grid = container.querySelector('#fil-grid');
    const loadMore = container.querySelector('#fil-load-more');
    const slice = filtered.slice(_displayed, _displayed + PAGE_SIZE);

    for (const f of slice) {
        const imgUrl = await idb.resolveMediaUrl(f.caminho_foto);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img class="item-card-img" src="${imgUrl || placeholderImg()}" alt="${escapeHtml(f.cor)}">
            <div class="item-card-info">
                <h3>${escapeHtml(f.marca)} ${escapeHtml(f.material)}</h3>
                <div class="meta">
                    <span>🎨 ${escapeHtml(f.cor)}</span>
                    <span>⚖ ${formatWeight(f.peso_atual)} / ${formatWeight(f.peso_inicial)}</span>
                    <span>💰 ${formatBRL(f.preco_rolo)}</span>
                    <span><span class="badge ${statusBadgeClass(f.status || 'Ativo')}">${escapeHtml(f.status || 'Ativo')}</span></span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    }

    _displayed += slice.length;

    if (_displayed < filtered.length) {
        loadMore.innerHTML = `<button class="btn btn-ghost" id="fil-more-btn">Carregar mais (${filtered.length - _displayed} restantes)</button>`;
        loadMore.querySelector('#fil-more-btn').addEventListener('click', () => _renderPage(container));
    } else {
        loadMore.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🎯</span>Nenhum filamento encontrado.</div>`;
        }
    }
}
