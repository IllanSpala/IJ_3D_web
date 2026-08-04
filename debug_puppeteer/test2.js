const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8082, async () => {
    console.log('Server running on 8082');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8082/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        document.querySelectorAll('.nav-btn').forEach(b => console.log('Tab: ' + b.id));
        const btn = document.getElementById('tab-producao');
        if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await browser.close();
    process.exit(0);
});
