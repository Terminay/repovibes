import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

// Find a Chrome/Chromium executable across platforms.
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);

  for (const c of candidates) {
    try {
      if (os.platform() === 'win32') {
        execSync(`if exist "${c}" exit /b 0`, { stdio: 'ignore' });
      } else {
        execSync(`test -f "${c}"`, { stdio: 'ignore' });
      }
      return c;
    } catch {
      // try next
    }
  }
  throw new Error('Chrome/Chromium not found. Set CHROME_PATH env var.');
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
});

const outDir = path.join(os.tmpdir(), 'rv-screenshots');
execSync(`mkdir -p "${outDir}"`);

const page = await browser.newPage();
await page.setViewport({ width: 800, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: path.join(outDir, 'rv-home.png'), fullPage: true });
console.log('home ok');

// Test with a valid repo
await page.type('input[type="text"]', 'facebook/react');
await page.click('button[type="submit"]');
await page.waitForSelector('.score-details', { timeout: 15000 });
await new Promise(r => setTimeout(r, 1200));
await page.screenshot({ path: path.join(outDir, 'rv-result.png'), fullPage: true });
console.log('result ok');

// Test error state: clear input, type invalid repo
await page.click('input[type="text"]', { clickCount: 3 });
await page.type('input[type="text"]', 'notavalidinput');
await page.click('button[type="submit"]');
await new Promise(r => setTimeout(r, 1000));
await page.screenshot({ path: path.join(outDir, 'rv-error.png'), fullPage: true });
console.log('error ok');

await browser.close();
console.log(`Screenshots saved to ${outDir}`);