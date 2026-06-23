/* Tab: Kits */
import * as idb from '../db.js';
import { escapeHtml, placeholderImg } from '../utils.js';

export async function render(container) {
    const kits = await idb.getAll('kits_acervo');
    const kitItens = await idb.getAll('kit_itens');
    const acervo = await idb.getAll('acervo');
    const acervoMap = {}; for (const a of acervo) acervoMap[a.id] = a.nome_peca;

    container.innerHTML = `<div class="card"><div class="card-header">🎺 Kits</div>
        <div class="items-grid" id="kits-grid"></div></div>`;
    const grid = container.querySelector('#kits-grid');

    if (!kits.length) { grid.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🎺</span>Nenhum kit cadastrado.</div>`; return; }

    for (const k of kits) {
        const imgUrl = await idb.resolveMediaUrl(k.caminho_foto);
        const pecas = kitItens.filter(i => i.kit_id === k.id).map(i => `${acervoMap[i.acervo_id]||'#'+i.acervo_id} ×${i.quantidade||1}`).join(', ') || '—';
        const card = document.createElement('div'); card.className = 'item-card';
        card.innerHTML = `<img class="item-card-img" src="${imgUrl||placeholderImg()}" alt="${escapeHtml(k.nome_kit)}">
            <div class="item-card-info"><h3>${escapeHtml(k.nome_kit)}</h3><div class="meta">
            <span>📦 ${escapeHtml(pecas)}</span>${k.descricao?`<span>${escapeHtml(k.descricao).substring(0,80)}</span>`:''}</div></div>`;
        grid.appendChild(card);
    }
}
