/* ═══════════════════════════════════════════════════════════════
   Tab: Filamentos (CRUD Completo)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, statusBadgeClass, escapeHtml, placeholderImg, compressImage } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [];
let _displayed = 0;
let _filter = '';
let _statusFilter = 'all';

export async function render(container) {
    let rawItems = await idb.getAll('filamentos');
    let updated = false;
    _allItems = rawItems.filter(f => {
        if (f.status === 'Arquivado') { updated = true; return false; }
        return true;
    });
    for (const f of _allItems) {
        if ((!f.quantidade_rolos || f.quantidade_rolos === 0) && f.status === 'Ativo') {
            f.quantidade_rolos = 1;
            updated = true;
        }
    }
    if (updated) { await idb.putAll('filamentos', _allItems); }

    _displayed = 0;

    container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>⚙ Filamentos</span>
                <button class="btn btn-primary" id="fil-add-btn">+ Adicionar Filamento</button>
            </div>
            <div class="filter-bar">
                <input type="text" id="fil-search" placeholder="Buscar por marca, material ou cor…">
                <select id="fil-status-filter">
                    <option value="all">Todos</option>
                    <option value="Ativo" selected>Ativos</option>
                    <option value="Esgotado">Esgotados</option>
                </select>
            </div>
            <div class="items-grid" id="fil-grid"></div>
            <div class="load-more-container" id="fil-load-more"></div>
        </div>

        <!-- Modal CRUD -->
        <div id="fil-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:800;"></div>
        <div id="fil-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:1000; min-width:400px; box-shadow:0 8px 32px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:#00a2ff;" id="fil-modal-title">Adicionar Filamento</h3>
            <input type="hidden" id="fil-id">
            
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                <label>Marca <input type="text" id="fil-marca" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Material <input type="text" id="fil-material" placeholder="PLA, ABS, PETG..." style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Cor <input type="text" id="fil-cor" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Preço do Rolo (R$) <input type="number" step="0.01" id="fil-preco" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Status 
                    <select id="fil-status" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                        <option value="Ativo">Ativo</option>
                        <option value="Esgotado">Esgotado</option>
                    </select>
                </label>
                <label>Foto (Opcional) <input type="file" id="fil-foto" accept="image/*" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-ghost" id="fil-cancel-btn">Cancelar</button>
                <button class="btn btn-success" id="fil-save-btn">Salvar</button>
            </div>
        </div>
    `;

    const searchEl = container.querySelector('#fil-search');
    const statusEl = container.querySelector('#fil-status-filter');

    searchEl.addEventListener('input', (e) => { _filter = e.target.value.toLowerCase(); _resetAndRender(container); });
    statusEl.addEventListener('change', (e) => { _statusFilter = e.target.value; _resetAndRender(container); });

    const overlay = container.querySelector('#fil-modal-overlay');
    const modal = container.querySelector('#fil-modal');
    
    container.querySelector('#fil-add-btn').addEventListener('click', () => {
        container.querySelector('#fil-modal-title').textContent = 'Adicionar Filamento';
        container.querySelector('#fil-id').value = '';
        container.querySelector('#fil-marca').value = '';
        container.querySelector('#fil-material').value = 'PLA';
        container.querySelector('#fil-cor').value = '';
        container.querySelector('#fil-preco').value = '0';
        container.querySelector('#fil-status').value = 'Ativo';
        container.querySelector('#fil-foto').value = '';
        
        overlay.style.display = 'block';
        modal.style.display = 'block';
    });

    container.querySelector('#fil-cancel-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    });
    
    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    });

    container.querySelector('#fil-save-btn').addEventListener('click', async () => {
        const idVal = container.querySelector('#fil-id').value;
        const fotoInput = container.querySelector('#fil-foto');
        
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
                // The output is webp, so let's enforce .webp extension
                const filename = `filamentos/${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}.webp`;
                await idb.putMedia('src_media/' + filename, compressedBlob);
                caminho_foto = filename;
            } catch(e) {
                console.error("Erro ao comprimir imagem:", e);
                alert("Falha ao comprimir imagem. O filamento será salvo sem foto.");
            }
        }

        const novo = {
            id: idVal ? Number(idVal) : Date.now(),
            marca: container.querySelector('#fil-marca').value.trim() || 'Desconhecida',
            material: container.querySelector('#fil-material').value.trim() || 'PLA',
            cor: container.querySelector('#fil-cor').value.trim() || 'Sem Cor',
            preco_rolo: parseFloat(container.querySelector('#fil-preco').value) || 0,
            status: container.querySelector('#fil-status').value,
            caminho_foto: caminho_foto,
            quantidade_rolos: 0
        };

        if (idVal) {
            const idx = _allItems.findIndex(x => String(x.id) === String(novo.id));
            if (idx > -1) {
                novo.quantidade_rolos = _allItems[idx].quantidade_rolos || 0;
                _allItems[idx] = novo;
            }
        } else {
            _allItems.push(novo);
        }

        await idb.putAll('filamentos', _allItems);
        overlay.style.display = 'none';
        modal.style.display = 'none';
        _resetAndRender(container);
    });

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
    if (grid) grid.innerHTML = '';
    _renderPage(container);
}

async function _renderPage(container) {
    const filtered = _getFiltered();
    const grid = container.querySelector('#fil-grid');
    if (!grid) return;
    const loadMore = container.querySelector('#fil-load-more');
    const slice = filtered.slice(_displayed, _displayed + PAGE_SIZE);

    for (const f of slice) {
        const imgUrl = await idb.resolveMediaUrl(f.caminho_foto);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.position = 'relative'; // Ensure absolute buttons stay inside
        card.dataset.id = f.id;
        
        const qtdAtivos = parseInt(f.quantidade_rolos) || 0;
        const qtdReserva = parseInt(f.rolos_reserva) || 0;

        card.innerHTML = `
            <div style="position:absolute; top:8px; right:8px; display:flex; gap:4px; z-index:10;">
                <button class="btn btn-ghost fil-edit-btn" data-id="${f.id}" style="padding:4px; background:rgba(0,0,0,0.5); border-radius:4px;" title="Editar">✏️</button>
                <button class="btn btn-ghost fil-del-btn" data-id="${f.id}" style="padding:4px; background:rgba(0,0,0,0.5); border-radius:4px;" title="Excluir">🗑️</button>
            </div>
            <img class="item-card-img" src="${imgUrl || placeholderImg()}" alt="${escapeHtml(f.cor)}">
            <div class="item-card-info" style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;">
                <h3 style="margin:0;font-size:1.1rem; padding-right:50px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(f.marca)} ${escapeHtml(f.material)}">${escapeHtml(f.marca)} ${escapeHtml(f.material)}</h3>
                <div class="meta" style="margin-bottom:4px; display:flex; flex-direction:column; gap:2px;">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(f.cor)}">🎨 ${escapeHtml(f.cor)}</span>
                    <span>💰 ${formatBRL(f.preco_rolo)}</span>
                    <span style="margin-top:2px;"><span class="badge ${statusBadgeClass(f.status || 'Ativo')}">${escapeHtml(f.status || 'Ativo')}</span></span>
                </div>
                
                <div style="background:#1e1e1e; padding:10px 4px; border-radius:6px; border:1px solid #333; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; margin-top:auto;">
                    <span style="font-size:0.8rem; color:#aaa; display:block;">Rolos disponíveis</span>
                    <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
                        <button class="btn btn-ghost fil-btn-min-ativo" data-id="${f.id}" style="padding:2px 12px; font-size:1.3rem; color:#f87171;">-</button>
                        <span style="font-weight:700; font-size:1.3rem; min-width:30px; text-align:center;">${qtdAtivos}</span>
                        <button class="btn btn-ghost fil-btn-plus-ativo" data-id="${f.id}" style="padding:2px 12px; font-size:1.3rem; color:#4ade80;">+</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    }

    _displayed += slice.length;

    // Counters events
    container.querySelectorAll('.fil-btn-plus-ativo, .fil-btn-min-ativo').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener('click', async (e) => {
            const tgt = e.target.closest('button');
            const filId = parseInt(tgt.dataset.id);
            const fil = _allItems.find(x => String(x.id) === String(filId));
            if (!fil) return;

            let qA = parseInt(fil.quantidade_rolos) || 0;

            if (tgt.classList.contains('fil-btn-plus-ativo')) qA++;
            if (tgt.classList.contains('fil-btn-min-ativo')) qA = Math.max(0, qA - 1);

            fil.quantidade_rolos = qA;

            await idb.putAll('filamentos', _allItems);
            _resetAndRender(container);
        });
    });

    // Edit events
    container.querySelectorAll('.fil-edit-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener('click', (e) => {
            const filId = parseInt(e.target.closest('button').dataset.id);
            const fil = _allItems.find(x => String(x.id) === String(filId));
            if (!fil) return;

            container.querySelector('#fil-modal-title').textContent = 'Editar Filamento';
            container.querySelector('#fil-id').value = fil.id;
            container.querySelector('#fil-marca').value = fil.marca || '';
            container.querySelector('#fil-material').value = fil.material || '';
            container.querySelector('#fil-cor').value = fil.cor || '';
            container.querySelector('#fil-preco').value = fil.preco_rolo || 0;
            container.querySelector('#fil-status').value = fil.status || 'Ativo';
            container.querySelector('#fil-foto').value = '';
            
            container.querySelector('#fil-modal-overlay').style.display = 'block';
            container.querySelector('#fil-modal').style.display = 'block';
        });
    });

    // Delete events
    container.querySelectorAll('.fil-del-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener('click', async (e) => {
            const filId = parseInt(e.target.closest('button').dataset.id);
            if (confirm('Tem certeza que deseja excluir este filamento?')) {
                _allItems = _allItems.filter(x => String(x.id) !== String(filId));
                await idb.putAll('filamentos', _allItems);
                _resetAndRender(container);
            }
        });
    });

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
