/**
 * CUBI FRONTEND — Screenshot Diagnostic
 * Takes screenshots at each navigation point to verify what the user sees.
 */

import { chromium, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:1420';
const SHOTS_DIR = path.join(__dirname, 'screenshots');

async function wait(seconds: number) {
  await new Promise(r => setTimeout(r, seconds * 1000));
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function main() {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1920,1080', '--window-position=0,0'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  console.log('Opening app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await wait(2);
  await shot(page, '00-initial-load');

  // === Scene 1: What page are we on? ===
  console.log('\n--- SCENE 1: Initial state ---');
  // Check page title / heading
  const h1 = await page.locator('h1').first().textContent().catch(() => 'NO h1');
  console.log(`  h1 text: "${h1}"`);
  await shot(page, '01-current-page');

  // === Try clicking Library ===
  console.log('\n--- SCENE 2: Click Library ---');
  const libBtn = page.locator('button[title="Library"]');
  console.log(`  Library button count: ${await libBtn.count()}`);
  if (await libBtn.count() > 0) {
    await libBtn.click();
    await wait(2);
  }
  await shot(page, '02-after-library-click');

  // Check what's visible now
  const allButtons = await page.locator('button').allTextContents();
  console.log(`  All buttons: ${allButtons.slice(0, 20).join(' | ')}`);

  // === Check systems sidebar ===
  console.log('\n--- SCENE 2b: System list ---');
  // The SystemList uses buttons with images (system logos)
  const sysButtons = page.locator('button').filter({ has: page.locator('img') });
  const sysCount = await sysButtons.count();
  console.log(`  System buttons (with img): ${sysCount}`);

  // Try clicking a system
  if (sysCount > 1) {
    await sysButtons.nth(1).click();
    await wait(1);
    await shot(page, '02b-after-system-click');
    await sysButtons.first().click();
    await wait(1);
  }

  // === Scene 3: Grid/List toggle ===
  console.log('\n--- SCENE 3: Grid/List ---');
  // Find view mode buttons
  const gridBtn = page.locator('button').filter({ hasText: '⊞' });
  const listBtn = page.locator('button').filter({ hasText: '☰' });
  console.log(`  Grid buttons (⊞): ${await gridBtn.count()}`);
  console.log(`  List buttons (☰): ${await listBtn.count()}`);

  // Check zoom buttons
  const zoomPlus = page.locator('button').filter({ hasText: '+' });
  const zoomMinus = page.locator('button').filter({ hasText: '−' });
  console.log(`  Zoom+ buttons: ${await zoomPlus.count()}`);
  console.log(`  Zoom- buttons: ${await zoomMinus.count()}`);

  // Try zoom  
  if (await zoomPlus.count() > 0) {
    await zoomPlus.first().click();
    await wait(0.5);
    await shot(page, '03a-zoomed-in');
    if (await zoomMinus.count() > 0) {
      await zoomMinus.first().click();
      await wait(0.5);
    }
  }

  // Try list mode
  if (await listBtn.count() > 0) {
    await listBtn.first().click();
    await wait(1);
    await shot(page, '03b-list-mode');
    // Back to grid
    const backGrid = page.locator('button').filter({ hasText: '⊞' }).last();
    if (await backGrid.count() > 0) {
      await backGrid.click();
      await wait(1);
    }
  }
  await shot(page, '03c-grid-mode');

  // === Scene 4: Game detail ===
  console.log('\n--- SCENE 4: Game detail ---');
  // Try multiple selectors for game cards
  const cursorDivs = page.locator('div[style*="cursor: pointer"]');
  console.log(`  cursor:pointer divs: ${await cursorDivs.count()}`);
  
  // Also try finding game cards via the grid/list component
  const allImgs = page.locator('img');
  console.log(`  Total images: ${await allImgs.count()}`);

  // Let's look at the GameGrid structure
  const gameGridItems = page.locator('div[style*="grid"] > div');
  console.log(`  Grid items: ${await gameGridItems.count()}`);

  // Try clicking the first clickable game
  try {
    if (await cursorDivs.count() > 2) {
      // Skip first few which might be sidebar items
      await cursorDivs.nth(2).click();
      await wait(2);
      await shot(page, '04a-game-detail');
      
      // Check for back button
      const backBtn = page.locator('button').filter({ hasText: /Back|←|⬅/ });
      console.log(`  Back button: ${await backBtn.count()}`);
      
      // Check for edit button  
      const editBtn = page.locator('button').filter({ hasText: /Edit|✏/ });
      console.log(`  Edit button: ${await editBtn.count()}`);

      // Check for launch button
      const launchBtn = page.locator('button').filter({ hasText: /Launch|Play|▶/ });
      console.log(`  Launch button: ${await launchBtn.count()}`);
      
      // Go back
      await page.keyboard.press('Escape');
      await wait(1);
    }
  } catch (e) {
    console.log(`  Error clicking game: ${e}`);
  }
  await shot(page, '04b-after-game-back');

  // === Scene 5-7: Themes ===
  console.log('\n--- SCENE 5: Settings & Themes ---');
  const settingsBtn = page.locator('button[title="Settings"]');
  console.log(`  Settings button count: ${await settingsBtn.count()}`);
  if (await settingsBtn.count() > 0) {
    await settingsBtn.click();
    await wait(2);
    await shot(page, '05a-settings-page');
  }

  // Find theme buttons
  const defaultTheme = page.locator('button').filter({ hasText: 'Default' });
  const hyperTheme = page.locator('button').filter({ hasText: 'HyperSpin' });
  const auroraTheme = page.locator('button').filter({ hasText: 'Aurora' });
  console.log(`  Default btn: ${await defaultTheme.count()}`);
  console.log(`  HyperSpin btn: ${await hyperTheme.count()}`);
  console.log(`  Aurora btn: ${await auroraTheme.count()}`);

  // Scroll down to see themes
  await page.mouse.wheel(0, 400);
  await wait(1);
  await shot(page, '05b-settings-scrolled');

  // Click HyperSpin
  if (await hyperTheme.count() > 0) {
    await hyperTheme.first().click();
    await wait(2);
    await shot(page, '06a-hyperspin-settings');
    
    // Go to library to see theme
    await page.locator('button[title="Library"]').click();
    await wait(2);
    await shot(page, '06b-hyperspin-library');
  }

  // Click Aurora 
  await page.locator('button[title="Settings"]').click();
  await wait(1);
  if (await auroraTheme.count() > 0) {
    await auroraTheme.first().click();
    await wait(2);
    
    await page.locator('button[title="Library"]').click();
    await wait(2);
    await shot(page, '07a-aurora-library');
  }

  // Back to default
  await page.locator('button[title="Settings"]').click();
  await wait(1);
  if (await defaultTheme.count() > 0) {
    await defaultTheme.first().click();
    await wait(1);
  }

  // === Scene 9: Scraper ===
  console.log('\n--- SCENE 9: Scraper ---');
  // First scroll to quick nav
  await page.mouse.wheel(0, 300);
  await wait(0.5);
  const scraperBtn = page.locator('button').filter({ hasText: 'Scraper' });
  console.log(`  Scraper buttons: ${await scraperBtn.count()}`);
  if (await scraperBtn.count() > 0) {
    const texts = await scraperBtn.allTextContents();
    console.log(`  Scraper button texts: ${texts.join(' | ')}`);
    await scraperBtn.first().click();
    await wait(2);
    await shot(page, '09a-scraper-page');
  }

  // === Scene 10: PC Games ===
  console.log('\n--- SCENE 10: PC Games ---');
  await page.locator('button[title="Settings"]').click();
  await wait(1);
  await page.mouse.wheel(0, 300);
  await wait(0.5);
  const pcBtn = page.locator('button').filter({ hasText: 'PC Games' });
  console.log(`  PC Games buttons: ${await pcBtn.count()}`);
  if (await pcBtn.count() > 0) {
    const texts = await pcBtn.allTextContents();
    console.log(`  PC button texts: ${texts.join(' | ')}`);
    // Make sure we click the navigation button, not a tab
    await pcBtn.first().click();
    await wait(2);
    await shot(page, '10a-pc-games-page');
  }

  // === Scene 12: Emulator config ===
  console.log('\n--- SCENE 12: Emulator Config ---');
  await page.locator('button[title="Settings"]').click();
  await wait(1);
  await page.mouse.wheel(0, 300);
  await wait(0.5);
  const emuBtn = page.locator('button').filter({ hasText: 'Emulator Config' });
  console.log(`  Emulator Config buttons: ${await emuBtn.count()}`);
  if (await emuBtn.count() > 0) {
    await emuBtn.first().click();
    await wait(2);
    await shot(page, '12a-emulator-config');
  }

  // === Scene 13: Language ===
  console.log('\n--- SCENE 13: Language ---');
  await page.locator('button[title="Settings"]').click();
  await wait(1);
  await page.mouse.wheel(0, -1000);
  await wait(0.5);
  await shot(page, '13a-settings-top');

  // Check language buttons
  const langBtns = page.locator('button').filter({ hasText: /🇪🇸|🇫🇷|🇩🇪|🇯🇵|🇵🇹|🇺🇸/ });
  console.log(`  Language flag buttons: ${await langBtns.count()}`);
  if (await langBtns.count() > 0) {
    const langTexts = await langBtns.allTextContents();
    console.log(`  Lang texts: ${langTexts.join(' | ')}`);
  }

  // Try Spanish
  const esBtn = page.locator('button').filter({ hasText: '🇪🇸' });
  if (await esBtn.count() > 0) {
    await esBtn.first().click();
    await wait(1);
    await shot(page, '13b-spanish');
    
    // Back to English
    const enBtn = page.locator('button').filter({ hasText: '🇺🇸' });
    if (await enBtn.count() > 0) {
      await enBtn.first().click();
      await wait(1);
    }
  }

  // === Scene 14: Search ===
  console.log('\n--- SCENE 14: Search/Performance ---');
  await page.locator('button[title="Library"]').click();
  await wait(2);
  await shot(page, '14a-library-for-search');

  // Find the search input more precisely
  const searchInputs = page.locator('input[type="text"]');
  console.log(`  Text inputs on page: ${await searchInputs.count()}`);
  
  // Try the search by placeholder
  const searchByPlaceholder = page.locator('input[placeholder]');
  console.log(`  Inputs with placeholder: ${await searchByPlaceholder.count()}`);
  if (await searchByPlaceholder.count() > 0) {
    const placeholders = await searchByPlaceholder.evaluateAll(els => els.map(e => (e as HTMLInputElement).placeholder));
    console.log(`  Placeholders: ${placeholders.join(' | ')}`);
  }

  // Use more specific selector for search
  const searchInput = page.locator('input[placeholder*="earch"], input[placeholder*="uscar"], input[placeholder*="Search"]').first();
  console.log(`  Search input found: ${await searchInput.count()}`);
  if (await searchInput.count() > 0) {
    await searchInput.click();
    await searchInput.fill('Mario');
    await wait(1);
    await shot(page, '14b-search-mario');
    await searchInput.fill('');
    await wait(0.5);
  }

  await shot(page, '99-final-state');

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
  console.log(`Screenshots saved to: ${SHOTS_DIR}`);
  console.log(`Files: ${fs.readdirSync(SHOTS_DIR).join(', ')}`);

  await page.close();
  await context.close();
  await browser.close();
}

main().catch(console.error);
