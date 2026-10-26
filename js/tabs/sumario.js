/* Tab: Sumário Financeiro */
import * as idb from '../db.js';
import { formatBRL, formatDate, escapeHtml, cashDate, validCashDate } from '../utils.js';

function financialDate(record, preferredFields = []) {
    const fields = [...preferredFields, 'criado_em', 'created_at', 'added_at'];
    for (const field of fields) {
        if (record?.[field]) return record[field];
    }
    const numericId = Number(record?.id);
    if (Number.isFinite(numericId) && numericId >= Date.UTC(2000, 0, 1)) {
        return new Date(numericId).toISOString();
    }
    return null;
}

export async function render(container) {
    let pedidos = await idb.getAll('pedidos_v2');
    let almox   = await idb.getAll('ferramentas_insumos');
    let fils    = await idb.getAll('filamentos');
    let vendas  = await idb.getAll('vendas_manuais');

    let allEntries = [];

    // Receitas from pedidos finalizados (Kanban)
    for (const p of pedidos) {
        if ((p.status || '').toUpperCase() === 'FINALIZADO' && p.valor_cobrado) {
            allEntries.push({ date: p.data_recebimento || p.data_finalizacao || p.finalizado_em || null, desc: `Pedido Kanban: ${p.nome_cliente||'—'}`, value: parseFloat(p.valor_cobrado), type: 'receita', category: 'pedidos', record: p, store: 'pedidos_v2' });
        }
    }
    
    // Receitas from Vendas Manuais
    for (const v of vendas) {
        if (v.preco) {
            allEntries.push({ date: financialDate(v, ['data_recebimento', 'data']), desc: `Venda Manual (${v.cliente}): ${v.descricao_item||'—'}`, value: parseFloat(v.preco), type: 'receita', category: 'vendas_manuais', record: v, store: 'vendas_manuais' });
        }
    }

    // Despesas from filamentos
    for (const f of fils) {
        if (f.preco_rolo) {
            const qtd = parseInt(f.quantidade_rolos) || 1;
            allEntries.push({ date: financialDate(f, ['data_pagamento', 'data_compra', 'data_registro']), desc: `Filamento: ${f.marca} ${f.material} (${f.cor}) x${qtd}`, value: -(f.preco_rolo * qtd), type: 'despesa', category: 'filamentos', record: f, store: 'filamentos' });
        }
    }
    
    // Despesas from almoxarifado
    // NOTA: `ultimo_valor` já representa o custo TOTAL da compra (não unitário).
    // A quantidade `qtd` fica apenas na string descritiva — não é usada em cálculos.
    for (const a of almox) {
        if (a.ultimo_valor) {
            const qtdRaw = parseInt(a.quantidade);
            const qtdLabel = isNaN(qtdRaw) ? '' : ` x${qtdRaw}`;
            allEntries.push({ date: financialDate(a, ['data_pagamento', 'data_compra', 'data', 'data_registro']), desc: `Insumo/Ferramenta: ${a.nome}${qtdLabel}`, value: -a.ultimo_valor, type: 'despesa', category: 'insumos', record: a, store: 'ferramentas_insumos' });
        }
    }

    allEntries = allEntries.filter(e => Number.isFinite(e.value) && e.value !== 0);
    allEntries.forEach(e => { e.date = e.date ? cashDate(e.date) : ''; });

    container.innerHTML = `
        <div style="max-width:1200px; margin:0 auto;">
            <div class="dre-header">
                <h2 style="font-size:1.4rem; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px; margin:0;">
                    📊 DRE / Movimentação de caixa
                </h2>
                <div class="dre-header-actions">
                    <select id="dre-filter" style="background:#111; border:1px solid #444; color:#fff; padding:8px 12px; border-radius:6px;">
                        <option value="all">Todas as Categorias</option>
                        <option value="insumos">Apenas Insumos / Ferramentas</option>
                        <option value="filamentos">Apenas Filamentos</option>
                        <option value="pedidos">Apenas Pedidos (Kanban)</option>
                        <option value="vendas_manuais">Apenas Vendas Manuais</option>
                    </select>
                    <select id="dre-date-order" aria-label="Ordenar lançamentos por data" style="background:#111; border:1px solid #444; color:#fff; padding:8px 12px; border-radius:6px;">
                        <option value="desc">Mais recentes primeiro</option>
                        <option value="asc">Mais antigos primeiro</option>
                    </select>
                    <button class="btn btn-primary" id="btn-nova-venda" style="font-weight:700;">+ Venda Manual</button>
                </div>
            </div>
            
            <div class="dre-period-toolbar">
                <label class="dre-date-field" for="dre-start"><span>De</span><input type="date" id="dre-start"></label>
                <label class="dre-date-field" for="dre-end"><span>Até</span><input type="date" id="dre-end"></label>
                <div class="dre-period-actions">
                <button class="btn btn-ghost" id="dre-month">Este mês</button>
                <button class="btn btn-ghost" id="dre-all">Todo o histórico</button>
                </div>
            </div>
            <!-- Modal Venda Manual -->
            <div id="form-venda-manual" style="display:none; background:rgba(30, 30, 30, 0.6); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px; margin-bottom:24px; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:20px; color:#00a2ff; display:flex; align-items:center; gap:8px;">
                    🛍️ Cadastrar Venda Manual (Lote / Balcão)
                </h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Nome do Cliente *</label>
                        <input id="vm-cliente" type="text" placeholder="Ex: Loja Brinquedos S.A." style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Descrição do Item *</label>
                        <input id="vm-desc" type="text" placeholder="Ex: 50x Itens Sensoriais Lote A" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Preço (R$) *</label>
                        <input id="vm-preco" type="number" step="0.01" placeholder="0.00" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#aaa; margin-bottom:4px;">Data do recebimento</label>
                        <input id="vm-data" type="date" style="width:100%; background:#111; border:1px solid #444; color:#eee; padding:8px 12px; border-radius:6px; font-size:0.85rem;">
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn btn-ghost" id="vm-cancelar">Cancelar</button>
                    <button class="btn btn-success" id="vm-salvar">Registrar recebimento</button>
                </div>
            </div>

            <div id="dre-totals-container" style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;"></div>
            
            <div style="background:#1e1e1e; border-radius:12px; border:1px solid #333; overflow-x:auto;">
                <table class="data-table" style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <thead style="background:#111; border-bottom:1px solid #333;">
                        <tr><th style="padding:12px; text-align:left; color:#aaa;">Data do caixa</th><th style="padding:12px; text-align:left; color:#aaa;">Descrição do Lançamento</th><th style="padding:12px; text-align:right; color:#aaa;">Valor (R$)</th></tr>
                    </thead>
                    <tbody id="dre-tbody"></tbody>
                </table>
            </div>
        </div>
    `;

    const filterEl = container.querySelector('#dre-filter');
    const dateOrderEl = container.querySelector('#dre-date-order');
    const totalsContainer = container.querySelector('#dre-totals-container');
    const tbody = container.querySelector('#dre-tbody');

    function updateView() {
        const cat = filterEl.value;
        const start = container.querySelector('#dre-start').value;
        const end = container.querySelector('#dre-end').value;
        const categoryEntries = allEntries.filter(e => cat === 'all' || e.category === cat);
        // Undated legacy entries belong to the full history, not an arbitrary period.
        const pending = categoryEntries.filter(e => !e.date && !start && !end).sort((a, b) => a.desc.localeCompare(b.desc, 'pt-BR', { sensitivity: 'base' }));
        const filtered = categoryEntries.filter(e => e.date && (!start || e.date >= start) && (!end || e.date <= end));
        const direction = dateOrderEl.value === 'asc' ? 1 : -1;
        filtered.sort((a, b) => a.date.localeCompare(b.date) * direction);

        const visibleEntries = [...filtered, ...pending];
        const totalRec = visibleEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.value, 0);
        const totalDesp = visibleEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + Math.abs(e.value), 0);
        const saldo = totalRec - totalDesp;
        const saldoColor = saldo >= 0 ? '#4ade80' : '#f87171';

        totalsContainer.innerHTML = `
            <div style="flex:1;min-width:150px;background:rgba(74, 222, 128, 0.05);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(74, 222, 128, 0.2);border-radius:16px;padding:24px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <div style="color:#4ade80;font-size:0.85rem;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">🟢 Entradas no período</div>
                <div style="font-size:1.8rem;font-weight:800;color:#4ade80;text-shadow:0 0 10px rgba(74,222,128,0.3);">${formatBRL(totalRec)}</div>
            </div>
            <div style="flex:1;min-width:150px;background:rgba(248, 113, 113, 0.05);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(248, 113, 113, 0.2);border-radius:16px;padding:24px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <div style="color:#f87171;font-size:0.85rem;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">🔴 Saídas no período</div>
                <div style="font-size:1.8rem;font-weight:800;color:#f87171;text-shadow:0 0 10px rgba(248,113,113,0.3);">${formatBRL(totalDesp)}</div>
            </div>
            <div style="flex:1;min-width:150px;background:rgba(255, 255, 255, 0.03);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255, 255, 255, 0.1);border-radius:16px;padding:24px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <div style="color:${saldoColor};font-size:0.85rem;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">⚖️ Resultado do período</div>
                <div style="font-size:1.8rem;font-weight:800;color:${saldoColor};text-shadow:0 0 10px ${saldoColor}40;">${formatBRL(saldo)}</div>
            </div>
        `;

        const rows = visibleEntries.map(e => {
            const color = e.type === 'receita' ? '#4ade80' : '#f87171';
            const sign = e.type === 'receita' ? '+' : '-';
            return `<tr><td style="color:#aaa; border-bottom:1px solid #222; padding:12px;">${formatDate(e.date)}</td><td style="border-bottom:1px solid #222; padding:12px;">${escapeHtml(e.desc)}</td><td style="color:${color};font-weight:700; border-bottom:1px solid #222; padding:12px; text-align:right;">${sign} ${formatBRL(Math.abs(e.value))}</td></tr>`;
        }).join('');

        tbody.innerHTML = rows || '<tr><td colspan="3" style="text-align:center; padding:24px; color:#666;">Nenhum lançamento financeiro registrado.</td></tr>';
    }

    filterEl.addEventListener('change', updateView);
    dateOrderEl.addEventListener('change', updateView);
    for (const selector of ['#dre-start', '#dre-end']) container.querySelector(selector).addEventListener('change', updateView);
    container.querySelector('#dre-month').addEventListener('click', () => {
        container.querySelector('#dre-start').value = cashDate().slice(0, 7) + '-01';
        container.querySelector('#dre-end').value = cashDate();
        updateView();
    });
    container.querySelector('#dre-all').addEventListener('click', () => {
        container.querySelector('#dre-start').value = '';
        container.querySelector('#dre-end').value = '';
        updateView();
    });
    updateView(); // Initial render

    const formNovo = container.querySelector('#form-venda-manual');
    const btnToggle = container.querySelector('#btn-nova-venda');
    const btnCancelar = container.querySelector('#vm-cancelar');
    const btnSalvar = container.querySelector('#vm-salvar');

    // Set today's date by default
    container.querySelector('#vm-data').value = cashDate();

    btnToggle.addEventListener('click', () => {
        const isOpen = formNovo.style.display === 'block';
        formNovo.style.display = isOpen ? 'none' : 'block';
        btnToggle.textContent = isOpen ? '+ Venda Manual' : '✕ Cancelar';
    });

    btnCancelar.addEventListener('click', () => {
        formNovo.style.display = 'none';
        btnToggle.textContent = '+ Venda Manual';
        container.querySelector('#vm-cliente').value = '';
        container.querySelector('#vm-desc').value = '';
        container.querySelector('#vm-preco').value = '';
    });

    btnSalvar.addEventListener('click', async () => {
        const cliente = container.querySelector('#vm-cliente').value.trim();
        const desc = container.querySelector('#vm-desc').value.trim();
        const preco = parseFloat(container.querySelector('#vm-preco').value);
        const data = container.querySelector('#vm-data').value || cashDate();

        if (!cliente || !desc || !Number.isFinite(preco) || preco <= 0 || !validCashDate(data)) {
            alert('Preencha os campos obrigatórios corretamente.');
            return;
        }

        const newVenda = {
            id: Date.now(),
            cliente,
            descricao_item: desc,
            preco,
            data_recebimento: data,
            data
        };

        vendas.push(newVenda);
        await idb.putAll('vendas_manuais', vendas);
        render(container); // reload tab
    });
}
