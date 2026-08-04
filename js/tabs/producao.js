/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — producao.js  (Sprint Dashboard)
   Arquitetura: funções globais em window._sp para máxima robustez
   ═══════════════════════════════════════════════════════════════ */

import * as idb from '../db.js';
import { formatDate, escapeHtml } from '../utils.js';

const S = [
    { id: 'A_MODELAR',         label: 'A Modelar',         color: '#ef4444' },
    { id: 'A_IMPRIMIR',        label: 'A Imprimir',        color: '#f97316' },
    { id: 'IMPRIMINDO',        label: 'Imprimindo',        color: '#eab308' },
    { id: 'IMPRESSO_PINTANDO', label: 'Impresso/Pintando', color: '#8b5cf6' },
    { id: 'FINALIZANDO',       label: 'Finalizando',       color: '#3b82f6' },
    { id: 'CONCLUIDO',         label: 'Concluído ✓',       color: '#10b981' },
];

const sColor = id => (S.find(x => x.id === id) || S[0]).color;
const esc    = v  => escapeHtml(v == null ? '' : String(v));

function selHtml(onchg, cur) {
    return `<select onchange="${onchg}" style="background:#111;border:1px solid #444;color:#eee;padding:4px 6px;border-radius:4px;font-size:.78rem;width:100%;">
        ${S.map(s => `<option value="${s.id}"${s.id===cur?' selected':''}>${s.label}</option>`).join('')}
    </select>`;
}

/* ════════════════════════════════════════════════════════════════ */

