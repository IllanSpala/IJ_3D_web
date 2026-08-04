const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8081, async () => {
    console.log('Server running on 8081');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8081/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Evaluating...");
    await page.evaluate(() => {
        // Try to click Producao tab
        const tab = document.querySelector('[data-tab="producao"]');
        if (tab) {
            tab.click();
            console.log("Clicked producao tab");
        } else {
            console.log("Producao tab not found");
        }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    process.exit(0);
});
