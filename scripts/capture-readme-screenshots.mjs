import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import('playwright');

const baseUrl = process.env.RWD_UI_BASE_URL ?? 'http://127.0.0.1:4174';
const outDir = new URL('../docs/screenshots/', import.meta.url);
const outPath = path.resolve(new URL('../docs/screenshots/', import.meta.url).pathname);

await fs.mkdir(outDir, { recursive: true });

const fallbackExecutablePath = process.env.RWD_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  headless: true,
  ...(await fs
    .access(fallbackExecutablePath)
    .then(() => ({ executablePath: fallbackExecutablePath }))
    .catch(() => ({}))),
});
const page = await browser.newPage({ viewport: { width: 1400, height: 920 } });

await page.goto(baseUrl, { waitUntil: 'networkidle' });

async function shot(route, file) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outPath, file), fullPage: false });
}

await shot('/', 'dashboard.png');
await shot('/traffic', 'traffic.png');
await shot('/performance', 'performance.png');
await shot('/integrations', 'integrations.png');
await shot('/settings', 'settings.png');

await browser.close();
console.log('screenshots captured');
