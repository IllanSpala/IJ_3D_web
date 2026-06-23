/* Tab: Financeiro (Calculadora) */
import * as idb from '../db.js';
import { formatBRL, TAXAS_PLATAFORMA, escapeHtml } from '../utils.js';

export async function render(container) {
    const config = (await idb.getAll('configuracoes'))[0] || {};
    const filamentos = await idb.getAll('filamentos');
    const acervo = await idb.getAll('acervo');
    const acervoFil = await idb.getAll('acervo_filamentos');

    const custoHora = parseFloat(config.calc_custo_hora) || 1.50;
    const lucroPct  = parseFloat(config.calc_lucro_pct)  || 100;
    const embalagem = parseFloat(config.calc_embalagem)  || 0;

    const pecaOptions = acervo.map(a => `<option value="${a.id}">${escapeHtml(a.nome_peca)}</option>`).join('');
    const platOptions = Object.keys(TAXAS_PLATAFORMA).map(p => `<option value="${p}" ${p==='Direto'?'selected':''}>${p}</option>`).join('');

    container.innerHTML = `<div class="card" style="max-width:850px; margin:0 auto;"><div class="card-header">💰 Simulador Financeiro</div>
        <div class="calc-layout">
            <div>
                <div class="calc-input-group"><label>Peça / Modo</label><select id="calc-peca"><option value="avulso">Teste Avulso (Sem Peça)</option>${pecaOptions}</select></div>
                <div id="avulso-group" style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:16px; border:1px solid #333; display:none;">
                    <div id="avulso-fils-container">
                        <div class="avulso-fil-row" style="display:flex;gap:8px;margin-bottom:8px;">
                            <div style="flex:2"><label>Filamento</label><select class="calc-av-fil">${filamentos.map(f=>`<option value="${f.id}">${escapeHtml(f.marca)} ${escapeHtml(f.cor)}</option>`).join('')}</select></div>
                            <div style="flex:1"><label>Peso (g)</label><input class="calc-av-peso" type="number" step="0.1" value="50"></div>
                            <div style="width:34px;"></div>
                        </div>
                    </div>
                    <button class="btn btn-ghost" id="calc-add-avulso-fil" style="width:100%;font-size:12px;padding:4px;border:1px dashed #555;">+ Adicionar Filamento</button>
                </div>
                <div class="calc-input-group"><label>Custo Operação / Hora (R$)</label><input id="calc-custo-h" type="number" step="0.01" value="${custoHora}"></div>
                <div class="calc-input-group" style="display:flex;gap:8px;">
                    <div style="flex:1"><label>Horas</label><input id="calc-h" type="number" min="0" value="1"></div>
                    <div style="flex:1"><label>Minutos</label><input id="calc-m" type="number" min="0" max="59" value="0"></div>
                </div>
                <div class="calc-input-group" style="display:flex;gap:8px;">
                    <div style="flex:1"><label>Cópias</label><input id="calc-qty" type="number" min="1" value="1"></div>
                    <div style="flex:1"><label>Lucro (%)</label><input id="calc-lucro" type="number" value="${lucroPct}"></div>
                </div>
                <div class="calc-input-group" style="display:flex;gap:8px;">
                    <div style="flex:1"><label>Embalagem (R$)</label><input id="calc-emb" type="number" step="0.01" value="${embalagem}"></div>
                    <div style="flex:1"><label>Plataforma</label><select id="calc-plat">${platOptions}</select></div>
                </div>
                <button class="btn btn-primary" id="calc-btn" style="width:100%;margin-top:12px;font-size:1.05rem;">Calcular Extrato</button>
            </div>
            <div class="calc-result" id="calc-result"><div style="text-align:center;color:#555;padding:48px;">Selecione uma peça ou preencha o Teste Avulso e clique em Calcular.</div></div>
        </div></div>`;

    const pecaSelect = container.querySelector('#calc-peca');
    const avulsoGroup = container.querySelector('#avulso-group');
    const avulsoContainer = container.querySelector('#avulso-fils-container');

    pecaSelect.addEventListener('change', () => {
        avulsoGroup.style.display = pecaSelect.value === 'avulso' ? 'block' : 'none';
    });

    container.querySelector('#calc-add-avulso-fil').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'avulso-fil-row';
        row.style = 'display:flex;gap:8px;margin-bottom:8px;';
        row.innerHTML = `
            <div style="flex:2"><select class="calc-av-fil">${filamentos.map(f=>`<option value="${f.id}">${escapeHtml(f.marca)} ${escapeHtml(f.cor)}</option>`).join('')}</select></div>
            <div style="flex:1"><input class="calc-av-peso" type="number" step="0.1" value="10"></div>
            <button class="btn btn-ghost" style="color:#d64545;padding:0 8px;" onclick="this.parentElement.remove()">🗑</button>
        `;
        avulsoContainer.appendChild(row);
    });

    container.querySelector('#calc-btn').addEventListener('click', () => {
        const isAvulso = pecaSelect.value === 'avulso';
        let pecaNome = 'Teste Avulso';
        let pecaFils = [];

        if (!isAvulso) {
            const pecaId = parseInt(pecaSelect.value);
            const peca = acervo.find(a => a.id === pecaId);
            if (!peca) return;
            pecaNome = peca.nome_peca;
            // acervo_filamentos DB stores weights in KG, so we convert them to grams
            pecaFils = acervoFil.filter(af => af.acervo_id === pecaId).map(af => ({
                filamento_id: af.filamento_id,
                peso_gasto: (af.peso_gasto || 0) * 1000,
                peso_desperdicio: (af.peso_desperdicio || 0) * 1000,
                peso_torre: (af.peso_torre || 0) * 1000
            }));
        } else {
            const rows = container.querySelectorAll('.avulso-fil-row');
            rows.forEach(r => {
                const filId = parseInt(r.querySelector('.calc-av-fil').value);
                const peso = parseFloat(r.querySelector('.calc-av-peso').value) || 0;
                if (filId && peso > 0) pecaFils.push({ filamento_id: filId, peso_gasto: peso, peso_desperdicio: 0, peso_torre: 0 });
            });
        }

        const ch = parseFloat(container.querySelector('#calc-custo-h').value) || 0;
        const horas = parseInt(container.querySelector('#calc-h').value) || 0;
        const mins  = parseInt(container.querySelector('#calc-m').value) || 0;
        const qty   = parseInt(container.querySelector('#calc-qty').value) || 1;
        const lucro = parseFloat(container.querySelector('#calc-lucro').value) || 0;
        const emb   = parseFloat(container.querySelector('#calc-emb').value) || 0;
        const plat  = container.querySelector('#calc-plat').value;
        const taxa  = TAXAS_PLATAFORMA[plat] || 0;

        const tempoH = horas + mins / 60;
        const custoOp = ch * tempoH;

        // Material costs
        let custoMat = 0;
        const matLines = [];
        for (const pf of pecaFils) {
            const fil = filamentos.find(f => f.id === pf.filamento_id);
            if (!fil) continue;
            
            // peso_inicial in DB is in kg (e.g. 1.0)
            const pesoIniKg = parseFloat(fil.peso_inicial) || 1.0;
            const precoGrama = (parseFloat(fil.preco_rolo) || 0) / (pesoIniKg * 1000);
            
            // pesoTotal is now always in grams
            const pesoTotal = (pf.peso_gasto || 0) + (pf.peso_desperdicio || 0) + (pf.peso_torre || 0);
            const sub = pesoTotal * precoGrama;
            
            custoMat += sub;
            matLines.push(`<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#aaa">${escapeHtml(fil.marca)} ${escapeHtml(fil.cor)} (${pesoTotal.toFixed(1)}g)</span><span style="color:var(--accent)">${formatBRL(sub)}</span></div>`);
        }

        const custoTotal = custoMat + custoOp + emb;
        const custoUnit  = custoTotal / qty;
        const comLucro   = custoUnit * (1 + lucro / 100);
        const precoFinal = taxa > 0 ? comLucro / (1 - taxa) : comLucro;
        const valorTaxa  = precoFinal - comLucro;

        const hStr = horas > 0 ? `${horas}h` : '';
        const mStr = mins > 0 ? ` ${mins}min` : '';

        const result = container.querySelector('#calc-result');
        result.innerHTML = `
            <h3 style="text-align:center;font-size:1.1rem;margin-bottom:16px;">Extrato — ${escapeHtml(pecaNome)}</h3>
            <div style="border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:8px;">
                <div style="font-size:0.75rem;color:#666;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Materiais</div>
                ${matLines.length ? matLines.join('') : '<div style="color:#555">Sem materiais vinculados</div>'}
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#aaa">⚡ Operacional (${hStr}${mStr})</span><span style="color:#d97706">${formatBRL(custoOp)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#aaa">📦 Embalagem</span><span style="color:#7a7a9a">${formatBRL(emb)}</span></div>
            <div style="border-top:1px solid #333;margin-top:8px;padding-top:8px;">
                ${qty > 1 ? `<div style="display:flex;justify-content:space-between;"><span style="color:#888">Custo Total (${qty} pç)</span><span style="color:#888">${formatBRL(custoTotal)}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:700;"><span style="color:#d64545">Custo Unitário</span><span style="color:#d64545">${formatBRL(custoUnit)}</span></div>` :
                `<div style="display:flex;justify-content:space-between;font-weight:700;"><span style="color:#d64545">Custo Total</span><span style="color:#d64545">${formatBRL(custoTotal)}</span></div>`}
                <div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#a0a0c0">+ Lucro (${lucro}%)</span><span style="color:#a0a0c0">${formatBRL(comLucro - custoUnit)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#d97706">Taxa ${plat} (${(taxa*100).toFixed(0)}%)</span><span style="color:#d97706">${formatBRL(valorTaxa)}</span></div>
            </div>
            <div class="calc-result-total">Preço de Venda: ${formatBRL(precoFinal)}${qty > 1 ? ' /un' : ''}</div>`;
    });
}
