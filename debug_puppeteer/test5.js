const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8085, async () => {
    console.log('Server running on 8085');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8085/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        const btn = document.getElementById('tab-producao');
        if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Adding mock data...");
    await page.evaluate(async () => {
        const { putAll } = await import('./js/db.js');
        await putAll('pedidos_v2', [{ id: 1, nome_cliente: 'Cliente Teste' }]);
        await putAll('pedidos_itens', [{ id: 10, pedido_id: 1, nome_avulso: 'Item Teste' }]);
        await putAll('producao_pedidos', [{ id: 100, pedido_id: 1 }]);
        
        // Re-render
        const producao = await import('./js/tabs/producao.js');
        await producao.render(document.getElementById('content-area'));
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Trying to click Add Parte...");
    await page.evaluate(() => {
        const inp = document.querySelector('.sp-inp-parte');
        if (inp) {
            inp.value = 'Minha Parte';
            console.log("Input found, clicking button...");
            const btn = document.querySelector('.sp-btn-parte');
            if (btn) btn.click();
            else console.log("Button not found");
        } else {
            console.log("Input not found in DOM");
        }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    process.exit(0);
});
