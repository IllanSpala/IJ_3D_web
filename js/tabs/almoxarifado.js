/* ═══════════════════════════════════════════════════════════════
   Tab: Almoxarifado (Ferramentas & Insumos)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, escapeHtml, placeholderImg } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [];
let _displayed = 0;
let _filter = '';

export async function render(container) {
    _allItems = await idb.getAll('ferramentas_insumos');
    _displayed = 0;

    container.innerHTML = `
        <div class="card">
            <div class="card-header">📦 Almoxarifado</div>
            <div class="filter-bar">
                <input type="text" id="almox-search" placeholder="Buscar ferramenta ou insumo…">
            </div>
            <div class="items-grid" id="almox-grid"></div>
            <div class="load-more-container" id="almox-load-more"></div>
        </div>
    `;

    container.querySelector('#almox-search').addEventListener('input', (e) => {
        _filter = e.target.value.toLowerCase();
        _resetAndRender(container);
    });

    _resetAndRender(container);
}

function _getFiltered() {
    return _allItems.filter(item => {
        if (_filter) {
            const hay = `${item.nome} ${item.categoria} ${item.descricao || ''}`.toLowerCase();
            if (!hay.includes(_filter)) return false;
        }
        return true;
    });
}

function _resetAndRender(container) {
    _displayed = 0;
    container.querySelector('#almox-grid').innerHTML = '';
    _renderPage(container);
}

async function _renderPage(container) {
    const filtered = _getFiltered();
    const grid = container.querySelector('#almox-grid');
    const loadMore = container.querySelector('#almox-load-more');
    const slice = filtered.slice(_displayed, _displayed + PAGE_SIZE);

    for (const item of slice) {
        const imgUrl = await idb.resolveMediaUrl(item.caminho_foto);
        const card = document.createElement('div');
        card.className = 'item-card';

        const statusColor = (item.quantidade_status || '').toLowerCase() === 'esgotado'
            ? 'badge-depleted' : 'badge-active';

        card.innerHTML = `
            <img class="item-card-img" src="${imgUrl || placeholderImg()}" alt="${escapeHtml(item.nome)}">
            <div class="item-card-info">
                <h3>${escapeHtml(item.nome)}</h3>
                <div class="meta">
                    <span>📁 ${escapeHtml(item.categoria || '—')}</span>
                    <span><span class="badge ${statusColor}">${escapeHtml(item.quantidade_status || '—')}</span></span>
                    ${item.ultimo_valor ? `<span>💰 ${formatBRL(item.ultimo_valor)}</span>` : ''}
                </div>
            </div>
        `;
        grid.appendChild(card);
    }

    _displayed += slice.length;

    if (_displayed < filtered.length) {
        loadMore.innerHTML = `<button class="btn btn-ghost" id="almox-more-btn">Carregar mais (${filtered.length - _displayed} restantes)</button>`;
        loadMore.querySelector('#almox-more-btn').addEventListener('click', () => _renderPage(container));
    } else {
        loadMore.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📦</span>Nenhum item encontrado.</div>`;
        }
    }
}
