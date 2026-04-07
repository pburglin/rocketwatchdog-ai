import fs from 'node:fs/promises';

const { chromium } = await import('playwright');

const baseUrl = process.env.RWD_UI_BASE_URL ?? 'http://127.0.0.1:4174';
const outDir = new URL('../docs/screenshots/', import.meta.url);

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 920 } });

await page.goto(baseUrl, { waitUntil: 'networkidle' });

async function shot(path, file) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: new URL(file, outDir), fullPage: false });
}

await shot('/', 'dashboard.png');
await shot('/traffic', 'traffic.png');
await shot('/performance', 'performance.png');
await shot('/integrations', 'integrations.png');
await shot('/settings', 'settings.png');

await browser.close();
console.log('screenshots captured');
