/* ═══════════════════════════════════════════════════════════════
   Tab: Calculadora (Simulador Financeiro Avançado)
   Calculadora 100% funcional sem dependência de Acervo/Kits.
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, TAXAS_PLATAFORMA, escapeHtml } from '../utils.js';

const folderIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z"/></svg>`;
const cameraIcon = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5 13 3h-2L9.5 5H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3z"/><circle cx="12" cy="12.5" r="3.5"/></svg>`;

async function captureElement(element) {
    await document.fonts?.ready;
    const ignored = [...element.querySelectorAll('[data-capture-ignore]')];
    const previousDisplays = ignored.map(el => el.style.display);
    ignored.forEach(el => { el.style.display = 'none'; });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
        const rect = element.getBoundingClientRect();
        if (window.electron?.captureRegion) {
            const png = await window.electron.captureRegion({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            return new Blob([png], { type: 'image/png' });
        }

        if (typeof window.html2canvas !== 'function') {
            throw new Error('Biblioteca de captura não carregada.');
        }
        const canvas = await window.html2canvas(element, {
            backgroundColor: null,
            scale: Math.max(2, window.devicePixelRatio || 1),
            logging: false,
            useCORS: true,
            imageTimeout: 5000,
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height)
        });
        return await new Promise((resolve, reject) => canvas.toBlob(
            blob => blob ? resolve(blob) : reject(new Error('Não foi possível converter a captura para PNG.')),
            'image/png'
        ));
    } finally {
        ignored.forEach((el, index) => { el.style.display = previousDisplays[index]; });
    }
}

export async function render(container) {
    const config = (await idb.getAll('configuracoes'))[0] || {};
    const todosFilamentos = await idb.getAll('filamentos');
    const filamentos = todosFilamentos.filter(f => f.status === 'Ativo');

    const custoHoraDefault = parseFloat(config.calc_custo_hora) || 1.50;
    const lucroPctDefault  = parseFloat(config.calc_lucro_pct)  || 100;
    const embalagemDefault = parseFloat(config.calc_embalagem)  || 0;

    const platOptions = Object.keys(TAXAS_PLATAFORMA).map(p => 
        `<option value="${p}" ${p === 'Direto' ? 'selected' : ''}>${p}</option>`
    ).join('');

    container.innerHTML = `
        <div class="card" style="width:100%; height:100%; display:flex; flex-direction:column;">
            <div class="card-header calc-main-header">
                <span class="calc-header-title"><span>🧮</span> Calculadora de Impressão 3D</span>
                <button class="calc-folder-btn" id="calc-open-gallery" title="Abrir orçamentos salvos" aria-label="Abrir orçamentos salvos">
                    ${folderIcon}<span id="calc-gallery-count" class="calc-gallery-count" hidden></span>
                </button>
            </div>
            
            <div class="calc-layout" style="display:grid; grid-template-columns: minmax(300px, 1.2fr) minmax(250px, 1fr) minmax(350px, 1.5fr); gap:24px; flex:1; align-items:start;">
                
                <!-- Coluna 1: Material e Custos Extra -->
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <!-- Seção 1: Filamentos (Multi-filamento com Modelo, Purga, Torre) -->
                    <div style="background:rgba(255,255,255,0.02); padding:14px; border-radius:10px; margin-bottom:16px; border:1px solid #333;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <label style="font-weight:600; font-size:0.88rem; color:var(--text-primary); margin:0;">
                                🧵 Filamentos Utilizados
                            </label>
                            <span style="font-size:0.75rem; color:#888;">Gasto de Filamento (g)</span>
                        </div>

                        <div id="calc-filamentos-list">
                            <!-- Linha Padrão 1 -->
                        </div>

                        <button class="btn btn-ghost" id="calc-add-filamento-btn" style="width:100%; font-size:0.8rem; padding:6px; border:1px dashed #555; margin-top:8px;">
                            + Adicionar Outro Filamento
                        </button>
                    </div>

                    <!-- Seção 2: Custos Adicionais Dinâmicos -->
                    <div style="background:rgba(255,255,255,0.02); padding:14px; border-radius:10px; margin-bottom:16px; border:1px solid #333;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <label style="font-weight:600; font-size:0.88rem; color:var(--text-primary); margin:0;">
                                📦 Custos Adicionais
                            </label>
                            <span style="font-size:0.75rem; color:#888;">Embalagem, plastico bolha, envio, etc.</span>
                        </div>

                        <div id="calc-custos-extra-list">
                            <!-- Linha padrão de embalagem inicial se houver valor nas config -->
                        </div>

                        <button class="btn btn-ghost" id="calc-add-custo-extra-btn" style="width:100%; font-size:0.8rem; padding:6px; border:1px dashed #555; margin-top:8px;">
                            + Adicionar Custo Adicional
                        </button>
                    </div>
                </div>

                <!-- Coluna 2: Parâmetros de Precificação -->
                <div style="display:flex; flex-direction:column; gap:16px; background:rgba(0,0,0,0.2); padding:20px; border-radius:12px; border:1px solid #222;">
                    <div class="calc-input-group" style="margin:0;">
                        <label for="calc-custo-h">Custo Operacional / Hora (R$)</label>
                        <input id="calc-custo-h" type="number" step="0.01" value="${custoHoraDefault.toFixed(2)}">
                    </div>

                    <div class="calc-input-group" style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label for="calc-h">Horas</label>
                            <input id="calc-h" type="number" min="0" value="1">
                        </div>
                        <div style="flex:1;">
                            <label for="calc-m">Minutos</label>
                            <input id="calc-m" type="number" min="0" max="59" value="0">
                        </div>
                    </div>

                    <div class="calc-input-group" style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label for="calc-qty">Quantidade de Cópias</label>
                            <input id="calc-qty" type="number" min="1" value="1">
                        </div>
                        <div style="flex:1;">
                            <label for="calc-lucro">Margem de Lucro (%)</label>
                            <input id="calc-lucro" type="number" value="${lucroPctDefault}">
                        </div>
                    </div>

                    <div class="calc-input-group" style="margin:0;">
                        <label for="calc-plat">Plataforma de Venda / Taxa</label>
                        <select id="calc-plat">${platOptions}</select>
                    </div>

                    <button class="btn btn-primary" id="calc-btn" style="width:100%; margin-top:auto; padding:16px; font-size:1.1rem; font-weight:700;">
                        ⚡ Calcular Extrato
                    </button>
                </div>

                <!-- Coluna 3: Painel de Resultados (Simula o Visual do App Desktop) -->
                <div class="calc-result" id="calc-result" style="display:flex; flex-direction:column; justify-content:center; height:100%; background:rgba(0,0,0,0.1); border:1px solid #222; border-radius:12px;">
                    <div style="text-align:center; color:#666; padding:40px 10px;">
                        <div style="font-size:2.5rem; margin-bottom:12px;">📊</div>
                        Preencha os filamentos e custos desejados e clique em <strong>Calcular Extrato</strong> para ver os resultados.
                    </div>
                </div>
            </div>
        </div>
        <div id="calc-modal-root"></div>
    `;

    const filamentosList = container.querySelector('#calc-filamentos-list');
    const custosExtraList = container.querySelector('#calc-custos-extra-list');
    const modalRoot = container.querySelector('#calc-modal-root');
    let lastCalculatedQty = 1;

    async function refreshGalleryCount() {
        const count = (await idb.getAll('orcamentos_salvos')).length;
        const badge = container.querySelector('#calc-gallery-count');
        badge.textContent = count;
        badge.hidden = count === 0;
    }

    function closeModal() {
        modalRoot.innerHTML = '';
    }

    function showSaveModal(captureTarget) {
        modalRoot.innerHTML = `
            <div class="calc-modal-backdrop">
                <div class="calc-modal calc-save-modal" role="dialog" aria-modal="true" aria-labelledby="calc-save-title">
                    <button class="calc-modal-close" type="button" aria-label="Fechar">✕</button>
                    <div class="calc-modal-icon">${cameraIcon}</div>
                    <h2 id="calc-save-title">Salvar recorte do orçamento</h2>
                    <p>Identifique este cálculo para encontrá-lo depois na coleção.</p>
                    <label for="calc-product-name">Nome do produto</label>
                    <input id="calc-product-name" type="text" maxlength="100" placeholder="Ex.: Vaso espiral" autocomplete="off">
                    <label for="calc-product-qty">Quantidade</label>
                    <input id="calc-product-qty" type="number" min="1" step="1" value="${lastCalculatedQty}">
                    <div class="calc-modal-actions">
                        <button class="btn btn-ghost calc-cancel-save" type="button">Cancelar</button>
                        <button class="btn btn-primary calc-confirm-save" type="button">${cameraIcon} Salvar foto</button>
                    </div>
                </div>
            </div>`;
        const nameInput = modalRoot.querySelector('#calc-product-name');
        setTimeout(() => nameInput.focus(), 0);
        modalRoot.querySelector('.calc-modal-close').addEventListener('click', closeModal);
        modalRoot.querySelector('.calc-cancel-save').addEventListener('click', closeModal);
        modalRoot.querySelector('.calc-modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
        modalRoot.querySelector('.calc-confirm-save').addEventListener('click', async () => {
            const productName = nameInput.value.trim();
            const quantity = Math.max(1, parseInt(modalRoot.querySelector('#calc-product-qty').value) || 1);
            if (!productName) {
                nameInput.classList.add('calc-input-error');
                nameInput.focus();
                return;
            }
            const button = modalRoot.querySelector('.calc-confirm-save');
            button.disabled = true;
            button.textContent = 'Gerando foto…';
            const backdrop = modalRoot.querySelector('.calc-modal-backdrop');
            backdrop.style.display = 'none';
            try {
                const blob = await captureElement(captureTarget);
                const id = `orc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const mediaPath = `src_media/orcamentos/${id}.png`;
                await idb.putMedia(mediaPath, blob);
                await idb.put('orcamentos_salvos', { id, nome_produto: productName, quantidade: quantity, media_path: mediaPath, criado_em: new Date().toISOString() });
                closeModal();
                await refreshGalleryCount();
                showToast('Orçamento salvo na coleção.');
            } catch (error) {
                console.error('[calculadora] Falha ao salvar recorte:', error);
                backdrop.style.display = '';
                button.disabled = false;
                button.textContent = 'Tentar novamente';
                alert(`Não foi possível salvar a imagem deste card.\n\nDetalhe: ${error.message || error}`);
            }
        });
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'calc-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220); }, 2200);
    }

    function showImageViewer(record, url) {
        if (!url || document.querySelector('.calc-image-viewer-backdrop')) return;
        const viewer = document.createElement('div');
        viewer.className = 'calc-image-viewer-backdrop';
        viewer.innerHTML = `
            <div class="calc-image-viewer" role="dialog" aria-modal="true" aria-label="Orçamento ampliado de ${escapeHtml(record.nome_produto || 'produto')}">
                <img src="${escapeHtml(url)}" alt="Orçamento completo de ${escapeHtml(record.nome_produto || '')}">
            </div>`;
        // Mantém o visualizador na raiz do documento para que nenhum contexto
        // de empilhamento da aba/galeria consiga colocá-lo por trás do modal.
        document.body.appendChild(viewer);
        requestAnimationFrame(() => viewer.classList.add('is-open'));

        const closeViewer = () => {
            document.removeEventListener('keydown', onViewerKeydown);
            viewer.classList.remove('is-open');
            viewer.addEventListener('transitionend', () => viewer.remove(), { once: true });
            setTimeout(() => viewer.remove(), 250);
        };
        const onViewerKeydown = (event) => { if (event.key === 'Escape') closeViewer(); };
        viewer.addEventListener('click', event => { if (event.target === viewer) closeViewer(); });
        document.addEventListener('keydown', onViewerKeydown);
        viewer.tabIndex = -1;
        viewer.focus();
    }

    async function showGallery() {
        const records = (await idb.getAll('orcamentos_salvos')).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
        modalRoot.innerHTML = `
            <div class="calc-modal-backdrop">
                <div class="calc-modal calc-gallery-modal" role="dialog" aria-modal="true" aria-labelledby="calc-gallery-title">
                    <div class="calc-gallery-header">
                        <div><h2 id="calc-gallery-title">Coleção de orçamentos</h2><p>${records.length} ${records.length === 1 ? 'recorte salvo' : 'recortes salvos'}</p></div>
                        <button class="calc-modal-close" type="button" aria-label="Fechar">✕</button>
                    </div>
                    <div class="calc-gallery-grid">${records.length ? records.map(r => `
                        <article class="calc-saved-card" data-id="${escapeHtml(String(r.id))}">
                            <div class="calc-saved-image"><div class="calc-image-loader">Carregando imagem…</div></div>
                            <div class="calc-saved-info">
                                <div><h3>${escapeHtml(r.nome_produto || 'Sem nome')}</h3><span>${Number(r.quantidade) || 1} unid. · ${new Date(r.criado_em).toLocaleDateString('pt-BR')}</span></div>
                                <div class="calc-saved-actions">
                                    <button class="calc-icon-btn calc-download" title="Baixar PNG" aria-label="Baixar PNG">↓</button>
                                    <button class="calc-icon-btn danger calc-delete" title="Excluir recorte" aria-label="Excluir recorte">✕</button>
                                </div>
                            </div>
                        </article>`).join('') : `<div class="calc-gallery-empty">${folderIcon}<h3>Nenhum orçamento salvo</h3><p>Calcule um extrato e use o botão de câmera no canto inferior direito do card.</p></div>`}</div>
                </div>
            </div>`;
        modalRoot.querySelector('.calc-modal-close').addEventListener('click', closeModal);
        modalRoot.querySelector('.calc-modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

        for (const record of records) {
            const card = modalRoot.querySelector(`.calc-saved-card[data-id="${CSS.escape(String(record.id))}"]`);
            const url = await idb.resolveMediaUrl(record.media_path);
            const imageWrap = card.querySelector('.calc-saved-image');
            imageWrap.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Orçamento de ${escapeHtml(record.nome_produto || '')}">` : '<div class="calc-image-loader">Imagem indisponível</div>';
            if (url) {
                imageWrap.tabIndex = 0;
                imageWrap.setAttribute('role', 'button');
                imageWrap.setAttribute('aria-label', `Ampliar orçamento de ${record.nome_produto || 'produto'}`);
                imageWrap.addEventListener('dblclick', () => showImageViewer(record, url));
                imageWrap.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        showImageViewer(record, url);
                    }
                });
            }
            card.querySelector('.calc-download').addEventListener('click', () => {
                if (!url) return;
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `${String(record.nome_produto || 'orcamento').replace(/[^a-z0-9_-]+/gi, '_')}_${record.quantidade || 1}un.png`;
                anchor.click();
            });
            card.querySelector('.calc-delete').addEventListener('click', async () => {
                if (!confirm(`Excluir o orçamento de "${record.nome_produto}"?`)) return;
                await idb.deleteItem('orcamentos_salvos', record.id);
                await idb.deleteMedia(record.media_path);
                if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
                card.remove();
                await refreshGalleryCount();
                showGallery();
            });
        }
    }

    container.querySelector('#calc-open-gallery').addEventListener('click', showGallery);
    refreshGalleryCount();

    // Helper para gerar as opções de filamento
    function getFilamentoOptionsHTML() {
        if (!filamentos || filamentos.length === 0) {
            return `<option value="">Nenhum filamento cadastrado</option>`;
        }
        return filamentos.map(f => {
            const label = `${escapeHtml(f.marca || '')} ${escapeHtml(f.material || '')} (${escapeHtml(f.cor || '')}) - R$ ${parseFloat(f.preco_rolo || 0).toFixed(2)}`;
            return `<option value="${f.id}">${label}</option>`;
        }).join('');
    }

    // Função para adicionar linha de filamento
    function addFilamentoRow(filId = null, mod = 50, purga = 0, torre = 0) {
        const row = document.createElement('div');
        row.className = 'calc-fil-row';
        row.style = 'background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid #2a2a2a;';
        row.innerHTML = `
            <div style="margin-bottom:8px;">
                <select class="calc-fil-select" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:6px 8px; border-radius:4px; font-size:0.85rem;">
                    ${getFilamentoOptionsHTML()}
                </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr 32px; gap:6px; align-items:center;">
                <div>
                    <span style="font-size:0.7rem; color:#aaa; display:block;">Modelo (g)</span>
                    <input class="calc-fil-mod" type="number" step="0.1" value="${mod}" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:4px 6px; border-radius:4px; font-size:0.85rem;">
                </div>
                <div>
                    <span style="font-size:0.7rem; color:#aaa; display:block;">Purga (g)</span>
                    <input class="calc-fil-purga" type="number" step="0.1" value="${purga}" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:4px 6px; border-radius:4px; font-size:0.85rem;">
                </div>
                <div>
                    <span style="font-size:0.7rem; color:#aaa; display:block;">Torre (g)</span>
                    <input class="calc-fil-torre" type="number" step="0.1" value="${torre}" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:4px 6px; border-radius:4px; font-size:0.85rem;">
                </div>
                <button class="btn btn-ghost calc-fil-del" style="color:#d64545; padding:4px; margin-top:14px; text-align:center;" title="Remover Filamento">✕</button>
            </div>
        `;

        if (filId) {
            const sel = row.querySelector('.calc-fil-select');
            if (sel) sel.value = filId;
        }

        row.querySelector('.calc-fil-del').addEventListener('click', () => {
            if (filamentosList.children.length > 1) {
                row.remove();
            } else {
                alert('É necessário manter pelo menos 1 filamento no cálculo.');
            }
        });

        filamentosList.appendChild(row);
    }

    // Função para adicionar linha de custo adicional
    function addCustoExtraRow(nome = '', valor = 0) {
        const row = document.createElement('div');
        row.className = 'calc-extra-row';
        row.style = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
        row.innerHTML = `
            <div style="flex:2;">
                <input class="calc-extra-nome" type="text" placeholder="Nome (ex: Embalagem)" value="${escapeHtml(nome)}" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:6px 8px; border-radius:4px; font-size:0.85rem;">
            </div>
            <div style="flex:1;">
                <input class="calc-extra-valor" type="number" step="0.01" placeholder="Valor (R$)" value="${valor ? valor.toFixed(2) : ''}" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:6px 8px; border-radius:4px; font-size:0.85rem;">
            </div>
            <button class="btn btn-ghost calc-extra-del" style="color:#d64545; padding:6px 10px;" title="Remover Custo">✕</button>
        `;

        row.querySelector('.calc-extra-del').addEventListener('click', () => row.remove());
        custosExtraList.appendChild(row);
    }

    // Inicializa a primeira linha de filamento
    addFilamentoRow();

    // Se houver valor padrão de embalagem nas configurações, insere a primeira linha extra
    if (embalagemDefault > 0) {
        addCustoExtraRow('Embalagem', embalagemDefault);
    }

    // Event listeners para os botões de adicionar
    container.querySelector('#calc-add-filamento-btn').addEventListener('click', () => addFilamentoRow());
    container.querySelector('#calc-add-custo-extra-btn').addEventListener('click', () => addCustoExtraRow());

    // Executa a lógica de cálculo
    container.querySelector('#calc-btn').addEventListener('click', () => {

        // 1. Processar Filamentos
        const filRows = container.querySelectorAll('.calc-fil-row');
        let custoMateriaisTotal = 0;
        let pesoTotalGeral = 0;
        const matLinesHTML = [];

        filRows.forEach(r => {
            const filId = parseInt(r.querySelector('.calc-fil-select').value);
            const pModelo = parseFloat(r.querySelector('.calc-fil-mod').value) || 0;
            const pPurga  = parseFloat(r.querySelector('.calc-fil-purga').value) || 0;
            const pTorre  = parseFloat(r.querySelector('.calc-fil-torre').value) || 0;

            const fil = filamentos.find(f => String(f.id) === String(filId));
            if (!fil) return;

            const pesoIniKg = parseFloat(fil.peso_inicial) || 1.0;
            const precoGrama = (parseFloat(fil.preco_rolo) || 0) / (pesoIniKg * 1000);
            
            const pesoFilamentoRow = pModelo + pPurga + pTorre;
            const custoFilamentoRow = pesoFilamentoRow * precoGrama;

            custoMateriaisTotal += custoFilamentoRow;
            pesoTotalGeral += pesoFilamentoRow;

            const detalhePeso = `Modelo: ${pModelo.toFixed(1)}g` + 
                               (pPurga > 0 ? ` | Purga: ${pPurga.toFixed(1)}g` : '') + 
                               (pTorre > 0 ? ` | Torre: ${pTorre.toFixed(1)}g` : '');

            matLinesHTML.push(`
                <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:4px 0; border-bottom:1px dashed #2a2a2a;">
                    <div>
                        <div style="color:#eee; font-weight:600; font-size:0.85rem;">
                            🧵 ${escapeHtml(fil.marca || '')} ${escapeHtml(fil.material || '')} (${escapeHtml(fil.cor || '')})
                        </div>
                        <div style="color:#888; font-size:0.75rem;">${detalhePeso} (Total: ${pesoFilamentoRow.toFixed(1)}g)</div>
                    </div>
                    <div style="color:var(--accent); font-weight:600; font-size:0.85rem; font-family:monospace;">
                        ${formatBRL(custoFilamentoRow)}
                    </div>
                </div>
            `);
        });

        // 2. Processar Custos Adicionais
        const extraRows = container.querySelectorAll('.calc-extra-row');
        let custoExtrasTotal = 0;
        const extraLinesHTML = [];

        extraRows.forEach(r => {
            const nomeExtra = r.querySelector('.calc-extra-nome').value.trim() || 'Outro Custo';
            const valExtra  = parseFloat(r.querySelector('.calc-extra-valor').value) || 0;

            if (valExtra > 0) {
                custoExtrasTotal += valExtra;
                extraLinesHTML.push(`
                    <div style="display:flex; justify-content:space-between; padding:3px 0;">
                        <span style="color:#aaa; font-size:0.85rem;">📦 ${escapeHtml(nomeExtra)}</span>
                        <span style="color:#a0a0c0; font-weight:500; font-size:0.85rem; font-family:monospace;">${formatBRL(valExtra)}</span>
                    </div>
                `);
            }
        });

        // 3. Processar Operacional e Geral
        const custoHora = parseFloat(container.querySelector('#calc-custo-h').value) || 0;
        const horas     = parseInt(container.querySelector('#calc-h').value) || 0;
        const mins      = parseInt(container.querySelector('#calc-m').value) || 0;
        const qty       = parseInt(container.querySelector('#calc-qty').value) || 1;
        lastCalculatedQty = qty;
        const lucroPct  = parseFloat(container.querySelector('#calc-lucro').value) || 0;
        const plat      = container.querySelector('#calc-plat').value;
        const taxaPlat  = TAXAS_PLATAFORMA[plat] || 0;

        const tempoTotalHoras = horas + mins / 60;
        const custoOperacional = custoHora * tempoTotalHoras;

        const custoTotalGlobal = custoMateriaisTotal + custoOperacional + custoExtrasTotal;
        const custoUnitario    = custoTotalGlobal / qty;

        const valorLucroUnit   = custoUnitario * (lucroPct / 100);
        const precoSemTaxaUnit = custoUnitario + valorLucroUnit;

        const precoFinalUnit   = taxaPlat > 0 ? precoSemTaxaUnit / (1 - taxaPlat) : precoSemTaxaUnit;
        const valorTaxaUnit    = precoFinalUnit - precoSemTaxaUnit;

        const precoFinalTotal  = precoFinalUnit * qty;

        const hStr = horas > 0 ? `${horas}h` : '';
        const mStr = mins > 0 ? ` ${mins}min` : '';

        // Renderizar Resultado Estilizado no formato do App
        const resultContainer = container.querySelector('#calc-result');
        resultContainer.innerHTML = `
            <div class="calc-capture-card" style="background:#1e1e1e; border:1px solid #333; border-radius:12px; padding:20px; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="text-align:center; border-bottom:1px solid #333; padding-bottom:12px; margin-bottom:14px;">
                    <h3 style="font-size:1.15rem; color:#fff; font-weight:700; margin:0;">
                        📋 Extrato do Orçamento
                    </h3>
                    <div style="font-size:0.78rem; color:#888; margin-top:4px;">
                        Calculado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                    </div>
                </div>

                <!-- Detalhamento de Materiais -->
                <div style="margin-bottom:12px;">
                    <div style="font-size:0.72rem; color:var(--accent); text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                        MATERIAIS DE IMPRESSÃO
                    </div>
                    ${matLinesHTML.length ? matLinesHTML.join('') : '<div style="color:#666; font-size:0.8rem;">Nenhum filamento selecionado.</div>'}
                    <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:0.8rem; color:#888;">
                        <span>Peso Total: <strong>${pesoTotalGeral.toFixed(1)}g</strong></span>
                        <span>Subtotal Mat: <strong style="color:#eee;">${formatBRL(custoMateriaisTotal)}</strong></span>
                    </div>
                </div>

                <!-- Custos Adicionais -->
                <div style="margin-bottom:12px; border-top:1px solid #2a2a2a; padding-top:8px;">
                    <div style="font-size:0.72rem; color:#a0a0c0; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                        CUSTOS ADICIONAIS
                    </div>
                    ${extraLinesHTML.length ? extraLinesHTML.join('') : '<div style="color:#666; font-size:0.8rem;">Sem custos adicionais.</div>'}
                    ${custoExtrasTotal > 0 ? `<div style="display:flex; justify-content:space-between; margin-top:4px; font-size:0.8rem; color:#888;"><span>Subtotal Extras:</span><strong style="color:#eee;">${formatBRL(custoExtrasTotal)}</strong></div>` : ''}
                </div>

                <!-- Tempo / Operacional -->
                <div style="margin-bottom:14px; border-top:1px solid #2a2a2a; padding-top:8px;">
                    <div style="font-size:0.72rem; color:#d97706; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                        OPERACIONAL & TEMPO
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                        <span style="color:#aaa;">⚡ Tempo (${hStr}${mStr || '0min'}) @ R$ ${custoHora.toFixed(2)}/h</span>
                        <span style="color:#d97706; font-weight:600; font-family:monospace;">${formatBRL(custoOperacional)}</span>
                    </div>
                </div>

                <!-- Resumo dos Totais -->
                <div style="background:#141414; border:1px solid #282828; border-radius:8px; padding:12px; margin-top:12px;">
                    <div style="display:flex; justify-content:space-between; padding:2px 0; font-size:0.85rem;">
                        <span style="color:#888;">Custo de Produção Total:</span>
                        <span style="color:#eee; font-weight:600;">${formatBRL(custoTotalGlobal)}</span>
                    </div>
                    ${qty > 1 ? `
                    <div style="display:flex; justify-content:space-between; padding:2px 0; font-size:0.85rem; font-weight:700;">
                        <span style="color:#d64545;">Custo Unitário (${qty} unid):</span>
                        <span style="color:#d64545;">${formatBRL(custoUnitario)}</span>
                    </div>` : ''}
                    <div style="display:flex; justify-content:space-between; padding:2px 0; font-size:0.85rem;">
                        <span style="color:#4ade80;">+ Margem de Lucro (${lucroPct}%):</span>
                        <span style="color:#4ade80; font-weight:600;">${formatBRL(valorLucroUnit * qty)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:2px 0; font-size:0.85rem;">
                        <span style="color:#d97706;">Taxa ${escapeHtml(plat)} (${(taxaPlat*100).toFixed(0)}%):</span>
                        <span style="color:#d97706; font-weight:600;">${formatBRL(valorTaxaUnit * qty)}</span>
                    </div>
                </div>

                <!-- Valor Final de Venda -->
                <div class="calc-result-total" style="background:linear-gradient(135deg, rgba(43,122,75,0.2) 0%, rgba(16,185,129,0.1) 100%); border:1px solid var(--green); border-radius:8px; padding:14px; margin-top:14px;">
                    <div style="font-size:0.75rem; color:#888; text-transform:uppercase; font-weight:600; margin-bottom:2px;">
                        Preço Sugerido de Venda
                    </div>
                    <div style="font-size:1.8rem; font-weight:800; color:#4ade80;">
                        ${formatBRL(precoFinalTotal)}
                    </div>
                    ${qty > 1 ? `<div style="font-size:0.8rem; color:#aaa; margin-top:2px;">(${formatBRL(precoFinalUnit)} por unidade)</div>` : ''}
                </div>
                <div class="calc-capture-action" data-capture-ignore="true">
                    <button class="calc-save-shot-btn" type="button" title="Salvar foto deste orçamento">${cameraIcon}<span>Salvar recorte</span></button>
                </div>
            </div>
        `;
        const captureCard = resultContainer.querySelector('.calc-capture-card');
        resultContainer.querySelector('.calc-save-shot-btn').addEventListener('click', () => showSaveModal(captureCard));
    });
}
