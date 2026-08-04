const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8086, async () => {
    console.log('Server running on 8086');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8086/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        const btn = document.querySelector('[data-tab="producao"]') || document.getElementById('tab-producao');
        if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Mock data and clicking...");
    await page.evaluate(async () => {
        const { putAll } = await import('./js/db.js');
        await putAll('pedidos_v2', [{ id: 1, nome_cliente: 'Cliente Teste' }]);
        await putAll('pedidos_itens', [{ id: 10, pedido_id: 1, nome_avulso: 'Item Teste' }]);
        await putAll('producao_pedidos', [{ id: 100, pedido_id: 1 }]);
        
        // Re-render producao
        const producao = await import('./js/tabs/producao.js');
        const container = document.getElementById('content-area') || document.querySelector('main') || document.body;
        await producao.render(container);
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
        const inp = document.querySelector('.sp-inp-parte');
        if (inp) {
            inp.value = 'Minha Parte';
            const btn = document.querySelector('.sp-btn-parte');
            if (btn) btn.click();
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await browser.close();
    process.exit(0);
});
