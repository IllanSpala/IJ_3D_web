/* ═══════════════════════════════════════════════════════════════
   Tab: Histórico de Impressões (CRUD Completo)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, formatDate, formatWeight, statusBadgeClass, escapeHtml } from '../utils.js';

const PAGE_SIZE = 20;
let _allItems = [], _displayed = 0, _filter = '';
let _todosFils = [];
// Todas as linhas de hist_filamentos carregadas (necessário para edição e exclusão)
let _allFilRows = [];
// Callback de escopo de módulo: permite que _page() abra o modal de edição
let _openModalEdit = (_h) => {};

/**
 * Converte um valor string (aceita vírgula OU ponto) para float.
 * Resolve o problema de teclados numéricos BR que digitam "1,5".
 */
function parsePeso(val) {
    if (val === null || val === undefined) return 0;
    return parseFloat(String(val).replace(',', '.')) || 0;
}

/**
 * Converte uma string de tempo de impressão ("30:15", "01:00", "30", etc.)
 * em um objeto com horas e minutos numéricos.
 */
function parseDuracao(val) {
    if (!val) return { h: 1, m: 0 };
    const str = String(val).trim();
    if (str.includes(':')) {
        const parts = str.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return {
            h: isNaN(h) ? 1 : Math.max(0, h),
            m: isNaN(m) ? 0 : Math.max(0, Math.min(59, m))
        };
    }
    const num = parseFloat(str.replace(',', '.'));
    if (!isNaN(num)) {
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return { h: Math.max(0, h), m: Math.max(0, Math.min(59, m)) };
    }
    return { h: 1, m: 0 };
}

/**
 * Formata valores numéricos de horas e minutos em string "HH:MM".
 */
function formatDuracao(hVal, mVal) {
    let hours = parseInt(hVal, 10);
    let mins = parseInt(mVal, 10);
    if (isNaN(hours)) hours = 0;
    if (isNaN(mins)) mins = 0;

    if (mins >= 60) {
        hours += Math.floor(mins / 60);
        mins = mins % 60;
    }
    if (hours < 0) hours = 0;
    if (mins < 0) mins = 0;

    const hh = String(hours).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    return `${hh}:${mm}`;
}

