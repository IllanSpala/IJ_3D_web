/* ═══════════════════════════════════════════════════════════════
   Tab: Pedidos (Kanban Interativo - 4 Colunas)
   Compatível com o app desktop, migração automática e log do BD.
   Colunas: A MODELAR | A IMPRIMIR | IMPRESSO/PINTANDO | ENVIANDO/CONCLUIDO
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, formatDate, escapeHtml } from '../utils.js';

export async function render(container) {
    // 1. Executar verificação/migração dinâmica de pedidos legados
    async function syncDatabase() {
        let p2 = await idb.getAll('pedidos_v2');
        let p1 = await idb.getAll('pedidos');
        let itens = await idb.getAll('pedidos_itens');

        const existingIds = new Set(p2.map(x => x.id));
        let countMigrated = 0;

        if (p1.length > 0) {
            for (const oldP of p1) {
                if (!existingIds.has(oldP.id)) {
                    const newEntry = {
                        id: oldP.id || (Date.now() + Math.floor(Math.random() * 1000)),
                        nome_cliente: oldP.nome_cliente || oldP.cliente || 'Cliente Desconhecido',
                        data_entrega: oldP.data_entrega || oldP.data || '',
                        valor_cobrado: parseFloat(oldP.valor_cobrado || oldP.valor || 0),
                        status: (oldP.status || 'A MODELAR').toUpperCase(),
                        plataforma_venda: oldP.plataforma_venda || 'Direto'
                    };
                    p2.push(newEntry);
                    existingIds.add(newEntry.id);
                    countMigrated++;

                    if (oldP.peca || oldP.nome_peca) {
                        itens.push({
                            id: Date.now() + Math.floor(Math.random() * 10000),
                            pedido_id: newEntry.id,
                            tipo: 'avulso',
                            nome_avulso: oldP.peca || oldP.nome_peca,
                            custo_est: 0
                        });
                    }
                }
            }

            if (countMigrated > 0) {
                await idb.putAll('pedidos_v2', p2);
                await idb.putAll('pedidos_itens', itens);
                console.log(`[BD LOG] Migrados ${countMigrated} pedidos da tabela legada 'pedidos' para 'pedidos_v2'.`);
            }
        }

        return { pedidos: p2, itens, legacyCount: p1.length, migratedCount: countMigrated };
    }

    const dbSync = await syncDatabase();
    let pedidos = dbSync.pedidos;
    let itens   = dbSync.itens;

    console.log(`[BD LOG - Pedidos] Total de Pedidos Ativos: ${pedidos.length} (pedidos_v2), ${dbSync.legacyCount} em pedidos legados.`);

    function normalizeStatus(st) {
        const s = (st || '').trim().toUpperCase();
        if (s === 'FINALIZADO') return 'FINALIZADO';
        if (s === 'A FAZER' || s === 'AGUARDANDO' || s === 'NÃO IMPRESSO' || s === 'A MODELAR' || !s) return 'A MODELAR';
        if (s === 'IMPRIMINDO' || s === 'A IMPRIMIR') return 'A IMPRIMIR';
        if (s === 'EM PRODUÇÃO' || s === 'IMPRESSO EM PRODUÇÃO' || s === 'IMPRESSO' || s === 'PINTANDO' || s === 'IMPRESSO/PINTANDO') return 'IMPRESSO/PINTANDO';
        if (s === 'ENCAMINHADO' || s === 'ENTREGUE' || s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'ENVIANDO/CONCLUIDO' || s === 'ENVIADO/FINALIZADO') return 'CONCLUIDO';
        return 'A MODELAR';
    }

    const STATUS_COLUMNS = [
        { id: 'A MODELAR',          label: 'A MODELAR',          color: '#a83232', bg: '#2e1a2e' },
        { id: 'A IMPRIMIR',         label: 'A IMPRIMIR',         color: '#3b82f6', bg: '#1a2a3e' },
        { id: 'IMPRESSO/PINTANDO',  label: 'IMPRESSO/PINTANDO',  color: '#d97706', bg: '#2e2116' },
        { id: 'CONCLUIDO',          label: 'CONCLUÍDO',          color: '#10b981', bg: '#162e21' }
    ];

    container.innerHTML = `
        <div style="max-width:1400px; margin:0 auto;">
            <!-- Log de Status do Banco de Dados -->
            <div style="background:#1a1a24; border:1px solid #3b3b58; border-radius:8px; padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#aaa;">
                <div>
                    <strong>📊 Log do Banco de Dados:</strong> <span style="color:#eee;" id="ped-db-log-text">Carregados <strong>${pedidos.length}</strong> pedidos (${dbSync.legacyCount} encontrados no BD legado).</span>
                </div>
                <button class="btn btn-ghost" id="ped-btn-re-sync" style="font-size:0.75rem; padding:4px 8px; border:1px solid #555;">🔄 Re-sincronizar BD</button>
            </div>

            <!-- Barra Superior -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="font-size:1.4rem; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px; margin:0;">
                    📝 Quadro de Pedidos
                </h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-ghost" id="btn-ver-finalizados" style="border:1px solid #444;">
                        🗄️ Ver Pedidos Finalizados
                    </button>
                    <button class="btn btn-primary" id="btn-toggle-novo-pedido" style="font-weight:700;">
                        + Adicionar Pedido
                    </button>
                </div>
            </div>

            <!-- Card de Criação de Novo Pedido -->
            <div id="form-novo-pedido" style="display:none; background:#1e1e1e; border:1px solid #333; border-radius:12px; padding:20px; margin-bottom:24px; box-shadow:0 8px 24px rgba(0,0,0,0.4);">
                <h3 style="font-size:1.1rem; font-weight:700; margin-bottom:16px; color:var(--accent);">
                    ✨ Criar Novo Pedido
                </h3>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:16px;">
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Nome do Cliente *</label>
                        <input id="ped-nome-cliente" type="text" placeholder="Ex: Bia, Marlon, Gabriel..." style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Data de Entrega</label>
                        <input id="ped-data-entrega" type="date" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Valor Cobrado (R$)</label>
                        <input id="ped-valor" type="number" step="0.01" placeholder="0.00" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Plataforma</label>
                        <select id="ped-plat" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                            <option value="Direto">Direto</option>
                            <option value="Shopee">Shopee</option>
                            <option value="MercadoLivre">MercadoLivre</option>
                            <option value="OLX">OLX</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Status Inicial</label>
                        <select id="ped-status-init" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                            <option value="A MODELAR">A MODELAR</option>
                            <option value="A IMPRIMIR">A IMPRIMIR</option>
                            <option value="IMPRESSO/PINTANDO">IMPRESSO/PINTANDO</option>
                            <option value="ENVIANDO/CONCLUIDO">ENVIADO/FINALIZADO</option>
                        </select>
                    </div>
                </div>

                <!-- Adicionar Peças do Pedido -->
                <div style="background:#141414; padding:12px; border-radius:8px; border:1px solid #282828; margin-bottom:16px;">
                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#eee; margin-bottom:8px;">📦 Peças do Pedido</label>
                    
                    <div id="ped-pecas-list" style="margin-bottom:8px;"></div>

                    <div style="display:flex; gap:8px;">
                        <input id="ped-nova-peca-nome" type="text" placeholder="Nome da peça (ex: Regador, Action Figure...)" style="flex:2; background:#111; border:1px solid #444; color:#eee; padding:6px 10px; border-radius:6px; font-size:0.85rem;">
                        <input id="ped-nova-peca-custo" type="number" step="0.01" placeholder="Custo est. R$" style="flex:1; background:#111; border:1px solid #444; color:#eee; padding:6px 10px; border-radius:6px; font-size:0.85rem;">
                        <button type="button" class="btn btn-ghost" id="ped-add-peca-btn" style="font-size:0.8rem; padding:6px 12px; background:#2a2a2a;">+ Add Peça</button>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn btn-ghost" id="ped-cancelar-btn">Cancelar</button>
                    <button class="btn btn-success" id="ped-salvar-btn" style="font-weight:700;">Salvar Pedido</button>
                </div>
            </div>

            <!-- Tabuleiro Kanban (4 Colunas) -->
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; align-items:start;" id="kanban-container">
                ${STATUS_COLUMNS.map(col => `
                    <div style="background:#161616; border:1px solid #282828; border-radius:10px; overflow:hidden; min-height:500px; display:flex; flex-direction:column;">
                        <div style="background:${col.bg}; border-bottom:2px solid ${col.color}; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:700; font-size:0.85rem; color:#eee; letter-spacing:0.5px;">${col.label}</span>
                            <span class="badge" id="count-${col.id.replace(/[\/\s]/g, '_')}" style="background:${col.color}; color:#fff;">0</span>
                        </div>
                        <div id="col-${col.id.replace(/[\/\s]/g, '_')}" style="padding:10px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                            <!-- Cards do Kanban serão renderizados aqui -->
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Modal Edição / Finalizados (adicionados via JS) -->
            <div id="modal-edicao" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:1000; min-width:400px; box-shadow:0 8px 32px rgba(0,0,0,0.8);"></div>
            <div id="modal-finalizados" style="display:none; position:fixed; top:10%; left:10%; right:10%; bottom:10%; background:#1e1e1e; padding:20px; border-radius:12px; border:1px solid #333; z-index:900; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.8);"></div>
            <div id="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:800;"></div>
        </div>
    `;

    let pecasFormCriacao = [];

    const formNovo = container.querySelector('#form-novo-pedido');
    const btnToggle = container.querySelector('#btn-toggle-novo-pedido');
    const btnCancelar = container.querySelector('#ped-cancelar-btn');
    const btnSalvar = container.querySelector('#ped-salvar-btn');
    const btnAddPeca = container.querySelector('#ped-add-peca-btn');
    const pecasListDiv = container.querySelector('#ped-pecas-list');

    container.querySelector('#ped-btn-re-sync').addEventListener('click', async () => {
        const syncRes = await syncDatabase();
        pedidos = syncRes.pedidos;
        itens = syncRes.itens;
        container.querySelector('#ped-db-log-text').innerHTML = `Carregados <strong>${pedidos.length}</strong> pedidos (${syncRes.legacyCount} encontrados no BD legado). Migrados: ${syncRes.migratedCount}.`;
        await renderKanban();
    });

    btnToggle.addEventListener('click', () => {
        const isOpen = formNovo.style.display === 'block';
        formNovo.style.display = isOpen ? 'none' : 'block';
        btnToggle.textContent = isOpen ? '+ Adicionar Pedido' : '✕ Cancelar';
    });

    btnCancelar.addEventListener('click', () => {
        formNovo.style.display = 'none';
        btnToggle.textContent = '+ Adicionar Pedido';
        resetForm();
    });

    function renderPecasForm() {
        pecasListDiv.innerHTML = pecasFormCriacao.map((p, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1c1c1c; padding:6px 10px; border-radius:4px; margin-bottom:4px; font-size:0.82rem;">
                <span style="color:#eee;">• ${escapeHtml(p.nome)} ${p.custo ? `<span style="color:#888;">(Custo: ${formatBRL(p.custo)})</span>` : ''}</span>
                <button type="button" class="btn btn-ghost ped-rem-peca-btn" data-idx="${idx}" style="color:#d64545; padding:0 6px;">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.ped-rem-peca-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.idx);
                pecasFormCriacao.splice(index, 1);
                renderPecasForm();
            });
        });
    }

    btnAddPeca.addEventListener('click', () => {
        const inpNome = container.querySelector('#ped-nova-peca-nome');
        const inpCusto = container.querySelector('#ped-nova-peca-custo');
        const nome = inpNome.value.trim();
        const custo = parseFloat(inpCusto.value) || 0;

        if (nome) {
            pecasFormCriacao.push({ nome, custo });
            inpNome.value = '';
            inpCusto.value = '';
            renderPecasForm();
        }
    });

    function resetForm() {
        container.querySelector('#ped-nome-cliente').value = '';
        container.querySelector('#ped-data-entrega').value = '';
        container.querySelector('#ped-valor').value = '';
        container.querySelector('#ped-plat').value = 'Direto';
        container.querySelector('#ped-status-init').value = 'A MODELAR';
        pecasFormCriacao = [];
        renderPecasForm();
    }

    btnSalvar.addEventListener('click', async () => {
        const nomeCliente = container.querySelector('#ped-nome-cliente').value.trim();
        const dataEntrega = container.querySelector('#ped-data-entrega').value;
        const valorCobrado = parseFloat(container.querySelector('#ped-valor').value) || 0;
        const plataforma = container.querySelector('#ped-plat').value;
        const statusInit = container.querySelector('#ped-status-init').value;

        if (!nomeCliente) {
            alert('Por favor, informe o nome do cliente.');
            return;
        }

        const newPedido = {
            id: Date.now(),
            nome_cliente: nomeCliente,
            data_entrega: dataEntrega,
            valor_cobrado: valorCobrado,
            plataforma_venda: plataforma,
            status: statusInit
        };

        pedidos.push(newPedido);
        await idb.putAll('pedidos_v2', pedidos);

        if (pecasFormCriacao.length > 0) {
            for (const p of pecasFormCriacao) {
                const newItem = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    pedido_id: newPedido.id,
                    tipo: 'avulso',
                    nome_avulso: p.nome,
                    custo_est: p.custo
                };
                itens.push(newItem);
            }
            await idb.putAll('pedidos_itens', itens);
        }

        resetForm();
        formNovo.style.display = 'none';
        btnToggle.textContent = '+ Adicionar Pedido';
        await renderKanban();
    });

    const overlay = container.querySelector('#modal-overlay');
    const modalEdicao = container.querySelector('#modal-edicao');
    const modalFinalizados = container.querySelector('#modal-finalizados');
    
    overlay.addEventListener('click', () => {
        modalEdicao.style.display = 'none';
        modalFinalizados.style.display = 'none';
        overlay.style.display = 'none';
    });

    container.querySelector('#btn-ver-finalizados').addEventListener('click', () => {
        renderFinalizados();
    });

    function renderFinalizados() {
        const finalizados = pedidos.filter(p => (p.status || '').toUpperCase() === 'FINALIZADO');
        
        let html = `
            <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
                <h3 style="margin:0; font-weight:700;">🗄️ Pedidos Finalizados / Arquivo</h3>
                <button class="btn btn-ghost" onclick="document.getElementById('modal-overlay').click()">✕</button>
            </div>
            <table class="data-table" style="width:100%; text-align:left;">
                <thead><tr><th>Data Entrega</th><th>Cliente</th><th>Plataforma</th><th>Valor (R$)</th><th>Ações</th></tr></thead>
                <tbody>
        `;
        
        if(finalizados.length === 0) {
            html += `<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">Nenhum pedido finalizado.</td></tr>`;
        } else {
            finalizados.forEach(p => {
                html += `
                    <tr>
                        <td>${formatDate(p.data_entrega)}</td>
                        <td>${escapeHtml(p.nome_cliente)}</td>
                        <td>${escapeHtml(p.plataforma_venda)}</td>
                        <td>
                            <input type="number" step="0.01" class="fin-edit-val" data-id="${p.id}" value="${p.valor_cobrado}" style="width:80px; background:#111; border:1px solid #444; color:#fff; padding:4px;">
                        </td>
                        <td>
                            <button class="btn btn-ghost ped-restore-btn" data-id="${p.id}" style="color:#00a2ff; font-size:0.8rem; padding:4px 8px;">Restaurar ao Kanban</button>
                            <button class="btn btn-ghost ped-del-btn" data-id="${p.id}" style="color:#f87171; font-size:0.8rem; padding:4px 8px;">✕ Excluir</button>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table>`;
        modalFinalizados.innerHTML = html;
        overlay.style.display = 'block';
        modalFinalizados.style.display = 'block';

        // Bind events in finalizados modal
        modalFinalizados.querySelectorAll('.fin-edit-val').forEach(inp => {
            inp.addEventListener('change', async (e) => {
                const id = isNaN(e.target.dataset.id) ? e.target.dataset.id : Number(e.target.dataset.id);
                const p = pedidos.find(x => x.id === id);
                if (p) {
                    p.valor_cobrado = parseFloat(e.target.value) || 0;
                    await idb.putAll('pedidos_v2', pedidos);
                }
            });
        });

        modalFinalizados.querySelectorAll('.ped-restore-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                        const id = isNaN(e.target.dataset.id) ? e.target.dataset.id : Number(e.target.dataset.id);
                const p = pedidos.find(x => x.id === id);
                if (p) {
                    p.status = 'CONCLUIDO';
                    await idb.putAll('pedidos_v2', pedidos);
                    renderFinalizados();
                    renderKanban();
                }
            });
        });

        modalFinalizados.querySelectorAll('.ped-del-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = isNaN(e.target.dataset.id) ? e.target.dataset.id : Number(e.target.dataset.id);
                if (confirm('Excluir este pedido finalizado?')) {
                    pedidos = pedidos.filter(x => x.id !== id);
                    itens = itens.filter(x => x.pedido_id !== id);
                    await idb.putAll('pedidos_v2', pedidos);
                    await idb.putAll('pedidos_itens', itens);
                    renderFinalizados();
                }
            });
        });
    }

    function openEditModal(pedId) {
        const p = pedidos.find(x => x.id === pedId);
        if (!p) return;
        const pItens = itens.filter(i => i.pedido_id === pedId);

        let itensHtml = pItens.map(i => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; padding:4px; background:#111; border-radius:4px;">
                <div style="display:flex; gap:4px; flex:1; margin-right:8px;">
                    <input type="text" class="edit-item-nome" data-iid="${i.id}" value="${escapeHtml(i.nome_avulso||i.peca||'Peça')}" style="flex:2; background:#000; border:1px solid #444; color:#fff; padding:4px; font-size:0.8rem;">
                    <input type="number" step="0.01" class="edit-item-custo" data-iid="${i.id}" value="${i.custo_est||0}" style="width:70px; background:#000; border:1px solid #444; color:#fff; padding:4px; font-size:0.8rem;">
                </div>
                <button class="btn btn-ghost ped-remove-item" data-iid="${i.id}" style="color:#f87171; padding:0 4px;" title="Remover item">✕</button>
            </div>
        `).join('');

        modalEdicao.innerHTML = `
            <h3 style="margin-top:0; color:#00a2ff;">Editar Pedido</h3>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                <label>Cliente <input type="text" id="edit-cli" value="${escapeHtml(p.nome_cliente)}" style="width:100%;"></label>
                <label>Valor (R$) <input type="number" step="0.01" id="edit-val" value="${p.valor_cobrado}" style="width:100%;"></label>
                <label>Data <input type="date" id="edit-data" value="${p.data_entrega}" style="width:100%;"></label>
            </div>
            
            <div style="margin-bottom:12px;">
                <strong>Itens do Pedido:</strong>
                <div id="edit-itens-list">${itensHtml || 'Nenhum item'}</div>
                <div style="display:flex; gap:4px; margin-top:8px;">
                    <input type="text" id="edit-new-item-nome" placeholder="Novo item" style="flex:1;">
                    <input type="number" id="edit-new-item-custo" placeholder="Custo R$" style="width:80px;">
                    <button class="btn btn-ghost" id="edit-add-item-btn" style="background:#222;">+ Add</button>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-ghost" onclick="document.getElementById('modal-overlay').click()">Cancelar</button>
                <button class="btn btn-success" id="edit-save-btn">Salvar</button>
            </div>
        `;

        overlay.style.display = 'block';
        modalEdicao.style.display = 'block';

        // Bind internal buttons
        modalEdicao.querySelectorAll('input:not([type="date"])').forEach(el => {
            el.style.background = '#111'; el.style.border = '1px solid #444'; el.style.color = '#fff'; el.style.padding = '6px';
        });

        modalEdicao.querySelectorAll('.ped-remove-item').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const iid = isNaN(e.target.dataset.iid) ? e.target.dataset.iid : Number(e.target.dataset.iid);
                itens = itens.filter(x => x.id !== iid);
                await idb.putAll('pedidos_itens', itens);
                openEditModal(pedId); // reload modal
            });
        });

        // Auto-save item edits locally before main save
        modalEdicao.querySelectorAll('.edit-item-nome').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const iid = isNaN(e.target.dataset.iid) ? e.target.dataset.iid : Number(e.target.dataset.iid);
                const item = itens.find(x => x.id === iid);
                if (item) {
                    item.nome_avulso = e.target.value.trim();
                    item.peca = e.target.value.trim(); // keep legacy sync
                }
            });
        });

        modalEdicao.querySelectorAll('.edit-item-custo').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const iid = isNaN(e.target.dataset.iid) ? e.target.dataset.iid : Number(e.target.dataset.iid);
                const item = itens.find(x => x.id === iid);
                if (item) item.custo_est = parseFloat(e.target.value) || 0;
            });
        });

        modalEdicao.querySelector('#edit-add-item-btn').addEventListener('click', async () => {
            const n = modalEdicao.querySelector('#edit-new-item-nome').value.trim();
            const c = parseFloat(modalEdicao.querySelector('#edit-new-item-custo').value) || 0;
            if(n) {
                itens.push({
                    id: Date.now(),
                    pedido_id: pedId,
                    tipo: 'avulso',
                    nome_avulso: n,
                    custo_est: c
                });
                await idb.putAll('pedidos_itens', itens);
                openEditModal(pedId);
            }
        });

        modalEdicao.querySelector('#edit-save-btn').addEventListener('click', async () => {
            p.nome_cliente = modalEdicao.querySelector('#edit-cli').value.trim();
            p.valor_cobrado = parseFloat(modalEdicao.querySelector('#edit-val').value) || 0;
            p.data_entrega = modalEdicao.querySelector('#edit-data').value;
            await idb.putAll('pedidos_v2', pedidos);
            await idb.putAll('pedidos_itens', itens); // Save modified items
            overlay.click(); // close
            renderKanban();
        });
    }

    async function renderKanban() {
        pedidos = await idb.getAll('pedidos_v2');
        itens   = await idb.getAll('pedidos_itens');

        STATUS_COLUMNS.forEach(col => {
            const colEl = container.querySelector(`#col-${col.id.replace(/[\/\s]/g, '_')}`);
            if (colEl) colEl.innerHTML = '';
        });

        const counts = {
            'A MODELAR': 0,
            'A IMPRIMIR': 0,
            'IMPRESSO/PINTANDO': 0,
            'ENVIANDO/CONCLUIDO': 0
        };

        pedidos.forEach(p => {
            const st = normalizeStatus(p.status);
            counts[st] = (counts[st] || 0) + 1;

            const colEl = container.querySelector(`#col-${st.replace(/[\/\s]/g, '_')}`);
            if (!colEl) return;

            const pecasDoPedido = itens.filter(i => i.pedido_id === p.id);

            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.style = 'background:#212121; border:1px solid #333; border-radius:8px; padding:12px; box-shadow:0 4px 12px rgba(0,0,0,0.3);';

            const pecasHTML = pecasDoPedido.length > 0
                ? pecasDoPedido.map(i => `<div style="font-size:0.8rem; color:#bbb; margin-top:2px;">• ${escapeHtml(i.nome_avulso || i.nome_custom || i.peca || 'Peça Customizada')}</div>`).join('')
                : '<div style="font-size:0.78rem; color:#666; font-style:italic;">Sem peças cadastradas</div>';

            const idxCol = STATUS_COLUMNS.findIndex(c => c.id === st);
            const prevCol = idxCol > 0 ? STATUS_COLUMNS[idxCol - 1] : null;
            const nextCol = idxCol < STATUS_COLUMNS.length - 1 ? STATUS_COLUMNS[idxCol + 1] : null;

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <h4 style="font-size:0.95rem; font-weight:700; color:#fff; margin:0; cursor:pointer;" class="ped-edit-btn" data-id="${p.id}" title="Editar Pedido">${escapeHtml(p.nome_cliente || 'Cliente Sem Nome')} ✏️</h4>
                    <button class="btn btn-ghost ped-del-btn" data-id="${p.id}" style="color:#d64545; padding:0 4px; font-size:0.9rem;" title="Excluir Pedido">✕</button>
                </div>

                <div style="margin-bottom:8px; border-bottom:1px dashed #2a2a2a; padding-bottom:6px;">
                    ${pecasHTML}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:#888; margin-bottom:10px;">
                    <span>📅 ${p.data_entrega ? formatDate(p.data_entrega) : 'Sem data'}</span>
                    <span style="color:#00a2ff; font-weight:700;">${formatBRL(p.valor_cobrado || 0)}</span>
                </div>

                <div style="display:flex; justify-content:space-between; gap:6px; flex-wrap:wrap;">
                    ${prevCol ? `<button class="btn btn-ghost ped-move-btn" data-id="${p.id}" data-target="${prevCol.id}" style="font-size:0.72rem; padding:3px 8px; flex:1;">◀ ${prevCol.label.split('/')[0]}</button>` : '<div style="flex:1;"></div>'}
                    ${nextCol ? `<button class="btn btn-ghost ped-move-btn" data-id="${p.id}" data-target="${nextCol.id}" style="font-size:0.72rem; padding:3px 8px; flex:1; background:rgba(0,162,255,0.1); color:#00a2ff; border-color:rgba(0,162,255,0.3);">${nextCol.label.split('/')[0]} ▶</button>` 
                              : `<button class="btn btn-success ped-move-btn" data-id="${p.id}" data-target="FINALIZADO" style="font-size:0.72rem; padding:3px 8px; flex:1; background:#10b981; color:#fff; border:none; font-weight:bold;">✔ Finalizar</button>`}
                </div>
            `;

            colEl.appendChild(card);
        });

        STATUS_COLUMNS.forEach(col => {
            const cntEl = container.querySelector(`#count-${col.id.replace(/[\/\s]/g, '_')}`);
            if (cntEl) cntEl.textContent = counts[col.id] || 0;
        });

        container.querySelectorAll('.ped-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pedVal = e.target.closest('.ped-edit-btn').dataset.id;
                const pedId = isNaN(pedVal) ? pedVal : Number(pedVal);
                openEditModal(pedId);
            });
        });

        container.querySelectorAll('.ped-move-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetBtn = e.target.closest('.ped-move-btn');
                if (!targetBtn) return;
                const pedVal = targetBtn.dataset.id;
                const pedId = isNaN(pedVal) ? pedVal : Number(pedVal);
                const newStatus = targetBtn.dataset.target;

                const p = pedidos.find(item => item.id === pedId);
                if (p) {
                    p.status = newStatus;
                    await idb.putAll('pedidos_v2', pedidos);
                    await renderKanban();
                }
            });
        });

        container.querySelectorAll('.ped-del-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetBtn = e.target.closest('.ped-del-btn');
                if (!targetBtn) return;
                const pedVal = targetBtn.dataset.id;
                const pedId = isNaN(pedVal) ? pedVal : Number(pedVal);

                if (confirm('Tem certeza que deseja excluir este pedido?')) {
                    pedidos = pedidos.filter(p => p.id !== pedId);
                    itens = itens.filter(i => i.pedido_id !== pedId);
                    await idb.putAll('pedidos_v2', pedidos);
                    await idb.putAll('pedidos_itens', itens);
                    await renderKanban();
                }
            });
        });
    }

    await renderKanban();
}
