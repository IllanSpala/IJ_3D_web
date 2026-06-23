/* Tab: Histórico de Impressões */
import * as idb from '../db.js';
import { formatBRL, formatDate, formatWeight, statusBadgeClass, escapeHtml } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [], _displayed = 0, _filter = '';

export async function render(container) {
    _allItems = await idb.getAll('hist_impressoes');
    const filRows = await idb.getAll('hist_filamentos');
    const todosFils = await idb.getAll('filamentos');
    
    const filMap = {};
    for (const f of todosFils) filMap[f.id] = f;

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

    container.innerHTML = `<div class="card"><div class="card-header">🗂 Histórico de Impressões</div>
        <div class="filter-bar"><input type="text" id="hist-search" placeholder="Buscar peça ou filamento…"></div>
        <div style="overflow-x:auto;"><table class="data-table"><thead><tr>
            <th>Data</th><th>Peça</th><th>Status</th><th>Filamento(s)</th><th>Total (g)</th><th>Tempo</th><th>Venda</th><th>Detalhes</th>
        </tr></thead><tbody id="hist-tbody"></tbody></table></div>
        <div class="load-more-container" id="hist-lm"></div></div>`;

    container.querySelector('#hist-search').addEventListener('input', e => { _filter = e.target.value.toLowerCase(); _reset(container); });
    _reset(container);
}

function _filtered() {
    return _allItems.filter(h => { if (!_filter) return true; const hay = `${h.nome_peca||''} ${(h._filamentos||[]).map(f=>f.nome_custom||f.marca||'').join(' ')}`.toLowerCase(); return hay.includes(_filter); });
}
function _reset(c) { _displayed = 0; c.querySelector('#hist-tbody').innerHTML = ''; _page(c); }
function _page(c) {
    const f = _filtered(), tb = c.querySelector('#hist-tbody'), lm = c.querySelector('#hist-lm');
    for (const h of f.slice(_displayed, _displayed + PAGE_SIZE)) {
        const fils = (h._filamentos||[]), filStr = fils.map(f=>f.nome_custom||`${f.marca||''} ${f.material||''} (${f.cor||''})`).join(', ')||'—';
        const mg = fils.reduce((s,f)=>s+(f.peso_modelo_g||0),0), pg = fils.reduce((s,f)=>s+(f.peso_purga_g||0),0);
        const tr = document.createElement('tr');
        const detalhesMsg = escapeHtml(`Tempo Total: ${h.tempo_impressao||'Não informado'}\n\nUso de Filamentos:\n` + (fils.length ? fils.map(f=>`- ${f.nome_custom||f.marca||'Custom'} (${f.cor||''}): Modelo ${f.peso_modelo_g||0}g, Purga ${f.peso_purga_g||0}g`).join('\n') : 'Nenhum filamento registrado.'));
        tr.innerHTML = `<td>${formatDate(h.data_impressao)}</td><td style="font-weight:500;color:#e8e8e8">${escapeHtml(h.nome_peca||'—')}</td>
            <td><span class="badge ${statusBadgeClass(h.status)}">${escapeHtml(h.status||'Sucesso')}</span></td><td>${escapeHtml(filStr)}</td>
            <td>${formatWeight(mg + pg)}</td><td>${escapeHtml(h.tempo_impressao||'—')}</td><td>${h.preco_venda?formatBRL(h.preco_venda):'—'}</td>
            <td><button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;" onclick="alert('${detalhesMsg.replace(/\n/g, '\\n')}')" title="Mostrar detalhes">❓</button></td>`;
        tb.appendChild(tr);
    }
    _displayed += Math.min(PAGE_SIZE, f.length - _displayed);
    if (_displayed < f.length) { lm.innerHTML = `<button class="btn btn-ghost" id="hist-mb">Carregar mais (${f.length-_displayed})</button>`; lm.querySelector('#hist-mb').addEventListener('click',()=>_page(c)); }
    else { lm.innerHTML = ''; if (!f.length) tb.innerHTML = `<tr><td colspan="8" class="empty-state"><span class="empty-state-icon">🗂</span>Nenhum registro.</td></tr>`; }
}