export async function render(container) {
    _allItems    = await idb.getAll('hist_impressoes');
    _allFilRows  = await idb.getAll('hist_filamentos');
    _todosFils   = await idb.getAll('filamentos');

    const filMap = {};
    for (const f of _todosFils) filMap[f.id] = f;

    // Enriquecer cada linha de filamento com dados do catálogo
    const filByHist = {};
    for (const f of _allFilRows) {
        const realFil = filMap[f.filamento_id] || {};
        f.marca    = realFil.marca    || '';
        f.material = realFil.material || '';
        f.cor      = realFil.cor      || '';
        (filByHist[f.hist_id] ??= []).push(f);
    }
    for (const h of _allItems) h._filamentos = filByHist[h.id] || [];
    _allItems.sort((a, b) => (b.id || 0) - (a.id || 0));
    _displayed = 0;

    const filAtivos = _todosFils.filter(f => f.status === 'Ativo');
    const filOptsHTML = filAtivos.map(f =>
        `<option value="${f.id}">${escapeHtml(f.marca)} - ${escapeHtml(f.cor)}</option>`
    ).join('');

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
                        <th>Data</th><th>Pedido/Peça</th><th>Horas Gastas (hh:mm)</th><th>Filamento Gasto por Cor (g)</th><th>Status</th><th style="width:80px; text-align:center;">Ações</th>
                    </tr></thead>
                    <tbody id="hist-tbody"></tbody>
                </table>
            </div>
            <div class="load-more-container" id="hist-lm"></div>
        </div>

        <!-- Dashboard Analítico (Métricas à esquerda e Gráfico por Cor à direita) -->
        <div id="hist-analytics-root" style="margin-top:24px;"></div>

        <!-- Modal CRUD -->
        <div id="hist-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:800;"></div>
        <div id="hist-modal" style="display:none; position:fixed; top:10%; left:50%; transform:translateX(-50%); background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:1000; min-width:450px; max-height:80vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:#00a2ff;" id="hist-modal-title">Adicionar Registro Manual</h3>
            <input type="hidden" id="hist-editing-id">

            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                <label>Data <input type="date" id="hist-data" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <label>Nome da Peça / Pedido <input type="text" id="hist-nome" style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;"></label>
                <div>
                    <label style="display:block; margin-bottom:4px; font-size:0.9rem; color:#eee;">Duração da Impressão</label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="flex:1; display:flex; align-items:center; gap:6px;">
                            <input type="number" id="hist-duracao-h" min="0" max="999" placeholder="00" value="01"
                                   style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px 8px; border-radius:4px;">
                            <span style="color:#aaa; font-size:0.85rem; font-weight:600;">h</span>
                        </div>
                        <div style="flex:1; display:flex; align-items:center; gap:6px;">
                            <input type="number" id="hist-duracao-m" min="0" max="59" placeholder="00" value="00"
                                   style="width:100%; background:#111; border:1px solid #444; color:#fff; padding:6px 8px; border-radius:4px;">
                            <span style="color:#aaa; font-size:0.85rem; font-weight:600;">min</span>
                        </div>
                    </div>
                </div>
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
                        ${filOptsHTML}
                    </select>
                    <input type="number" id="hist-sel-peso" placeholder="Peso (g)" step="0.1"
                           style="flex:1; background:#111; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                    <button class="btn btn-ghost" id="hist-add-fil-btn" style="background:#222;">+ Add</button>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-ghost" id="hist-cancel-btn">Cancelar</button>
                <button class="btn btn-success" id="hist-save-btn">Salvar Registro</button>
            </div>
        </div>
    `;

    /* ── Referências ──────────────────────────────── */
    const searchEl  = container.querySelector('#hist-search');
    const overlay   = container.querySelector('#hist-modal-overlay');
    const modal     = container.querySelector('#hist-modal');
    const modalTitle = container.querySelector('#hist-modal-title');
    const editingIdEl = container.querySelector('#hist-editing-id');

    let currentFilamentos = []; // [{id, cor, peso}] — estado do modal

    /* ── Render filamentos no modal ─────────────────── */
    function renderFilsForm() {
        const listDiv = container.querySelector('#hist-fil-list');
        if (!listDiv) return;
        listDiv.innerHTML = currentFilamentos.map((f, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1c1c1c; padding:6px 10px; border-radius:4px; margin-bottom:4px; font-size:0.82rem;">
                <span style="color:#eee;">🎨 ${escapeHtml(f.cor)} — ${f.peso}g</span>
                <button type="button" class="btn btn-ghost hist-rem-fil-btn" data-idx="${i}" style="color:#d64545; padding:0 6px;">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.hist-rem-fil-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx);
                currentFilamentos.splice(idx, 1);
                renderFilsForm();
            });
        });
    }

    /* ── Abre modal limpo (modo "Adicionar") ─────────── */
    function openModalAdd() {
        modalTitle.textContent = 'Adicionar Registro Manual';
        editingIdEl.value = '';
        container.querySelector('#hist-data').value      = new Date().toISOString().split('T')[0];
        container.querySelector('#hist-nome').value      = '';
        container.querySelector('#hist-duracao-h').value = '01';
        container.querySelector('#hist-duracao-m').value = '00';
        container.querySelector('#hist-status').value    = 'Sucesso';
        currentFilamentos = [];
        renderFilsForm();
        overlay.style.display = 'block';
        modal.style.display   = 'block';
    }

    /* ── Abre modal preenchido (modo "Editar") ───────── */
    function openModalEdit(h) {
        modalTitle.textContent = 'Editar Registro';
        editingIdEl.value = h.id;
        container.querySelector('#hist-data').value    = h.data_impressao || '';
        container.querySelector('#hist-nome').value    = h.nome_peca      || '';
        
        const dur = parseDuracao(h.tempo_impressao);
        container.querySelector('#hist-duracao-h').value = String(dur.h).padStart(2, '0');
        container.querySelector('#hist-duracao-m').value = String(dur.m).padStart(2, '0');
        container.querySelector('#hist-status').value    = h.status          || 'Sucesso';

        // Carrega os filamentos já vinculados a este registro
        currentFilamentos = (h._filamentos || []).map(f => ({
            id:   f.filamento_id,
            cor:  f.cor || '—',
            peso: (f.peso_modelo_g || 0) + (f.peso_purga_g || 0)
        }));
        renderFilsForm();
        overlay.style.display = 'block';
        modal.style.display   = 'block';
    }
    // Expõe para _page() que está fora do closure de render()
    _openModalEdit = openModalEdit;

    /* ── Fecha modal ─────────────────────────────────── */
    function closeModal() {
        overlay.style.display = 'none';
        modal.style.display   = 'none';
    }

    /* ── Botão "+ Filamento" no modal ───────────────── */
    container.querySelector('#hist-add-fil-btn').addEventListener('click', () => {
        const sel = container.querySelector('#hist-sel-fil');
        const opt = sel.options[sel.selectedIndex];
        if (!opt) return;

        const pesoRaw = container.querySelector('#hist-sel-peso').value;
        const peso    = parsePeso(pesoRaw);

        currentFilamentos.push({
            id:   Number(opt.value),
            cor:  opt.text.split(' - ')[1] || opt.text,
            peso: peso
        });
        container.querySelector('#hist-sel-peso').value = '';
        renderFilsForm();
    });

    /* ── Botões do header ───────────────────────────── */
    container.querySelector('#hist-add-btn').addEventListener('click', openModalAdd);
    container.querySelector('#hist-cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    /* ── Salvar (Adicionar OU Editar) ───────────────── */
    container.querySelector('#hist-save-btn').addEventListener('click', async () => {
        const editingId = editingIdEl.value;
        const isEdit    = !!editingId;

        // ID: preserva o existente em edição; gera novo timestamp para inclusão
        const h_id = isEdit ? (isNaN(Number(editingId)) ? editingId : Number(editingId)) : Date.now();

        const durH = container.querySelector('#hist-duracao-h').value;
        const durM = container.querySelector('#hist-duracao-m').value;
        const tempoFormatted = formatDuracao(durH, durM);

        const registro = {
            id:             h_id,
            data_impressao: container.querySelector('#hist-data').value,
            nome_peca:      container.querySelector('#hist-nome').value.trim() || 'Sem nome',
            tempo_impressao:tempoFormatted,
            status:         container.querySelector('#hist-status').value
        };

        /* ── Atualiza _allItems em memória ───────────── */
        if (isEdit) {
            const idx = _allItems.findIndex(x => String(x.id) === String(h_id));
            if (idx > -1) {
                // Preserva _filamentos enriquecido para que a exibição não quebre antes do reload
                registro._filamentos = _allItems[idx]._filamentos || [];
                _allItems[idx] = registro;
            } else {
                _allItems.push(registro);
            }
        } else {
            registro._filamentos = [];
            _allItems.push(registro);
        }

        /* ── Persiste hist_impressoes (todas as linhas) ── */
        // Remove a propriedade virtual _filamentos antes de gravar
        const toSave = _allItems.map(({ _filamentos, ...rest }) => rest);
        await idb.putAll('hist_impressoes', toSave);

        /* ── Monta as novas linhas de filamento ─────────── */
        const novasFilRows = currentFilamentos.map((f, i) => ({
            id:            Date.now() + i + Math.floor(Math.random() * 9999),
            hist_id:       h_id,
            filamento_id:  f.id,
            peso_modelo_g: f.peso,
            peso_purga_g:  0
        }));

        // Em edição: remove todas as linhas antigas deste registro e substitui pelas novas
        // Em adição: simplesmente acrescenta ao final
        if (isEdit) {
            _allFilRows = _allFilRows.filter(f => String(f.hist_id) !== String(h_id));
        }
        _allFilRows.push(...novasFilRows);

        await idb.putAll('hist_filamentos', _allFilRows);

        closeModal();
        render(container); // recarrega tudo para re-enriquecer os dados
    });

    /* ── Busca ──────────────────────────────────────── */
    searchEl.addEventListener('input', e => {
        _filter = e.target.value.toLowerCase();
        _reset(container);
    });

    _reset(container);
}

/* ── Funções de paginação e filtragem ─────────────── */

function _filtered() {
    return _allItems.filter(h => {
        if (!_filter) return true;
        const hay = `${h.nome_peca || ''} ${(h._filamentos || []).map(f => f.nome_custom || f.marca || f.cor || '').join(' ')}`.toLowerCase();
        return hay.includes(_filter);
    });
}

function _reset(c) {
    _displayed = 0;
    const tb = c.querySelector('#hist-tbody');
    if (tb) tb.innerHTML = '';
    _page(c);
}

function _page(c) {
    const f  = _filtered();
    const tb = c.querySelector('#hist-tbody');
    const lm = c.querySelector('#hist-lm');
    if (!tb || !lm) return;

    for (const h of f.slice(_displayed, _displayed + PAGE_SIZE)) {
        const fils       = h._filamentos || [];
        const consumoStr = fils.length
            ? fils.map(f => `<div style="font-size:0.8rem; color:#ccc;">🎨 ${escapeHtml(f.cor || '—')} — ${formatWeight((f.peso_modelo_g || 0) + (f.peso_purga_g || 0))}</div>`).join('')
            : '<span style="color:#666;">Sem filamento</span>';

        const tr = document.createElement('tr');
        tr.dataset.histId = h.id;
        tr.innerHTML = `
            <td>${formatDate(h.data_impressao)}</td>
            <td style="font-weight:500;color:#e8e8e8">${escapeHtml(h.nome_peca || '—')}</td>
            <td>${escapeHtml(h.tempo_impressao || '—')}</td>
            <td>${consumoStr}</td>
            <td><span class="badge ${statusBadgeClass(h.status)}">${escapeHtml(h.status || 'Sucesso')}</span></td>
            <td style="text-align:center; white-space:nowrap;">
                <button class="btn btn-ghost hist-edit-btn" data-id="${h.id}"
                        style="padding:4px 7px; font-size:0.8rem; margin-right:2px;" title="Editar">✏️</button>
                <button class="btn btn-ghost hist-del-btn"  data-id="${h.id}"
                        style="padding:4px 7px; font-size:0.8rem; color:#d64545;" title="Excluir">🗑️</button>
            </td>
        `;
        tb.appendChild(tr);
    }

    _displayed += Math.min(PAGE_SIZE, f.length - _displayed);

    // Bind dos botões de ação recém-adicionados
    c.querySelectorAll('.hist-edit-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
            const id   = e.currentTarget.dataset.id;
            const item = _allItems.find(x => String(x.id) === String(id));
            if (item) _openModalEdit(item);
        });
    });

    c.querySelectorAll('.hist-del-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!confirm('Excluir este registro do histórico? Esta ação não pode ser desfeita.')) return;

            // Remove da memória
            _allItems   = _allItems.filter(x => String(x.id) !== String(id));
            _allFilRows = _allFilRows.filter(x => String(x.hist_id) !== String(id));

            // Persiste
            const toSave = _allItems.map(({ _filamentos, ...rest }) => rest);
            await idb.putAll('hist_impressoes', toSave);
            await idb.putAll('hist_filamentos', _allFilRows);

            // Re-renderiza sem reload completo (mais rápido)
            _displayed = 0;
            const tbody = c.querySelector('#hist-tbody');
            if (tbody) tbody.innerHTML = '';
            _page(c);
        });
    });

    if (_displayed < f.length) {
        lm.innerHTML = `<button class="btn btn-ghost" id="hist-mb">Carregar mais (${f.length - _displayed})</button>`;
        lm.querySelector('#hist-mb').addEventListener('click', () => _page(c));
    } else {
        lm.innerHTML = '';
        if (!f.length) tb.innerHTML = `<tr><td colspan="6" class="empty-state"><span class="empty-state-icon">🗂</span>Nenhum registro.</td></tr>`;
    }

    renderAnalytics(c);
}

/**
 * Normaliza o nome da cor e atribui uma cor hexadecimal representativa.
 * Trata variações de nome (ex: "cinza", "grafite", "cinza/grafite" -> "Cinza / Grafite").
 */
function getCanonicalColor(colorStr) {
    if (!colorStr) return { name: 'Outros', hex: '#64748b' };
    const raw = colorStr.trim();
    const c = raw.toLowerCase();

    if (c.includes('cinza') || c.includes('grafite') || c.includes('gray') || c.includes('grey')) {
        return { name: 'Cinza / Grafite', hex: '#6e7681' };
    }
    if (c.includes('preto') || c.includes('black')) {
        return { name: 'Preto', hex: '#374151' };
    }
    if (c.includes('branco') || c.includes('white')) {
        return { name: 'Branco', hex: '#e2e8f0' };
    }
    if (c.includes('vermelho') || c.includes('red') || c.includes('carmim')) {
        return { name: 'Vermelho', hex: '#ef4444' };
    }
    if (c.includes('azul') || c.includes('blue')) {
        return { name: 'Azul', hex: '#3b82f6' };
    }
    if (c.includes('amarelo') || c.includes('yellow')) {
        return { name: 'Amarelo', hex: '#eab308' };
    }
    if (c.includes('verde') || c.includes('green')) {
        return { name: 'Verde', hex: '#22c55e' };
    }
    if (c.includes('laranja') || c.includes('orange')) {
        return { name: 'Laranja', hex: '#f97316' };
    }
    if (c.includes('roxo') || c.includes('purple') || c.includes('violeta')) {
        return { name: 'Roxo', hex: '#a855f7' };
    }
    if (c.includes('rosa') || c.includes('pink')) {
        return { name: 'Rosa', hex: '#ec4899' };
    }
    if (c.includes('marrom') || c.includes('brown')) {
        return { name: 'Marrom', hex: '#854d0e' };
    }
    if (c.includes('dourado') || c.includes('ouro') || c.includes('gold')) {
        return { name: 'Dourado', hex: '#d97706' };
    }
    if (c.includes('prata') || c.includes('silver')) {
        return { name: 'Prata', hex: '#94a3b8' };
    }
    if (c.includes('transparente') || c.includes('natural') || c.includes('clear')) {
        return { name: 'Transparente / Natural', hex: '#38bdf8' };
    }

    const capName = raw.charAt(0).toUpperCase() + raw.slice(1);
    return { name: capName, hex: '#64748b' };
}

/**
 * Renderiza o painel analítico com métricas à esquerda e gráfico de consumo por cor à direita.
 */
function renderAnalytics(container) {
    const rootEl = container.querySelector('#hist-analytics-root');
    if (!rootEl) return;

    /* ── 1. Tempo total de impressão da máquina ── */
    let totalH = 0, totalM = 0;
    for (const item of _allItems) {
        const dur = parseDuracao(item.tempo_impressao);
        totalH += dur.h;
        totalM += dur.m;
    }
    totalH += Math.floor(totalM / 60);
    totalM = totalM % 60;
    const tempoTotalStr = `${totalH}h ${String(totalM).padStart(2, '0')}min`;

    /* ── 2. Total de filamento gasto em kg (e gramas) ── */
    let grandTotalGrams = 0;
    for (const f of _allFilRows) {
        grandTotalGrams += (parseFloat(f.peso_modelo_g) || 0) + (parseFloat(f.peso_purga_g) || 0);
    }
    const grandTotalKg = (grandTotalGrams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    /* ── 3. Análise por cor (catálogo completo + histórico) ── */
    const filMap = {};
    for (const f of _todosFils) filMap[f.id] = f;

    const colorsMap = {};

    // Cadastra todas as cores do catálogo de filamentos (inclusive os esgotados / sem consumo)
    for (const tf of _todosFils) {
        if (tf.cor) {
            const { name, hex } = getCanonicalColor(tf.cor);
            if (!colorsMap[name]) {
                colorsMap[name] = { name, hex, totalGrams: 0, materials: {} };
            }
        }
    }

    // Processa o consumo real de cada filamento registrado no histórico
    for (const f of _allFilRows) {
        const realFil = filMap[f.filamento_id] || {};
        const corName = f.cor || realFil.cor || '';
        const matName = (f.material || realFil.material || 'PLA').trim().toUpperCase();
        const weightG = (parseFloat(f.peso_modelo_g) || 0) + (parseFloat(f.peso_purga_g) || 0);

        const { name, hex } = getCanonicalColor(corName);
        if (!colorsMap[name]) {
            colorsMap[name] = { name, hex, totalGrams: 0, materials: {} };
        }

        colorsMap[name].totalGrams += weightG;
        colorsMap[name].materials[matName] = (colorsMap[name].materials[matName] || 0) + weightG;
    }

    const colorsList = Object.values(colorsMap);
    colorsList.sort((a, b) => b.totalGrams - a.totalGrams || a.name.localeCompare(b.name));

    const maxGrams = colorsList.length ? Math.max(...colorsList.map(c => c.totalGrams)) : 1;

    let chartBarsHTML = '';
    if (colorsList.length === 0) {
        chartBarsHTML = '<div style="color:#666; font-style:italic; padding:20px; text-align:center;">Nenhuma cor de filamento cadastrada no banco de dados.</div>';
    } else {
        chartBarsHTML = colorsList.map((c, idx) => {
            const percentMax = maxGrams > 0 ? (c.totalGrams / maxGrams) * 100 : 0;
            const percentTotal = grandTotalGrams > 0 ? ((c.totalGrams / grandTotalGrams) * 100).toFixed(1) : '0.0';
            const kgStr = (c.totalGrams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

            const matEntries = Object.entries(c.materials)
                .filter(([_, g]) => g > 0)
                .sort((a, b) => b[1] - a[1]);

            let matHTML = '';
            if (matEntries.length === 0) {
                matHTML = '<div style="color:#888; font-style:italic;">Nenhum consumo registrado</div>';
            } else {
                matHTML = matEntries.map(([mat, g]) => {
                    const matKg = (g / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
                    const gStr = g.toLocaleString('pt-BR');
                    return `
                        <div style="display:flex; justify-content:space-between; gap:16px; margin-top:3px;">
                            <span style="color:#00a2ff; font-weight:600;">🔹 ${escapeHtml(mat)}:</span>
                            <span style="color:#fff; font-weight:700;">${matKg} kg <small style="color:#aaa;">(${gStr}g)</small></span>
                        </div>
                    `;
                }).join('');
            }

            const tooltipPosClass = idx === 0 ? 'tooltip-down' : 'tooltip-up';

            return `
                <div class="color-bar-row ${tooltipPosClass}" style="position:relative; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:0.85rem;">
                        <div style="display:flex; align-items:center; gap:8px; font-weight:600; color:#eee;">
                            <span style="width:12px; height:12px; border-radius:50%; background:${c.hex}; display:inline-block; box-shadow:0 0 8px ${c.hex}80;"></span>
                            <span>${escapeHtml(c.name)}</span>
                        </div>
                        <div style="font-size:0.82rem; color:#aaa;">
                            <strong style="color:#fff;">${kgStr} kg</strong> <span style="color:#666;">(${c.totalGrams.toLocaleString('pt-BR')}g)</span>
                            ${grandTotalGrams > 0 ? `<span style="color:#00a2ff; margin-left:6px; font-weight:600;">• ${percentTotal}%</span>` : ''}
                        </div>
                    </div>
                    
                    <div style="width:100%; height:20px; background:#111; border-radius:6px; border:1px solid #333; overflow:hidden; cursor:pointer;">
                        <div style="height:100%; width:${c.totalGrams > 0 ? Math.max(percentMax, 2) : 0}%; background:linear-gradient(90deg, ${c.hex}aa, ${c.hex}); border-radius:5px; transition:width 0.4s ease;"></div>
                    </div>

                    <!-- Tooltip Hover Popover -->
                    <div class="color-hover-tooltip">
                        <div style="font-weight:700; color:#fff; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:6px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                            <span style="width:10px; height:10px; border-radius:50%; background:${c.hex}; display:inline-block;"></span>
                            🎨 ${escapeHtml(c.name)} — Detalhamento
                        </div>
                        <div style="font-size:0.82rem; color:#eee; margin-bottom:8px;">
                            <strong>Consumo Total:</strong> ${kgStr} kg <span style="color:#aaa;">(${c.totalGrams.toLocaleString('pt-BR')}g)</span>
                        </div>
                        <div style="font-size:0.78rem; font-weight:700; color:#aaa; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">
                            Consumo por Material:
                        </div>
                        <div style="font-size:0.82rem;">
                            ${matHTML}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    rootEl.innerHTML = `
        <style>
            .color-bar-row {
                position: relative;
            }
            .color-bar-row .color-hover-tooltip {
                display: none;
                position: absolute;
                left: 20px;
                background: rgba(18, 18, 24, 0.96);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.85);
                border-radius: 10px;
                padding: 14px 16px;
                min-width: 270px;
                z-index: 9999;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .color-bar-row.tooltip-up .color-hover-tooltip {
                bottom: calc(100% + 6px);
                transform: translateY(4px);
            }
            .color-bar-row.tooltip-down .color-hover-tooltip {
                top: calc(100% + 6px);
                transform: translateY(-4px);
            }
            .color-bar-row:hover .color-hover-tooltip {
                display: block;
                opacity: 1;
                transform: translateY(0);
            }
            .color-bar-row:hover > div:first-child {
                filter: brightness(1.15);
            }
        </style>

        <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:stretch;">
            <!-- CANTO ESQUERDO: MÉTRICAS TOTAIS -->
            <div style="flex:1; min-width:280px; max-width:380px; display:flex; flex-direction:column; gap:16px;">
                <!-- 1. Tempo Total de Impressão -->
                <div style="background:rgba(255, 255, 255, 0.03); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255, 255, 255, 0.08); border-radius:12px; padding:20px; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                    <div style="font-size:0.82rem; color:#aaa; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                        <span>⏱️ Tempo Total de Impressão</span>
                    </div>
                    <div style="font-size:2.1rem; font-weight:800; color:#00a2ff; text-shadow:0 0 12px rgba(0, 162, 255, 0.3);">
                        ${tempoTotalStr}
                    </div>
                    <div style="font-size:0.78rem; color:#777; margin-top:6px;">Total de horas de funcionamento da máquina</div>
                </div>

                <!-- 2. Filamento Total Gasto -->
                <div style="background:rgba(255, 255, 255, 0.03); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255, 255, 255, 0.08); border-radius:12px; padding:20px; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                    <div style="font-size:0.82rem; color:#aaa; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                        <span>⚖️ Filamento Total Gasto</span>
                    </div>
                    <div style="font-size:2.1rem; font-weight:800; color:#4ade80; text-shadow:0 0 12px rgba(74, 222, 128, 0.3);">
                        ${grandTotalKg} kg
                    </div>
                    <div style="font-size:0.82rem; color:#aaa; font-weight:600; margin-top:2px;">
                        (${grandTotalGrams.toLocaleString('pt-BR')} gramas)
                    </div>
                    <div style="font-size:0.78rem; color:#777; margin-top:6px;">Massa total de material consumido (peças + suportes)</div>
                </div>
            </div>

            <!-- CANTO DIREITO: GRÁFICO DE CONSUMO POR COR -->
            <div style="flex:2; min-width:340px; background:#1e1e1e; border:1px solid #333; border-radius:12px; padding:20px; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #2a2a2a; padding-bottom:10px;">
                    <h3 style="font-size:1.05rem; font-weight:700; color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                        📊 Consumo de Filamento por Cor
                    </h3>
                    <span style="font-size:0.78rem; color:#888;">Passe o mouse para detalhar por material (PLA, PETG)</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                    ${chartBarsHTML}
                </div>
            </div>
        </div>
    `;
}



