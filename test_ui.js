const puppeteer = require('puppeteer');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
        
        await page.goto('http://localhost:8080/index.html');
        await wait(1000);
        
        console.log("Switching to Produção tab...");
        await page.evaluate(() => {
            document.querySelector('[data-tab="producao"]').click();
        });
        await wait(1000);
        
        console.log("Clicking Add to Trello...");
        await page.evaluate(() => {
            const btn = document.querySelector('#trello-btn-add-pedido');
            if (btn) btn.click();
            else console.log('BTN NOT FOUND');
        });
        await wait(1000);
        
        await browser.close();
        console.log("DONE");
    } catch(err) {
        console.error(err);
    }
})();
