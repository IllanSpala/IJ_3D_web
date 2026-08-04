const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8083, async () => {
    console.log('Server running on 8083');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8083/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    const html = await page.content();
    console.log(html.substring(0, 500));
    
    await browser.close();
    process.exit(0);
});
