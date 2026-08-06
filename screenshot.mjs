import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
});

const page = await browser.newPage();
await page.setViewport({ width: 800, height: 900 });
await page.goto('http://localhost:3007', { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: '/tmp/rv-home.png', fullPage: true });
console.log('home ok');

// Test with a valid repo
await page.type('input[type="text"]', 'facebook/react');
await page.click('button[type="submit"]');
await page.waitForSelector('.score-details', { timeout: 15000 });
await new Promise(r => setTimeout(r, 1200));
await page.screenshot({ path: '/tmp/rv-result.png', fullPage: true });
console.log('result ok');

// Test error state: clear input, type invalid repo
await page.click('input[type="text"]', { clickCount: 3 });
await page.type('input[type="text"]', 'notavalidinput');
await page.click('button[type="submit"]');
await new Promise(r => setTimeout(r, 1000));
await page.screenshot({ path: '/tmp/rv-error.png', fullPage: true });
console.log('error ok');

await browser.close();
