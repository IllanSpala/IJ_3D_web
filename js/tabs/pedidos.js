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
        const pecasList = itens
            .filter(i => i.pedido_id === p.id)
            .map(i => acervoMap[i.acervo_id] || `#${i.acervo_id}`)
            .filter(name => name !== '#null');
            
        p._pecas = pecasList.join(', ');
        p.status = p.status || 'Aguardando';
    }

    container.innerHTML = `
        <div class="card" style="background: transparent; border: none; box-shadow: none; padding: 0;">
            <div class="card-header" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 16px;">📝 Todos os Pedidos</div>
            <div class="kanban-board">
                <div class="kanban-column">
                    <div class="kanban-column-title" style="border-bottom-color: #a83232;">A Fazer</div>
                    <div id="col-afazer"></div>
                </div>
                <div class="kanban-column">
                    <div class="kanban-column-title" style="border-bottom-color: #d97706;">Imprimindo</div>
                    <div id="col-imprimindo"></div>
                </div>
                <div class="kanban-column">
                    <div class="kanban-column-title" style="border-bottom-color: #2b7a4b;">Encaminhado</div>
                    <div id="col-encaminhado"></div>
                </div>
            </div>
        </div>
    `;

    const colAFazer = container.querySelector('#col-afazer');
    const colImprimindo = container.querySelector('#col-imprimindo');
    const colEncaminhado = container.querySelector('#col-encaminhado');

    if (pedidos.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><span class="empty-state-icon">📝</span>Nenhum pedido no backup.</div>`;
        return;
    }

    for (const p of pedidos) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        card.style.marginBottom = '12px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:8px; align-items:center;">
                <h3 style="margin:0; font-size:1.1rem;">${escapeHtml(p.nome_cliente || 'Sem nome')}</h3>
                <span class="badge" style="background:${getBadgeColor(p.status)}; border: 1px solid #444; color:#fff;">${escapeHtml(p.status)}</span>
            </div>
            <div class="meta" style="width:100%;">
                ${p._pecas ? `<span>📦 ${escapeHtml(p._pecas)}</span>` : ''}
                ${p.data_entrega ? `<span>📅 Entrega: ${formatDate(p.data_entrega)}</span>` : ''}
                ${p.valor_cobrado ? `<span>💰 Total: ${formatBRL(p.valor_cobrado)}</span>` : ''}
                ${p.plataforma_venda ? `<span>🏪 Via: ${escapeHtml(p.plataforma_venda)}</span>` : ''}
            </div>
        `;
        
        const s = (p.status || '').toLowerCase();
        if (['imprimindo', 'impresso em produção', 'em produção'].includes(s)) {
            colImprimindo.appendChild(card);
        } else if (['finalizado', 'entregue', 'concluído', 'concluido', 'encaminhado'].includes(s)) {
            colEncaminhado.appendChild(card);
        } else {
            colAFazer.appendChild(card);
        }
    }
}
