/**
 * Quick diagnostic: Verifies Tauri mock injection works.
 * Takes screenshots at key navigation points.
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:1420';
const MOCK_SCRIPT = path.join(__dirname, 'tauri-mock.js');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-mock');

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const mockScript = fs.readFileSync(MOCK_SCRIPT, 'utf-8');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  await context.addInitScript(mockScript);

  const page = await context.newPage();
  
  // Listen for console logs from the mock
  page.on('console', msg => {
    if (msg.text().includes('[MOCK]')) console.log('  BROWSER:', msg.text());
  });

  console.log('1. Loading app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 3000));

  // Check page state
  const h1 = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
  console.log(`   Page heading: "${h1}"`);
  
  const gameCards = await page.locator('[data-game-card]').count();
  console.log(`   Game cards visible: ${gameCards}`);

  const systemBtns = await page.locator('button:has(span)').filter({ hasText: /games/ }).count();
  console.log(`   System buttons: ${systemBtns}`);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-initial.png') });
  console.log('   Screenshot: 01-initial.png');

  // Try Library
  console.log('\n2. Clicking Library...');
  await page.locator('button[title="Library"]').click();
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-library.png') });
  const h1_2 = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
  console.log(`   Page heading: "${h1_2}"`);
  const gameCards2 = await page.locator('[data-game-card]').count();
  console.log(`   Game cards: ${gameCards2}`);

  // Try Settings
  console.log('\n3. Clicking Settings...');
  await page.locator('button[title="Settings"]').click();
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-settings.png') });
  const h1_3 = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
  console.log(`   Page heading: "${h1_3}"`);

  // Try sub-page
  console.log('\n4. Navigating to Emulator Config...');
  await page.mouse.wheel(0, 600);
  await new Promise(r => setTimeout(r, 500));
  const emuBtn = page.locator('button').filter({ hasText: 'Emulator Config' }).first();
  if (await emuBtn.count() > 0) {
    await emuBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-emulator-config.png') });
    const h1_4 = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
    console.log(`   Page heading: "${h1_4}"`);
  } else {
    console.log('   Emulator Config button not found!');
  }

  // Back to Library
  console.log('\n5. Back to Library...');
  await page.locator('button[title="Library"]').click();
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-library-again.png') });
  const gameCards3 = await page.locator('[data-game-card]').count();
  console.log(`   Game cards: ${gameCards3}`);

  console.log('\nDone! Check demo/screenshots-mock/ for results.');
  await browser.close();
}

main().catch(console.error);
