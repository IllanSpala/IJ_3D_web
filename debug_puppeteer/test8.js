const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8088, async () => {
    console.log('Server running on 8088');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8088/index.html');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(async () => {
        const { putAll } = await import('./js/db.js');
        // Let's create an item but with string IDs that DO NOT parse as numbers!
        await putAll('pedidos_v2', [{ id: 'p1', nome_cliente: 'Cliente Teste' }]);
        await putAll('pedidos_itens', [{ id: 'i1', pedido_id: 'p1', nome_avulso: 'Item Teste' }]);
        await putAll('producao_pedidos', [{ id: 100, pedido_id: 'p1' }]);
        
        const producao = await import('./js/tabs/producao.js');
        const container = document.getElementById('content-area') || document.body;
        await producao.render(container);
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
        const inp = document.querySelector('.sp-inp-parte');
        if (inp) {
            inp.value = 'Nova Parte Alpha';
            document.querySelector('.sp-btn-parte').click();
            console.log("Clicked + Parte");
        } else {
            console.log("No input found");
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if the part was added visually
    const html = await page.evaluate(() => document.querySelector('#sp-grid').innerHTML);
    if (html.includes('Nova Parte Alpha')) {
        console.log("SUCCESS: Part is visible in HTML");
    } else {
        console.log("FAILURE: Part not visible in HTML");
    }

    await browser.close();
    process.exit(0);
});
