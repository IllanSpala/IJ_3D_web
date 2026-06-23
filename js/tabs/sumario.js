/* Tab: Sumário Financeiro */
import * as idb from '../db.js';
import { formatBRL, formatDate, escapeHtml } from '../utils.js';

export async function render(container) {
    const pedidos = await idb.getAll('pedidos_v2');
    const hist    = await idb.getAll('hist_impressoes');
    const almox   = await idb.getAll('ferramentas_insumos');
    const fils    = await idb.getAll('filamentos');

    // Build entries
    const entries = [];

    // Receitas from pedidos finalizados
    for (const p of pedidos) {
        if ((p.status || '') === 'Finalizado' && p.valor_cobrado) {
            entries.push({ date: p.data_entrega, desc: `Pedido: ${p.nome_cliente||'—'}`, value: p.valor_cobrado, type: 'receita' });
        }
    }
    // Receitas from hist with preco_venda
    for (const h of hist) {
        if (h.preco_venda) {
            entries.push({ date: h.data_impressao, desc: `Venda: ${h.nome_peca||'—'}`, value: h.preco_venda, type: 'receita' });
        }
    }
    // Despesas from filamentos
    for (const f of fils) {
        if (f.preco_rolo) {
            entries.push({ date: f.data_registro || null, desc: `Filamento: ${f.marca} ${f.material} (${f.cor})`, value: -f.preco_rolo, type: 'despesa' });
        }
    }
    // Despesas from almoxarifado
    for (const a of almox) {
        if (a.ultimo_valor) {
            entries.push({ date: null, desc: `Insumo: ${a.nome}`, value: -a.ultimo_valor, type: 'despesa' });
        }
    }

    entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const totalRec = entries.filter(e => e.type === 'receita').reduce((s, e) => s + e.value, 0);
    const totalDesp = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + Math.abs(e.value), 0);
    const saldo = totalRec - totalDesp;
    const saldoColor = saldo >= 0 ? '#2b7a4b' : '#d64545';

    const rows = entries.map(e => {
        const color = e.type === 'receita' ? '#4ade80' : '#f87171';
        const sign = e.type === 'receita' ? '+' : '-';
        return `<tr><td>${formatDate(e.date)}</td><td>${escapeHtml(e.desc)}</td><td style="color:${color};font-weight:600;">${sign} ${formatBRL(Math.abs(e.value))}</td></tr>`;
    }).join('');

    container.innerHTML = `<div class="card"><div class="card-header">📊 Sumário Financeiro</div>
        <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
            <div style="flex:1;min-width:150px;background:#1a2e1a;border-radius:8px;padding:16px;text-align:center;"><div style="color:#4ade80;font-size:0.8rem;">RECEITAS</div><div style="font-size:1.3rem;font-weight:700;color:#4ade80;">${formatBRL(totalRec)}</div></div>
            <div style="flex:1;min-width:150px;background:#2e1a1a;border-radius:8px;padding:16px;text-align:center;"><div style="color:#f87171;font-size:0.8rem;">DESPESAS</div><div style="font-size:1.3rem;font-weight:700;color:#f87171;">${formatBRL(totalDesp)}</div></div>
            <div style="flex:1;min-width:150px;background:#1a1a2e;border-radius:8px;padding:16px;text-align:center;"><div style="color:${saldoColor};font-size:0.8rem;">SALDO</div><div style="font-size:1.3rem;font-weight:700;color:${saldoColor};">${formatBRL(saldo)}</div></div>
        </div>
        <div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="empty-state">Nenhum lançamento.</td></tr>'}</tbody></table></div></div>`;
}
