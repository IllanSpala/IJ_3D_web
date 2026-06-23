/* ═══════════════════════════════════════════════════════════════
   Tab: Pedidos (Lista Integral - Read Only)
   ═══════════════════════════════════════════════════════════════ */
import * as idb from '../db.js';
import { formatBRL, formatDate, escapeHtml } from '../utils.js';

export async function render(container) {
    function getBadgeColor(status) {
        const s = (status || '').toLowerCase();
        if (['aguardando', 'não impresso', 'a fazer'].includes(s)) return '#a83232'; // Vermelho
        if (['imprimindo', 'impresso em produção', 'em produção'].includes(s)) return '#d97706'; // Amarelo
        if (['finalizado', 'entregue', 'concluído', 'concluido', 'encaminhado'].includes(s)) return '#2b7a4b'; // Verde
        return '#2a2a2a';
    }

    const pedidos  = await idb.getAll('pedidos_v2');
    const itens    = await idb.getAll('pedidos_itens');
    const acervo   = await idb.getAll('acervo');

    // Build lookup: acervo_id → nome_peca
    const acervoMap = {};
    for (const a of acervo) acervoMap[a.id] = a.nome_peca;

    // Attach items to pedidos and normalize status
    for (const p of pedidos) {
        p._pecas = itens
            .filter(i => i.pedido_id === p.id)
            .map(i => acervoMap[i.acervo_id] || `#${i.acervo_id}`)
            .join(', ');
        p.status = p.status || 'Aguardando';
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header">📝 Todos os Pedidos</div>
            <div class="items-grid" id="pedidos-grid"></div>
        </div>
    `;

    const grid = container.querySelector('#pedidos-grid');

    if (pedidos.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><span class="empty-state-icon">📝</span>Nenhum pedido no backup.</div>`;
        return;
    }

    // Renderiza a lista integral sem nenhum filtro obstrutivo
    for (const p of pedidos) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:8px; align-items:center;">
                <h3 style="margin:0; font-size:1.1rem;">${escapeHtml(p.nome_cliente || 'Sem nome')}</h3>
                <span class="badge" style="background:${getBadgeColor(p.status)}; border: 1px solid #444; color:#fff;">${escapeHtml(p.status)}</span>
            </div>
            <div class="meta" style="width:100%;">
                ${p._pecas ? `<span>📦 ${escapeHtml(p._pecas)}</span>` : '<span>📦 <i>Sem itens</i></span>'}
                ${p.data_entrega ? `<span>📅 Entrega: ${formatDate(p.data_entrega)}</span>` : ''}
                ${p.valor_cobrado ? `<span>💰 Total: ${formatBRL(p.valor_cobrado)}</span>` : ''}
                ${p.plataforma_venda ? `<span>🏪 Via: ${escapeHtml(p.plataforma_venda)}</span>` : ''}
            </div>
        `;
        grid.appendChild(card);
    }
}
