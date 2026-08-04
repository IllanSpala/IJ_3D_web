const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

app.listen(8084, async () => {
    console.log('Server running on 8084');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.toString()}`);
    });
    
    await page.goto('http://localhost:8084/index.html');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved to debug_puppeteer/screenshot.png');
    
    await browser.close();
    process.exit(0);
});
