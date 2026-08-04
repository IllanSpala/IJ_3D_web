const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8090, async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[ERROR] ${err}`));

    await page.goto('http://localhost:8090/index.html');
    await new Promise(r => setTimeout(r, 1500));

    // Add mock data
    await page.evaluate(async () => {
        const { putAll } = await import('./js/db.js');
        await putAll('pedidos_v2', [{ id: 'p1', nome_cliente: 'Cliente Teste', status: 'A MODELAR' }]);
        await putAll('pedidos_itens', [{ id: 'i1', pedido_id: 'p1', nome_avulso: 'Regador Psyduck' }]);
    });

    // Render producao
    await page.evaluate(async () => {
        const producao = await import('./js/tabs/producao.js');
        await producao.render(document.getElementById('content-area') || document.body);
    });
    await new Promise(r => setTimeout(r, 500));

    // Add to sprint
    await page.evaluate(async () => {
        await window._sp.addPedido();
    });
    await new Promise(r => setTimeout(r, 500));

    const hasBoard = await page.evaluate(() => {
        const grid = document.getElementById('sp-grid');
        return grid && grid.innerHTML.includes('Regador');
    });
    console.log('Board mostra produto:', hasBoard);

    // Add a part
    await page.evaluate(async () => {
        const inp = document.querySelector('[id^="inp_"]');
        if (inp) { inp.value = 'Perna Direita'; }
        await window._sp.addParte('p1', 'i1');
    });
    await new Promise(r => setTimeout(r, 500));

    const hasParte = await page.evaluate(() => {
        return document.getElementById('sp-grid').innerHTML.includes('Perna Direita');
    });
    console.log('Parte adicionada e visível:', hasParte);

    // Change status
    await page.evaluate(async () => {
        await window._sp.setStatusProduto('p1', 'i1', 'IMPRIMINDO');
    });
    await new Promise(r => setTimeout(r, 500));

    const hasStatus = await page.evaluate(() => {
        const opts = document.querySelectorAll('.sp-prod-status option[selected]');
        return Array.from(opts).some(o => o.value === 'IMPRIMINDO') || 
               document.getElementById('sp-grid').innerHTML.includes('Imprimindo');
    });
    console.log('Status do produto atualizado:', hasStatus);

    await browser.close();
    process.exit(0);
});
