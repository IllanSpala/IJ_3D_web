/* ═══════════════════════════════════════════════════════════════
   Tab: Histórico de Impressões (CRUD Manual Incluído)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, formatDate, formatWeight, statusBadgeClass, escapeHtml } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [], _displayed = 0, _filter = '';
let _todosFils = [];

export async function render(container) {
    _allItems = await idb.getAll('hist_impressoes');
    const filRows = await idb.getAll('hist_filamentos');
    _todosFils = await idb.getAll('filamentos');
    
    const filMap = {};
    for (const f of _todosFils) filMap[f.id] = f;

    const filByHist = {};
    for (const f of filRows) { 
        const realFil = filMap[f.filamento_id] || {};
        f.marca = realFil.marca || '';
        f.material = realFil.material || '';
        f.cor = realFil.cor || '';
        (filByHist[f.hist_id] ??= []).push(f); 
    }
    for (const h of _allItems) h._filamentos = filByHist[h.id] || [];
    _allItems.sort((a, b) => (b.id || 0) - (a.id || 0));
    _displayed = 0;

    container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>🗂 Histórico de Impressões</span>
                <button class="btn btn-primary" id="hist-add-btn">+ Registro Manual</button>
            </div>
            <div class="filter-bar"><input type="text" id="hist-search" placeholder="Buscar peça ou filamento…"></div>
            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead><tr>
                        <th>Data</th><th>Pedido/Peça</th><th>Horas Gastas (hh:mm)</th><th>Filamento Gasto por Cor (g)</th><th>Status</th>
                    </tr></thead>
                    <tbody id="hist-tbody"></tbody>
                </table>
            </div>
            <div class="load-more-container" id="hist-lm"></div>
        </div>

        <!-- Modal CRUD -->
        <div id="hist-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:800;"></div>
        <div id="hist-modal" style="display:none; position:fixed; top:10%; left:50%; transform:translateX(-50%); background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:1000; min-width:450px; max-height:80vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:#00a2ff;">Adicionar Registro Manual</h3>
            
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                <label>Data <input type="date" id="hist-data" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Nome da Peça / Pedido <input type="text" id="hist-nome" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Duração (hh:mm) <input type="time" id="hist-duracao" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Status 
                    <select id="hist-status" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                        <option value="Sucesso">Sucesso</option>
                        <option value="Falha">Falha</option>
                    </select>
                </label>
            </div>

            <div style="margin-bottom:16px;">
                <strong>Filamentos Utilizados:</strong>
                <div id="hist-fil-list" style="margin-bottom:8px;"></div>
                <div style="display:flex; gap:6px;">
                    <select id="hist-sel-fil" style="flex:2; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                        ${_todosFils.filter(f=>f.status==='Ativo').map(f => `<option value="${f.id}">${f.marca} - ${f.cor}</option>`).join('')}
                    </select>
                    <input type="number" id="hist-sel-peso" placeholder="Peso (g)" style="flex:1; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                    <button class="btn btn-ghost" id="hist-add-fil-btn" style="background:#222;">+ Add</button>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-ghost" id="hist-cancel-btn">Cancelar</button>
                <button class="btn btn-success" id="hist-save-btn">Salvar Registro</button>
            </div>
        </div>
    `;

    const searchEl = container.querySelector('#hist-search');
    searchEl.addEventListener('input', e => { _filter = e.target.value.toLowerCase(); _reset(container); });

    const overlay = container.querySelector('#hist-modal-overlay');
    const modal = container.querySelector('#hist-modal');
    
    let currentFilamentos = [];

    function renderFilsForm() {
        const listDiv = container.querySelector('#hist-fil-list');
        listDiv.innerHTML = currentFilamentos.map((f, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1c1c1c; padding:6px 10px; border-radius:4px; margin-bottom:4px; font-size:0.82rem;">
                <span style="color:#eee;">🎨 ${f.cor} - ${f.peso}g</span>
                <button type="button" class="btn btn-ghost hist-rem-fil-btn" data-idx="${i}" style="color:#d64545; padding:0 6px;">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.hist-rem-fil-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                currentFilamentos.splice(idx, 1);
                renderFilsForm();
            });
        });
    }

    container.querySelector('#hist-add-fil-btn').addEventListener('click', () => {
        const sel = container.querySelector('#hist-sel-fil');
        const opt = sel.options[sel.selectedIndex];
        if (!opt) return;
        const peso = parseFloat(container.querySelector('#hist-sel-peso').value) || 0;
        
        currentFilamentos.push({
            id: Number(opt.value),
            cor: opt.text.split(' - ')[1] || opt.text,
            peso: peso
        });
        container.querySelector('#hist-sel-peso').value = '';
        renderFilsForm();
    });

    container.querySelector('#hist-add-btn').addEventListener('click', () => {
        container.querySelector('#hist-data').value = new Date().toISOString().split('T')[0];
        container.querySelector('#hist-nome').value = '';
        container.querySelector('#hist-duracao').value = '01:00';
        container.querySelector('#hist-status').value = 'Sucesso';
        currentFilamentos = [];
        renderFilsForm();
        
        overlay.style.display = 'block';
        modal.style.display = 'block';
    });

    container.querySelector('#hist-cancel-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    });
    
    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    });

    container.querySelector('#hist-save-btn').addEventListener('click', async () => {
        const h_id = Date.now();
        const novo = {
            id: h_id,
            data_impressao: container.querySelector('#hist-data').value,
            nome_peca: container.querySelector('#hist-nome').value.trim() || 'Sem nome',
            tempo_impressao: container.querySelector('#hist-duracao').value,
            status: container.querySelector('#hist-status').value
        };

        const filRows = currentFilamentos.map(f => ({
            id: Date.now() + Math.floor(Math.random() * 10000),
            hist_id: h_id,
            filamento_id: f.id,
            peso_modelo_g: f.peso,
            peso_purga_g: 0
        }));

        await idb.putAll('hist_impressoes', [novo]);
        if (filRows.length > 0) {
            await idb.putAll('hist_filamentos', filRows);
        }

        overlay.style.display = 'none';
        modal.style.display = 'none';
        render(container); // full reload to map everything
    });

    _reset(container);
}

function _filtered() {
    return _allItems.filter(h => { if (!_filter) return true; const hay = `${h.nome_peca||''} ${(h._filamentos||[]).map(f=>f.nome_custom||f.marca||f.cor||'').join(' ')}`.toLowerCase(); return hay.includes(_filter); });
}

function _reset(c) { _displayed = 0; c.querySelector('#hist-tbody').innerHTML = ''; _page(c); }

function _page(c) {
    const f = _filtered(), tb = c.querySelector('#hist-tbody'), lm = c.querySelector('#hist-lm');
    for (const h of f.slice(_displayed, _displayed + PAGE_SIZE)) {
        const fils = (h._filamentos||[]);
        const consumoStr = fils.length ? fils.map(f=>`<div style="font-size:0.8rem; color:#ccc;">🎨 ${escapeHtml(f.cor||'—')} - ${formatWeight((f.peso_modelo_g||0) + (f.peso_purga_g||0))}</div>`).join('') : '<span style="color:#666;">Sem filamento</span>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(h.data_impressao)}</td>
            <td style="font-weight:500;color:#e8e8e8">${escapeHtml(h.nome_peca||'—')}</td>
            <td>${escapeHtml(h.tempo_impressao||'—')}</td>
            <td>${consumoStr}</td>
            <td><span class="badge ${statusBadgeClass(h.status)}">${escapeHtml(h.status||'Sucesso')}</span></td>
        `;
        tb.appendChild(tr);
    }
    _displayed += Math.min(PAGE_SIZE, f.length - _displayed);
    if (_displayed < f.length) { lm.innerHTML = `<button class="btn btn-ghost" id="hist-mb">Carregar mais (${f.length-_displayed})</button>`; lm.querySelector('#hist-mb').addEventListener('click',()=>_page(c)); }
    else { lm.innerHTML = ''; if (!f.length) tb.innerHTML = `<tr><td colspan="5" class="empty-state"><span class="empty-state-icon">🗂</span>Nenhum registro.</td></tr>`; }
}