export async function render(container) {

    /* ── Scaffold ──────────────────────────────────────────────── */
    container.innerHTML = `
    <div style="width:100%; height:100%; padding:20px; display:flex; flex-direction:column; font-family:inherit;">
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:18px 20px;margin-bottom:24px;box-shadow:0 8px 32px rgba(0,0,0,.45); flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
                <div>
                    <h2 style="font-size:1.35rem;font-weight:800;color:#fff;margin:0;">🏁 Sprint Atual</h2>
                    <p style="color:#888;font-size:.82rem;margin:4px 0 0;">Cada produto tem seu status e pode receber partes nomeadas por você.</p>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <select id="sp-sel" style="background:#111;border:1px solid #444;color:#eee;padding:9px 14px;border-radius:8px;font-size:.9rem;min-width:250px;">
                        <option value="">— Selecione um pedido —</option>
                    </select>
                    <button onclick="window._sp.addPedido()" style="background:#3b82f6;border:none;color:#fff;padding:9px 18px;border-radius:8px;font-weight:600;cursor:pointer;">+ Adicionar à Sprint</button>
                    <button onclick="window._sp.finalizarSprint()" style="background:#10b981;border:none;color:#fff;padding:9px 18px;border-radius:8px;font-weight:600;cursor:pointer;">🏁 Finalizar Sprint</button>
                    <button onclick="window._sp.abrirHistorico()" style="background:#374151;border:none;color:#fff;padding:9px 14px;border-radius:8px;font-weight:600;cursor:pointer;">🕒 Histórico</button>
                </div>
            </div>
        </div>
        <div style="display:flex; align-items:center; gap: 10px; position: relative;">
            <button onclick="document.getElementById('sp-grid').scrollBy({left: -380, behavior: 'smooth'})" style="background:#222;border:1px solid #444;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-size:1.2rem;transition:all 0.2s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#222'">◀</button>
            <div id="sp-grid" style="display:flex;flex-wrap:nowrap;overflow-x:hidden;gap:20px;padding:12px 0;flex:1;scroll-behavior:smooth;"></div>
            <button onclick="document.getElementById('sp-grid').scrollBy({left: 380, behavior: 'smooth'})" style="background:#222;border:1px solid #444;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-size:1.2rem;transition:all 0.2s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#222'">▶</button>
        </div>
    </div>

    <div id="sp-mhist" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;justify-content:center;align-items:center;padding:20px;" onclick="if(event.target===this)this.style.display='none'">
        <div style="background:#1a1a1a;width:100%;max-width:820px;max-height:88vh;border-radius:12px;border:1px solid #333;display:flex;flex-direction:column;">
            <div style="padding:14px 20px;border-bottom:1px solid #2e2e2e;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="color:#fff;margin:0;">🕒 Histórico de Sprints</h3>
                <button onclick="document.getElementById('sp-mhist').style.display='none'" style="background:none;border:none;color:#aaa;font-size:1.6rem;cursor:pointer;">&times;</button>
            </div>
            <div id="sp-hbody" style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;"></div>
        </div>
    </div>`;

    /* ── Módulo global (sobrevive a qualquer re-render) ────────── */
    window._sp = {

        async _render() {
            const pedidos = await idb.getAll('pedidos_v2');
            const sprint  = await idb.getAll('producao_pedidos');
            const partes  = await idb.getAll('producao_partes');

            // Normaliza itens: garante que todo item tenha um campo id estável
            let rawItens = await idb.getAll('pedidos_itens');
            let needsSave = false;
            const itens = rawItens.map((it, i) => {
                if (it.id == null || it.id === '') {
                    needsSave = true;
                    return { ...it, id: `itm_${it.pedido_id || 'x'}_${i}` };
                }
                return it;
            });
            if (needsSave) {
                await idb.putAll('pedidos_itens', itens);
            }

            const sel  = document.getElementById('sp-sel');
            const grid = document.getElementById('sp-grid');
            if (!sel || !grid) return;

            /* popular select */
            const spIds = new Set(sprint.map(s => String(s.pedido_id)));
            sel.innerHTML = '<option value="">— Selecione um pedido —</option>';
            pedidos
                .filter(p => !['ENTREGUE','CANCELADO'].includes((p.status||'').toUpperCase().trim()))
                .filter(p => !spIds.has(String(p.id)))
                .forEach(p => {
                    sel.innerHTML += `<option value="${p.id}">#${p.id} – ${esc(p.nome_cliente||'Sem nome')}</option>`;
                });

            if (!sprint.length) {
                grid.innerHTML = `<div style="grid-column:1/-1;background:#111;border:2px dashed #333;padding:48px;text-align:center;border-radius:12px;color:#666;">
                    <div style="font-size:2.5rem;margin-bottom:12px;">📭</div>
                    <h3 style="margin:0 0 8px;color:#888;">Sprint Vazia</h3>
                    <p style="font-size:.9rem;margin:0;">Selecione um pedido acima e clique em "+ Adicionar à Sprint".</p>
                </div>`;
                return;
            }

            grid.innerHTML = '';

            for (const sp of sprint) {
                const p = pedidos.find(x => String(x.id) === String(sp.pedido_id))
                       || { id: sp.pedido_id, nome_cliente: 'Pedido #'+sp.pedido_id, data_entrega: '' };
                const produtos  = itens.filter(i => String(i.pedido_id) === String(p.id));
                const pedPartes = partes.filter(pt => String(pt.pedido_id) === String(p.id));

                let totalConc = 0, totalAll = 0, produtosHTML = '';

                if (!produtos.length) {
                    produtosHTML = `<div style="color:#555;font-size:.82rem;font-style:italic;padding:4px 0 8px;">Nenhum produto neste pedido.</div>`;
                } else {
                    produtos.forEach((item, prodIndex) => {
                        const pieceNum = prodIndex + 1;
                        const nomeProd = esc(item.nome_avulso || item.nome_custom || item.peca_nome || item.nome_peca || 'Produto');
                        const prodEntry  = pedPartes.find(pt => String(pt.item_id) === String(item.id) && pt.is_produto);
                        const rawProdStatus = prodEntry ? prodEntry.status : 'A_MODELAR';
                        const prodStatus = String(rawProdStatus || '').toUpperCase().replace('_', ' ').trim();
                        const prodObs    = prodEntry ? (prodEntry.obs || '') : '';
                        const prodColor  = sColor(prodStatus);
                        const subPartes  = pedPartes.filter(pt => String(pt.item_id) === String(item.id) && !pt.is_produto);
                        const concCount  = (prodStatus === 'CONCLUIDO' ? 1 : 0) + subPartes.filter(pt => String(pt.status || '').toUpperCase().replace('_', ' ').trim() === 'CONCLUIDO').length;
                        const totCount   = 1 + subPartes.length;
                        totalConc += concCount;
                        totalAll  += totCount;
                        const itemPct   = Math.round((concCount / totCount) * 100);
                        const brdColor  = itemPct === 100 ? '#10b981' : '#2e2e2e';

                        let partesHTML = '';
                        subPartes.forEach((pt, ptIndex) => {
                            const partNum = ptIndex + 1;
                            const ptNormStatus = String(pt.status || 'A_MODELAR').toUpperCase().replace('_', ' ').trim();
                            const cor = sColor(ptNormStatus);
                            partesHTML += `
                            <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-left:4px solid ${cor};border-radius:6px;padding:9px 11px;margin-bottom:7px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                    <span style="font-weight:700;color:#ddd;font-size:.85rem;">${pieceNum}.${partNum} ${esc(pt.nome)}</span>
                                    <button onclick="window._sp.removerParte('${pt.id}')" title="Remover parte"
                                        style="background:none;border:1px solid #444;color:#d64545;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:.72rem;">✕</button>
                                </div>
                                ${selHtml(`window._sp.setStatusParte('${pt.id}', this.value)`, pt.status || 'A_MODELAR')}
                                <textarea onchange="window._sp.setObsParte('${pt.id}', this.value)" placeholder="Obs da parte…"
                                    style="width:100%;margin-top:5px;background:#111;border:1px solid #333;color:#bbb;padding:5px 7px;border-radius:4px;font-size:.76rem;resize:vertical;min-height:34px;box-sizing:border-box;font-family:inherit;">${esc(pt.obs||'')}</textarea>
                            </div>`;
                        });

                        produtosHTML += `
                        <div style="background:#1a1a1a;border:1px solid ${brdColor};border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-weight:700;color:#a78bfa;font-size:.9rem;">${pieceNum}. ${nomeProd}</span>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="font-size:.72rem;color:${itemPct===100?'#10b981':'#888'};">${itemPct}%</span>
                                    <button onclick="window._sp.removerProduto('${item.id}')" title="Excluir Produto" style="background:none;border:1px solid #444;color:#d64545;border-radius:4px;cursor:pointer;font-size:.8rem;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">✕</button>
                                </div>
                            </div>
                            <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-left:4px solid ${prodColor};border-radius:6px;padding:9px 11px;margin-bottom:10px;">
                                <div style="font-size:.7rem;color:#777;margin-bottom:4px;font-weight:bold;">STATUS DO PRODUTO</div>
                                ${selHtml(`window._sp.setStatusProduto('${p.id}','${item.id}', this.value)`, prodStatus)}
                                <textarea onchange="window._sp.setObsProduto('${p.id}','${item.id}', this.value)" placeholder="Obs geral do produto…"
                                    style="width:100%;margin-top:5px;background:#111;border:1px solid #333;color:#bbb;padding:5px 7px;border-radius:4px;font-size:.76rem;resize:vertical;min-height:34px;box-sizing:border-box;font-family:inherit;">${esc(prodObs)}</textarea>
                            </div>
                            ${subPartes.length ? `<div style="font-size:.7rem;color:#666;font-weight:bold;margin-bottom:6px;">PARTES ADICIONAIS</div>${partesHTML}` : ''}
                            <div style="border-top:1px dashed #252525;padding-top:8px;margin-top:4px;">
                                <div style="font-size:.7rem;color:#555;margin-bottom:5px;">Adicionar parte:</div>
                                <div style="display:flex;gap:6px;">
                                    <input id="inp_${p.id}_${item.id}" type="text" placeholder="Ex: Perna Dir., Bico…"
                                        style="flex:1;background:#111;border:1px solid #444;color:#eee;padding:6px 9px;border-radius:5px;font-size:.8rem;"
                                        onkeydown="if(event.key==='Enter')window._sp.addParte('${p.id}','${item.id}')">
                                    <button onclick="window._sp.addParte('${p.id}','${item.id}')"
                                        style="background:#262626;border:1px solid #444;color:#eee;padding:6px 10px;border-radius:5px;cursor:pointer;font-size:.8rem;white-space:nowrap;">+ Parte</button>
                                </div>
                            </div>
                            </div>
                        </div>`;
                    });
                }

                const pctPed = totalAll > 0 ? Math.round((totalConc / totalAll) * 100) : 0;
                const card = document.createElement('div');
                card.style.cssText = 'background:#161616;border:1px solid #2e2e2e;border-radius:12px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:14px;min-width:360px;max-width:360px;flex-shrink:0;';
                card.innerHTML = `
                    <div style="border-bottom:1px solid #252525;padding-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            <div>
                                <h3 style="font-size:1.05rem;font-weight:800;color:#a78bfa;margin:0;">👤 ${esc(p.nome_cliente||'Cliente')}</h3>
                                <div style="font-size:.72rem;color:#666;margin-top:3px;">ID: #${p.id}${p.data_entrega ? ` • Entrega: ${formatDate(p.data_entrega)}` : ''}</div>
                            </div>
                            <button onclick="window._sp.removerPedido('${p.id}')"
                                style="background:none;border:1px solid #444;color:#d64545;font-size:.78rem;padding:4px 9px;border-radius:4px;cursor:pointer;white-space:nowrap;">✕ Remover</button>
                        </div>
                        <div style="margin-top:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#777;margin-bottom:4px;">
                                <span>Progresso total</span>
                                <strong style="color:${pctPed===100?'#10b981':'#eee'};">${pctPed}%</strong>
                            </div>
                            <div style="background:#111;height:7px;border-radius:4px;overflow:hidden;">
                                <div style="width:${pctPed}%;height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);border-radius:4px;transition:width .3s;"></div>
                            </div>
                        </div>
                    </div>
                    <div>${produtosHTML}</div>`;
                grid.appendChild(card);
            }
        },

        async addParte(pedId, itemId) {
            const inp = document.getElementById(`inp_${pedId}_${itemId}`);
            const nome = inp ? inp.value.trim() : '';
            if (!nome) { if (inp) inp.focus(); return; }
            try {
                let pts = await idb.getAll('producao_partes');
                pts.push({ id: Date.now() + Math.floor(Math.random()*9999), pedido_id: String(pedId), item_id: String(itemId), is_produto: false, nome, status: 'A_MODELAR', obs: '' });
                await idb.putAll('producao_partes', pts);
                await this._render();
            } catch(e) { alert('Erro ao adicionar parte: ' + e.message); }
        },

        async removerParte(ptId) {
            if (!confirm('Remover esta parte?')) return;
            try {
                let pts = await idb.getAll('producao_partes');
                await idb.putAll('producao_partes', pts.filter(x => String(x.id) !== String(ptId)));
                await this._render();
            } catch(e) { alert('Erro ao remover parte: ' + e.message); }
        },

        async removerProduto(itemId) {
            if (!confirm('ATENÇÃO: Remover esta peça a excluirá definitivamente do pedido original e da sprint. Continuar?')) return;
            try {
                // Remove from pedidos_itens
                let itens = await idb.getAll('pedidos_itens');
                await idb.putAll('pedidos_itens', itens.filter(x => String(x.id) !== String(itemId)));
                
                // Remove from producao_partes
                let pts = await idb.getAll('producao_partes');
                await idb.putAll('producao_partes', pts.filter(x => String(x.item_id) !== String(itemId)));
                
                await this._render();
            } catch(e) { alert('Erro ao remover produto: ' + e.message); }
        },

        async setStatusParte(ptId, val) {
            try {
                let pts = await idb.getAll('producao_partes');
                const pt = pts.find(x => String(x.id) === String(ptId));
                if (pt) { pt.status = val; await idb.putAll('producao_partes', pts); await this._render(); }
            } catch(e) { alert('Erro ao salvar status: ' + e.message); }
        },

        async setObsParte(ptId, val) {
            try {
                let pts = await idb.getAll('producao_partes');
                const pt = pts.find(x => String(x.id) === String(ptId));
                if (pt) { pt.obs = val; await idb.putAll('producao_partes', pts); }
            } catch(e) { console.error(e); }
        },

        async setStatusProduto(pedId, itemId, val) {
            try {
                let pts = await idb.getAll('producao_partes');
                let pt = pts.find(x => String(x.item_id) === String(itemId) && x.is_produto);
                if (!pt) { pt = { id: Date.now(), pedido_id: String(pedId), item_id: String(itemId), is_produto: true, obs: '' }; pts.push(pt); }
                pt.status = val;
                await idb.putAll('producao_partes', pts);
                await this._render();
            } catch(e) { alert('Erro ao salvar status: ' + e.message); }
        },

        async setObsProduto(pedId, itemId, val) {
            try {
                let pts = await idb.getAll('producao_partes');
                let pt = pts.find(x => String(x.item_id) === String(itemId) && x.is_produto);
                if (!pt) { pt = { id: Date.now(), pedido_id: String(pedId), item_id: String(itemId), is_produto: true, status: 'A_MODELAR' }; pts.push(pt); }
                pt.obs = val;
                await idb.putAll('producao_partes', pts);
            } catch(e) { console.error(e); }
        },

        async removerPedido(pedId) {
            if (!confirm('Remover da Sprint?')) return;
            try {
                let sp = await idb.getAll('producao_pedidos');
                await idb.putAll('producao_pedidos', sp.filter(x => String(x.pedido_id) !== String(pedId)));
                await this._render();
            } catch(e) { alert('Erro ao remover pedido: ' + e.message); }
        },

        async addPedido() {
            const sel = document.getElementById('sp-sel');
            const val = sel ? sel.value : '';
            if (!val) { alert('Selecione um pedido.'); return; }
            try {
                let sp = await idb.getAll('producao_pedidos');
                if (sp.some(x => String(x.pedido_id) === String(val))) { alert('Pedido já na Sprint!'); return; }
                sp.push({ id: Date.now(), pedido_id: String(val), added_at: new Date().toISOString() });
                await idb.putAll('producao_pedidos', sp);
                await this._render();
            } catch(e) { alert('Erro ao adicionar pedido: ' + e.message); }
        },

        async finalizarSprint() {
            const sp = await idb.getAll('producao_pedidos');
            if (!sp.length) { alert('Sprint vazia!'); return; }
            if (!confirm('🏁 Finalizar Sprint?\n\nSalva histórico e limpa o board.')) return;
            try {
                let pedidos = await idb.getAll('pedidos_v2');
                const partes = await idb.getAll('producao_partes');
                const itens  = await idb.getAll('pedidos_itens');
                let mudou = false, oldest = Date.now();
                const hist = { id: Date.now(), data_finalizacao: new Date().toISOString(), pedidos_concluidos: [], pedidos_incompletos: [] };
                for (const entry of sp) {
                    const t = new Date(entry.added_at).getTime();
                    if (t < oldest) oldest = t;
                    const p = pedidos.find(x => String(x.id) === String(entry.pedido_id));
                    if (!p) continue;
                    const pedItens  = itens.filter(i => String(i.pedido_id) === String(p.id));
                    const pedPartes = partes.filter(pt => String(pt.pedido_id) === String(p.id));
                    let totC = 0, totI = 0;
                    for (const item of pedItens) {
                        const prodObj = pedPartes.find(pt => String(pt.item_id) === String(item.id) && pt.is_produto) || { status: 'A_MODELAR' };
                        const sub = pedPartes.filter(pt => String(pt.item_id) === String(item.id) && !pt.is_produto);
                        totC += (prodObj.status === 'CONCLUIDO' ? 1 : 0) + sub.filter(pt => pt.status === 'CONCLUIDO').length;
                        totI += 1 + sub.length;
                    }
                    const pct = totI > 0 ? Math.round((totC / totI) * 100) : 0;
                    if (pct === 100) {
                        hist.pedidos_concluidos.push(`#${p.id} – ${p.nome_cliente}`);
                        p.status = 'IMPRESSO/PINTANDO'; mudou = true;
                    } else {
                        hist.pedidos_incompletos.push(`#${p.id} – ${p.nome_cliente} (${pct}%)`);
                    }
                }
                hist.dias_duracao = Math.ceil(Math.abs(Date.now() - oldest) / 86400000);
                if (mudou) await idb.putAll('pedidos_v2', pedidos);
                let histList = await idb.getAll('historico_sprints') || [];
                histList.push(hist);
                await idb.putAll('historico_sprints', histList);
                await idb.putAll('producao_pedidos', []);
                await this._render();
                alert('✅ Sprint finalizada e salva no histórico!');
            } catch(e) { alert('Erro ao finalizar sprint: ' + e.message); }
        },

        async abrirHistorico() {
            try {
                let hist = await idb.getAll('historico_sprints') || [];
                const body = document.getElementById('sp-hbody');
                if (!hist.length) {
                    body.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">Nenhuma sprint finalizada ainda.</div>';
                } else {
                    hist.sort((a,b) => b.id - a.id);
                    body.innerHTML = hist.map(h => {
                        const dt = new Date(h.data_finalizacao).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
                        const cl = h.pedidos_concluidos.map(n => `<li style="color:#10b981;">✅ ${esc(n)}</li>`).join('') || '<li style="color:#555;">Nenhum</li>';
                        const il = h.pedidos_incompletos.map(n => `<li style="color:#eab308;">⏳ ${esc(n)}</li>`).join('') || '<li style="color:#555;">Nenhum</li>';
                        return `<div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #333;">
                                <span style="font-weight:700;color:#fff;">🏁 ${dt}</span>
                                <span style="background:#333;color:#aaa;font-size:.73rem;padding:3px 9px;border-radius:10px;">${h.dias_duracao} dia(s)</span>
                            </div>
                            <div style="display:flex;gap:20px;font-size:.85rem;">
                                <div style="flex:1;"><strong style="color:#10b981;display:block;margin-bottom:6px;">Concluídos (${h.pedidos_concluidos.length})</strong><ul style="list-style:none;padding:0;margin:0;line-height:1.7;">${cl}</ul></div>
                                <div style="flex:1;"><strong style="color:#eab308;display:block;margin-bottom:6px;">Incompletos (${h.pedidos_incompletos.length})</strong><ul style="list-style:none;padding:0;margin:0;line-height:1.7;">${il}</ul></div>
                            </div>
                        </div>`;
                    }).join('');
                }
                document.getElementById('sp-mhist').style.display = 'flex';
            } catch(e) { alert('Erro ao abrir histórico: ' + e.message); }
        }
    };

    /* ── Boot ──────────────────────────────────────────────────── */
    await window._sp._render();
}
