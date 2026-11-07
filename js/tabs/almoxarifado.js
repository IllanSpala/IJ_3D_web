/* ═══════════════════════════════════════════════════════════════
   Tab: Almoxarifado (CRUD Completo)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, escapeHtml, placeholderImg, statusBadgeClass, compressImage } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [];
let _displayed = 0;
let _filter = '';
let _statusFilter = 'Ativo'; // Default filter

// Only explicit legacy account categories are migrated; equipment names are ambiguous.
function isAccount(item) {
    if (item.e_conta != null) return [true, 1, '1', 'true'].includes(item.e_conta);
    return ['conta', 'contas', 'contas mensais'].includes(String(item.categoria || '').trim().toLowerCase());
}

export async function render(container) {
    let rawItems = await idb.getAll('ferramentas_insumos');
    let updated = false;
    _allItems = rawItems.map(item => {
        if (item.e_conta == null) {
            item.e_conta = isAccount(item);
            updated = true;
        }
        if (!item.status) {
            const oldStatus = (item.quantidade_status || '').toLowerCase();
            item.status = oldStatus.includes('esgotado') ? 'Esgotado' : 'Ativo';
            item.quantidade = item.quantidade_status || '';
            updated = true;
        }
        return item;
    });

    if (updated) { await idb.putAll('ferramentas_insumos', _allItems); }
    _displayed = 0;

    container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>📦 Almoxarifado</span>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn btn-ghost" id="almox-costs-btn" title="Ver contas mensais" aria-label="Custos — contas mensais">▤ Custos</button>
                    <button class="btn btn-primary" id="almox-add-btn">+ Adicionar Insumo</button>
                </div>
            </div>
            <div class="filter-bar">
                <input type="text" id="almox-search" placeholder="Buscar ferramenta ou insumo…">
                <select id="almox-status-filter">
                    <option value="all">Todos</option>
                    <option value="Ativo" selected>Ativos</option>
                    <option value="Esgotado">Esgotados</option>
                </select>
            </div>
            <div class="items-grid almox-grid" id="almox-grid"></div>
            <div class="load-more-container" id="almox-load-more"></div>
        </div>

        <dialog id="almox-costs-dialog" class="almox-costs-dialog" aria-labelledby="almox-costs-title">
            <div class="calc-gallery-header">
                <div><h2 id="almox-costs-title">Custos</h2><p>Contas mensais, como energia e internet.</p></div>
                <button class="calc-modal-close" id="almox-costs-close" aria-label="Fechar custos">✕</button>
            </div>
            <div id="almox-costs-total"></div>
            <div id="almox-costs-list" class="items-grid almox-grid"></div>
            <button class="btn btn-ghost" id="almox-costs-add">+ Adicionar conta</button>
        </dialog>
        <!-- Modal CRUD -->
        <div id="almox-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:800;"></div>
        <div id="almox-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:1000; min-width:400px; box-shadow:0 8px 32px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:#00a2ff;" id="almox-modal-title">Adicionar Insumo</h3>
            <input type="hidden" id="almox-id">

            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                <label>Nome <input type="text" id="almox-nome" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="almox-conta"> É uma conta mensal</label>
                <small>Contas ficam na janela Custos. Cada lançamento representa uma conta; não gera cobranças automáticas.</small>
                <label>Categoria <input type="text" id="almox-categoria" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Preço/Último Valor (R$) <input type="number" step="0.01" id="almox-preco" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Link <input type="text" id="almox-link" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Quantidade (Opcional)
                    <input type="text" id="almox-quantidade" placeholder="Ex: 5 unidades, 2kg..." style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                </label>
                <label>Status
                    <select id="almox-status" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                        <option value="Ativo">Ativo</option>
                        <option value="Esgotado">Esgotado</option>
                    </select>
                </label>
                <label>Foto (Opcional) <input type="file" id="almox-foto" accept="image/*" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-ghost" id="almox-cancel-btn">Cancelar</button>
                <button class="btn btn-success" id="almox-save-btn">Salvar</button>
            </div>
        </div>
    `;

    container.querySelector('#almox-search').addEventListener('input', (e) => {
        _filter = e.target.value.toLowerCase();
        _resetAndRender(container);
    });

    container.querySelector('#almox-status-filter').addEventListener('change', (e) => {
        _statusFilter = e.target.value;
        _resetAndRender(container);
    });

    const costsDialog = container.querySelector('#almox-costs-dialog');
    container.querySelector('#almox-costs-btn').addEventListener('click', () => {
        _renderCosts(container);
        costsDialog.showModal();
    });
    container.querySelector('#almox-costs-close').addEventListener('click', () => costsDialog.close());
    costsDialog.addEventListener('click', e => {
        if (e.target === costsDialog) {
            const rect = costsDialog.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) costsDialog.close();
        }
    });
    container.querySelector('#almox-costs-add').addEventListener('click', () => {
        costsDialog.close();
        container.querySelector('#almox-add-btn').click();
        container.querySelector('#almox-conta').checked = true;
        container.querySelector('#almox-categoria').value = 'CONTAS';
        container.querySelector('#almox-modal-title').textContent = 'Adicionar Conta';
    });

    const overlay = container.querySelector('#almox-modal-overlay');
    const modal = container.querySelector('#almox-modal');

    container.querySelector('#almox-add-btn').addEventListener('click', () => {
        container.querySelector('#almox-modal-title').textContent = 'Adicionar Insumo';
        container.querySelector('#almox-id').value = '';
        container.querySelector('#almox-conta').checked = false;
        container.querySelector('#almox-nome').value = '';
        container.querySelector('#almox-categoria').value = '';
        container.querySelector('#almox-preco').value = '0';
        container.querySelector('#almox-link').value = '';
        container.querySelector('#almox-quantidade').value = '';
        container.querySelector('#almox-status').value = 'Ativo';
        container.querySelector('#almox-foto').value = '';

        overlay.style.display = 'block';
        modal.style.display = 'block';
    });

    container.querySelector('#almox-cancel-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    });

    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    });

    container.querySelector('#almox-save-btn').addEventListener('click', async () => {
        const idVal = container.querySelector('#almox-id').value;
        const fotoInput = container.querySelector('#almox-foto');
        const existingItem = idVal
            ? _allItems.find(x => String(x.id) === String(idVal))
            : null;

        let caminho_foto = null;
        if (existingItem) {
            caminho_foto = existingItem.caminho_foto;
        }

        if (fotoInput.files && fotoInput.files.length > 0) {
            const file = fotoInput.files[0];
            try {
                const compressedBlob = await compressImage(file, 800, 0.8);
                const filename = `almoxarifado/${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}.webp`;
                await idb.putMedia('src_media/' + filename, compressedBlob);
                caminho_foto = filename;
            } catch(e) {
                console.error("Erro ao comprimir imagem:", e);
                alert("Falha ao comprimir imagem. O insumo será salvo sem foto.");
            }
        }

        const novo = {
            // Manter os metadados da compra ao editar (inclusive ao marcar como
            // esgotado). Sem isso, withAutomaticDate() entendia a edição como
            // uma nova entrada e o gasto reaparecia com a data atual no DRE.
            ...(existingItem || {}),
            id: idVal ? Number(idVal) : Date.now(),
            e_conta: container.querySelector('#almox-conta').checked,
            nome: container.querySelector('#almox-nome').value.trim() || 'Insumo',
            categoria: container.querySelector('#almox-categoria').value.trim() || 'Geral',
            ultimo_valor: parseFloat(container.querySelector('#almox-preco').value) || 0,
            link_compra: container.querySelector('#almox-link').value.trim(),
            quantidade: container.querySelector('#almox-quantidade').value.trim(),
            status: container.querySelector('#almox-status').value,
            quantidade_status: container.querySelector('#almox-status').value, // Fallback for old codebase compat if any
            caminho_foto: caminho_foto
        };

        if (idVal) {
            const idx = _allItems.findIndex(x => String(x.id) === String(novo.id));
            if (idx > -1) {
                _allItems[idx] = novo;
            }
        } else {
            _allItems.push(novo);
        }

        await idb.putAll('ferramentas_insumos', _allItems);
        overlay.style.display = 'none';
        modal.style.display = 'none';
        _resetAndRender(container);
    });

    _resetAndRender(container);
}

function _getFiltered() {
    return _allItems.filter(item => {
        if (isAccount(item)) return false;
        if (_statusFilter !== 'all' && (item.status || 'Ativo') !== _statusFilter) return false;
        if (_filter) {
            const hay = `${item.nome} ${item.categoria} ${item.descricao || ''}`.toLowerCase();
            if (!hay.includes(_filter)) return false;
        }
        return true;
    });
}

function _resetAndRender(container) {
    _displayed = 0;
    if (container.querySelector('#almox-costs-dialog').open) _renderCosts(container);
    const grid = container.querySelector('#almox-grid');
    if (grid) grid.innerHTML = '';
    _renderPage(container);
}

async function _renderPage(container) {
    const filtered = _getFiltered();
    const grid = container.querySelector('#almox-grid');
    if (!grid) return;
    const loadMore = container.querySelector('#almox-load-more');
    const slice = filtered.slice(_displayed, _displayed + PAGE_SIZE);

    for (const item of slice) {
        const imgUrl = await idb.resolveMediaUrl(item.caminho_foto);
        const card = document.createElement('div');
        card.className = 'item-card almox-item-card';

        card.innerHTML = _itemCardHTML(item, imgUrl);
        grid.appendChild(card);
    }

    _displayed += slice.length;

    _bindActions(container);

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

function _bindActions(container) {
    // Edit Events
    container.querySelectorAll('.almox-edit-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(e.target.closest('button').dataset.id);
            const item = _allItems.find(x => String(x.id) === String(itemId));
            if (!item) return;

            container.querySelector('#almox-costs-dialog').close();
            container.querySelector('#almox-conta').checked = isAccount(item);
            container.querySelector('#almox-modal-title').textContent = isAccount(item) ? 'Editar Conta' : 'Editar Insumo';
            container.querySelector('#almox-id').value = item.id;
            container.querySelector('#almox-nome').value = item.nome || '';
            container.querySelector('#almox-categoria').value = item.categoria || '';
            container.querySelector('#almox-preco').value = item.ultimo_valor || 0;
            container.querySelector('#almox-link').value = item.link_compra || '';
            container.querySelector('#almox-quantidade').value = item.quantidade || '';
            container.querySelector('#almox-status').value = item.status || 'Ativo';
            container.querySelector('#almox-foto').value = '';

            container.querySelector('#almox-modal-overlay').style.display = 'block';
            container.querySelector('#almox-modal').style.display = 'block';
        });
    });

    // Delete Events
    container.querySelectorAll('.almox-del-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener('click', async (e) => {
            const itemId = parseInt(e.target.closest('button').dataset.id);
            if (confirm('Tem certeza que deseja excluir este insumo?')) {
                _allItems = _allItems.filter(x => String(x.id) !== String(itemId));
                await idb.putAll('ferramentas_insumos', _allItems);
                _resetAndRender(container);
            }
        });
    });

}

function _renderCosts(container) {
    const accounts = _allItems.filter(isAccount);
    const total = accounts.reduce((sum, item) => sum + (Number(item.ultimo_valor) || 0), 0);
    container.querySelector('#almox-costs-total').textContent = `${accounts.length} conta(s) · Total lançado: ${formatBRL(total)}`;
    const grid = container.querySelector('#almox-costs-list');
    grid.innerHTML = accounts.length ? accounts.map(item => `
        <article class="item-card almox-item-card">${_itemCardHTML(item, null)}</article>`).join('')
        : '<div class="empty-state">Nenhuma conta cadastrada. Use “Adicionar conta” para começar.</div>';
    // Render the same card immediately, then fill its stored photo when available.
    const cards = grid.querySelectorAll('.almox-item-card');
    accounts.forEach(async (item, index) => {
        try {
            const url = await idb.resolveMediaUrl(item.caminho_foto);
            if (url && cards[index]?.isConnected) cards[index].querySelector('img').src = url;
        } catch (err) {
            console.error('Erro ao carregar foto da conta:', err);
        }
    });
    _bindActions(container);
}

function _itemCardHTML(item, imgUrl) {
        const statusColor = (item.status === 'Esgotado') ? 'badge-depleted' : 'badge-active';

        return `
            <div class="almox-card-actions">
                <button class="almox-card-action almox-edit-btn" data-id="${item.id}" title="Editar" aria-label="Editar ${escapeHtml(item.nome)}">✏️</button>
                <button class="almox-card-action almox-del-btn" data-id="${item.id}" title="Excluir" aria-label="Excluir ${escapeHtml(item.nome)}">🗑️</button>
            </div>
            <img class="item-card-img almox-card-img" src="${imgUrl || placeholderImg()}" alt="${escapeHtml(item.nome)}">
            <div class="item-card-info almox-card-info">
                <h3 title="${escapeHtml(item.nome)}">${escapeHtml(item.nome)}</h3>
                <div class="almox-card-details">
                    <span title="Categoria: ${escapeHtml(item.categoria || '—')}">📁 ${escapeHtml(item.categoria || '—')}</span>
                    <span>💰 ${formatBRL(item.ultimo_valor || 0)}</span>
                    ${item.quantidade ? `<span title="Quantidade: ${escapeHtml(item.quantidade)}">📦 ${escapeHtml(item.quantidade)}</span>` : ''}
                </div>
                <span class="badge ${statusColor} almox-status-badge">${escapeHtml(item.status || 'Ativo')}</span>
            </div>
        `;
}
