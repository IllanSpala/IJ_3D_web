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

export async function render(container) {
    let rawItems = await idb.getAll('ferramentas_insumos');
    let updated = false;
    _allItems = rawItems.map(item => {
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
                <button class="btn btn-primary" id="almox-add-btn">+ Adicionar Insumo</button>
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

        <!-- Modal CRUD -->
        <div id="almox-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:800;"></div>
        <div id="almox-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:1000; min-width:400px; box-shadow:0 8px 32px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:#00a2ff;" id="almox-modal-title">Adicionar Insumo</h3>
            <input type="hidden" id="almox-id">
            
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                <label>Nome <input type="text" id="almox-nome" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
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

    const overlay = container.querySelector('#almox-modal-overlay');
    const modal = container.querySelector('#almox-modal');

    container.querySelector('#almox-add-btn').addEventListener('click', () => {
        container.querySelector('#almox-modal-title').textContent = 'Adicionar Insumo';
        container.querySelector('#almox-id').value = '';
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

        let caminho_foto = null;
        if (idVal) {
            const idx = _allItems.findIndex(x => String(x.id) === String(idVal));
            if (idx > -1) {
                caminho_foto = _allItems[idx].caminho_foto;
            }
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
            id: idVal ? Number(idVal) : Date.now(),
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

        const statusColor = (item.status === 'Esgotado') ? 'badge-depleted' : 'badge-active';
        
        card.innerHTML = `
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
        grid.appendChild(card);
    }

    _displayed += slice.length;

    // Edit Events
    container.querySelectorAll('.almox-edit-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(e.target.closest('button').dataset.id);
            const item = _allItems.find(x => String(x.id) === String(itemId));
            if (!item) return;

            container.querySelector('#almox-modal-title').textContent = 'Editar Insumo';
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
