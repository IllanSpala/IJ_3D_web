/* ═══════════════════════════════════════════════════════════════
   Tab: Acervo (Catálogo de Peças)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, formatDate, escapeHtml, placeholderImg } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [];
let _displayed = 0;
let _filter = '';

export async function render(container) {
    _allItems = await idb.getAll('acervo');
    _displayed = 0;

    container.innerHTML = `
        <div class="card">
            <div class="card-header">📚 Acervo de Peças</div>
            <div class="filter-bar">
                <input type="text" id="acervo-search" placeholder="Buscar peça…">
            </div>
            <div class="items-grid" id="acervo-grid"></div>
            <div class="load-more-container" id="acervo-load-more"></div>
        </div>
    `;

    container.querySelector('#acervo-search').addEventListener('input', (e) => {
        _filter = e.target.value.toLowerCase();
        _resetAndRender(container);
    });

    _resetAndRender(container);
}

function _getFiltered() {
    return _allItems.filter(a => {
        if (_filter) {
            const hay = `${a.nome_peca} ${a.descricao || ''}`.toLowerCase();
            if (!hay.includes(_filter)) return false;
        }
        return true;
    });
}

function _resetAndRender(container) {
    _displayed = 0;
    container.querySelector('#acervo-grid').innerHTML = '';
    _renderPage(container);
}

async function _renderPage(container) {
    const filtered = _getFiltered();
    const grid = container.querySelector('#acervo-grid');
    const loadMore = container.querySelector('#acervo-load-more');
    const slice = filtered.slice(_displayed, _displayed + PAGE_SIZE);

    for (const a of slice) {
        const imgUrl = await idb.resolveMediaUrl(a.caminho_foto);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img class="item-card-img" src="${imgUrl || placeholderImg()}" alt="${escapeHtml(a.nome_peca)}">
            <div class="item-card-info">
                <h3>${escapeHtml(a.nome_peca)}</h3>
                <div class="meta">
                    <span>📅 ${formatDate(a.data_registro)}</span>
                    ${a.tempo_impressao ? `<span>⏱ ${escapeHtml(a.tempo_impressao)}</span>` : ''}
                    ${a.preco_custo ? `<span>💰 ${formatBRL(a.preco_custo)}</span>` : ''}
                    ${a.descricao ? `<span>${escapeHtml(a.descricao).substring(0, 60)}</span>` : ''}
                </div>
            </div>
        `;
        grid.appendChild(card);
    }

    _displayed += slice.length;

    if (_displayed < filtered.length) {
        loadMore.innerHTML = `<button class="btn btn-ghost" id="acervo-more-btn">Carregar mais (${filtered.length - _displayed} restantes)</button>`;
        loadMore.querySelector('#acervo-more-btn').addEventListener('click', () => _renderPage(container));
    } else {
        loadMore.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📚</span>Nenhuma peça encontrada.</div>`;
        }
    }
}
