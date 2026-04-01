/**
 * CUBI FRONTEND v0.7.0 — Automated Demo Recording with Playwright
 * 
 * Records a full video demo by automating browser navigation through all features.
 * Synced to the generated voiceover clips (15 segments).
 * 
 * Injects a Tauri API mock so the app works in a standalone Chromium browser.
 * 
 * Usage: npx tsx demo/record-demo.ts
 */

import { chromium, type Page, type BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:1420';
const AUDIO_DIR = path.join(__dirname, 'audio');
const OUTPUT_DIR = path.join(__dirname, 'recordings');
const MOCK_SCRIPT = path.join(__dirname, 'tauri-mock.js');

// Audio segment durations (seconds) — from ffprobe
const SEGMENTS = [
  { name: '01-intro',           duration: 13.4 },
  { name: '02-library',         duration: 21.5 },
  { name: '03-grid-list',       duration: 19.2 },
  { name: '04-game-detail',     duration: 26.9 },
  { name: '05-themes-default',  duration: 9.8  },
  { name: '06-themes-hyperspin',duration: 16.5 },
  { name: '07-themes-aurora',   duration: 20.9 },
  { name: '08-gamepad',         duration: 25.8 },
  { name: '09-scraper',         duration: 27.6 },
  { name: '10-pc-games',        duration: 29.1 },
  { name: '11-metadata-editor', duration: 21.2 },
  { name: '12-emulator-settings', duration: 23.5 },
  { name: '13-localization',    duration: 15.4 },
  { name: '14-performance',     duration: 25.1 },
  { name: '15-outro',           duration: 22.3 },
];

/** Wait for a specified number of seconds */
async function wait(seconds: number) {
  await new Promise(r => setTimeout(r, seconds * 1000));
}

/** Smooth scroll an element into view */
async function smoothScroll(page: Page, selector: string) {
  const el = page.locator(selector).first();
  if (await el.count() > 0) {
    await el.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await wait(0.8);
  }
}

/** Move mouse smoothly to element center */
async function hoverSmooth(page: Page, selector: string) {
  const el = page.locator(selector).first();
  if (await el.count() > 0) {
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
      await wait(0.3);
    }
  }
}

/**
 * Theme-agnostic navigation: uses Zustand store directly via window.__CUBI_UI_STORE__
 * Works regardless of which theme is active (Default, HyperSpin, Aurora)
 */
async function navTo(page: Page, target: 'library' | 'settings') {
  await page.evaluate((t) => {
    const store = (window as any).__CUBI_UI_STORE__;
    if (store) store.getState().navigateTo(t);
  }, target);
  await wait(1.5);
}

/** Navigate to a settings sub-page by clicking "Acceso Rápido" button */
async function goToSettingsSubPage(page: Page, label: string) {
  await navTo(page, 'settings');
  await wait(1);
  // Scroll down to Acceso Rápido section
  await page.mouse.wheel(0, 600);
  await wait(0.5);
  const btn = page.locator('button').filter({ hasText: label }).first();
  if (await btn.count() > 0) {
    await smoothScroll(page, `button:has-text("${label}")`);
    await btn.click();
    await wait(2);
  }
}

// ============================================================================
// SCENE ACTIONS — Each function performs the UI actions for one voiceover segment
// ============================================================================

/** Scene 1: Intro — Show the app loading, library overview */
async function scene01_intro(page: Page) {
  // Library should load with mock data — show the full UI
  await wait(3);
  // Slow mouse pan across the header and sidebar
  await page.mouse.move(200, 100, { steps: 30 });
  await wait(2);
  await page.mouse.move(600, 400, { steps: 30 });
  await wait(2);
  await page.mouse.move(1000, 350, { steps: 30 });
  await wait(3);
}

/** Scene 2: Library — Browse systems, show game count */
async function scene02_library(page: Page) {
  // We should already be on Library (mock provides data_root so no redirect)
  await navTo(page, 'library');
  await wait(1);

  // Click through systems in the sidebar (buttons inside the system list)
  // System sidebar is a div with width 144px containing buttons
  // First button is "All", then individual systems
  const systemBtns = page.locator('button:has(span)').filter({ hasText: /games/ });
  const count = await systemBtns.count();

  if (count > 2) {
    for (let i = 1; i < Math.min(count, 6); i++) {
      await systemBtns.nth(i).click();
      await wait(2);
    }
    // Go back to All
    await systemBtns.first().click();
    await wait(2);
  }
  await wait(3);
}

/** Scene 3: Grid & List views, zoom */
async function scene03_gridList(page: Page) {
  await wait(2);

  // Look for zoom +/- buttons in the FilterBar
  const zoomIn = page.locator('button').filter({ hasText: '+' });
  if (await zoomIn.count() > 0) {
    await zoomIn.first().click();
    await wait(1.5);
    await zoomIn.first().click();
    await wait(1.5);
  }

  const zoomOut = page.locator('button').filter({ hasText: '−' });
  if (await zoomOut.count() > 0) {
    await zoomOut.first().click();
    await wait(1.5);
    await zoomOut.first().click();
    await wait(1.5);
  }

  // Switch to list view (☰ button)
  const listBtn = page.locator('button').filter({ hasText: '☰' });
  if (await listBtn.count() > 0) {
    await listBtn.first().click();
    await wait(3);
  }

  // Switch back to grid (⊞ button — last one since sidebar also has ⊞)
  const gridBtn = page.locator('button').filter({ hasText: '⊞' }).last();
  if (await gridBtn.count() > 0) {
    await gridBtn.click();
    await wait(2);
  }
}

/** Scene 4: Game detail — Click a game, show metadata */
async function scene04_gameDetail(page: Page) {
  // Game cards use [data-game-card] wrapper
  const gameCards = page.locator('[data-game-card]');
  if (await gameCards.count() > 0) {
    await gameCards.nth(1).click();
    await wait(4);

    // Hover around the detail page
    await page.mouse.move(400, 300, { steps: 20 });
    await wait(2);
    await page.mouse.move(700, 400, { steps: 20 });
    await wait(2);

    // Scroll down to see metadata
    await page.mouse.wheel(0, 300);
    await wait(3);
    await page.mouse.wheel(0, 300);
    await wait(3);

    // Scroll back up
    await page.mouse.wheel(0, -600);
    await wait(2);

    // Go back (Escape or back button)
    await page.keyboard.press('Escape');
    await wait(2);
  } else {
    await wait(10);
  }
}

/** Scene 5: Default theme — show it briefly from Settings */
async function scene05_themesDefault(page: Page) {
  await navTo(page, 'settings');
  await wait(1);

  // Scroll to Theme section
  const themeLabel = page.getByText('Default').first();
  if (await themeLabel.count() > 0) {
    await smoothScroll(page, 'button:has-text("Default")');
  }
  await wait(3);

  // Click Default theme button
  const defaultBtn = page.locator('button').filter({ hasText: 'Default' }).first();
  if (await defaultBtn.count() > 0) {
    await defaultBtn.click();
    await wait(2);
  }
}

/** Scene 6: HyperSpin theme */
async function scene06_themesHyperspin(page: Page) {
  // We should still be on Settings (from scene 5). If not, go there.
  await navTo(page, 'settings');
  await wait(1);

  // Click HyperSpin theme button in Settings
  const hyperBtn = page.locator('button').filter({ hasText: 'HyperSpin' }).first();
  if (await hyperBtn.count() > 0) {
    await smoothScroll(page, 'button:has-text("HyperSpin")');
    await hyperBtn.click();
    await wait(2);
  }

  // Go to library to see the HyperSpin theme applied (use Zustand nav, no sidebar)
  await navTo(page, 'library');
  await wait(3);

  // Hover over game area
  await page.mouse.move(640, 400, { steps: 20 });
  await wait(2);
  await page.mouse.move(800, 350, { steps: 20 });
  await wait(3);
}

/** Scene 7: Aurora theme */
async function scene07_themesAurora(page: Page) {
  // Go back to settings (via Zustand — HyperSpin has no sidebar nav)
  await navTo(page, 'settings');
  await wait(1);

  // Click Aurora theme
  const auroraBtn = page.locator('button').filter({ hasText: 'Aurora' }).first();
  if (await auroraBtn.count() > 0) {
    await smoothScroll(page, 'button:has-text("Aurora")');
    await auroraBtn.click();
    await wait(2);
  }

  // Go to library to see Aurora CoverFlow
  await navTo(page, 'library');
  await wait(4);

  // Pan across
  await page.mouse.move(300, 400, { steps: 30 });
  await wait(2);
  await page.mouse.move(900, 400, { steps: 30 });
  await wait(3);

  // Switch back to Default for remaining scenes
  await navTo(page, 'settings');
  await wait(1);
  const defaultBtn = page.locator('button').filter({ hasText: 'Default' }).first();
  if (await defaultBtn.count() > 0) {
    await smoothScroll(page, 'button:has-text("Default")');
    await defaultBtn.click();
    await wait(2);
  }
}

/** Scene 8: Gamepad & Input Mapping */
async function scene08_gamepad(page: Page) {
  // Go to library for keyboard navigation demo
  await navTo(page, 'library');
  await wait(1);

  // Arrow key navigation through game grid
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowRight');
    await wait(1);
  }
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('ArrowDown');
    await wait(1);
  }
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowLeft');
    await wait(1);
  }
  await wait(2);

  // Navigate to Input Mapping page
  await goToSettingsSubPage(page, 'Input Mapping');
  await wait(2);

  // Scroll around
  await page.mouse.wheel(0, 200);
  await wait(2);
  await page.mouse.wheel(0, 200);
  await wait(3);
}

/** Scene 9: Scraper page */
async function scene09_scraper(page: Page) {
  await goToSettingsSubPage(page, 'Scraper');
  await wait(2);

  // Scroll through scraper content
  await page.mouse.wheel(0, 300);
  await wait(3);
  await page.mouse.wheel(0, 300);
  await wait(3);
  await page.mouse.wheel(0, -600);
  await wait(3);

  // Look for tabs
  const tabs = page.locator('button[role="tab"]');
  if (await tabs.count() > 1) {
    await tabs.nth(1).click();
    await wait(3);
    await tabs.first().click();
    await wait(3);
  }
}

/** Scene 10: PC Games */
async function scene10_pcGames(page: Page) {
  await goToSettingsSubPage(page, 'PC Games');
  await wait(2);

  // Scroll through
  await page.mouse.wheel(0, 300);
  await wait(3);
  await page.mouse.wheel(0, 300);
  await wait(3);
  await page.mouse.wheel(0, 300);
  await wait(3);

  // Hover over elements
  await page.mouse.move(640, 400, { steps: 20 });
  await wait(2);
  await page.mouse.wheel(0, -900);
  await wait(3);
}

/** Scene 11: Metadata Editor */
async function scene11_metadataEditor(page: Page) {
  // Go to library and open a game detail
  await navTo(page, 'library');
  await wait(1);

  const gameCards = page.locator('[data-game-card]');
  if (await gameCards.count() > 0) {
    await gameCards.first().click();
    await wait(3);

    // Look for Edit button
    const editBtn = page.locator('button').filter({ hasText: /Edit|✏/ });
    if (await editBtn.count() > 0) {
      await editBtn.first().click();
      await wait(3);

      // Scroll through editor
      await page.mouse.wheel(0, 200);
      await wait(2);
      await page.mouse.wheel(0, 200);
      await wait(2);
      await page.mouse.wheel(0, -400);
      await wait(2);

      // Close editor
      await page.keyboard.press('Escape');
      await wait(2);
    } else {
      await wait(6);
    }

    // Go back
    await page.keyboard.press('Escape');
    await wait(2);
  } else {
    await wait(10);
  }
}

/** Scene 12: Emulator Settings & ROM Paths */
async function scene12_emulatorSettings(page: Page) {
  // Emulator Config
  await goToSettingsSubPage(page, 'Emulator Config');
  await wait(2);
  await page.mouse.wheel(0, 300);
  await wait(3);

  // Emulator Settings
  await goToSettingsSubPage(page, 'Emulator Settings');
  await wait(2);
  await page.mouse.wheel(0, 300);
  await wait(3);

  // ROM Paths
  await goToSettingsSubPage(page, 'ROM Paths');
  await wait(2);
  await page.mouse.wheel(0, 200);
  await wait(3);
}

/** Scene 13: Localization — Switch languages */
async function scene13_localization(page: Page) {
  await navTo(page, 'settings');
  await wait(1);

  // Scroll to top for language section
  await page.mouse.wheel(0, -1000);
  await wait(1);

  // Click through language buttons (they contain flag emojis)
  const langFlags = ['🇪🇸', '🇫🇷', '🇩🇪', '🇯🇵', '🇵🇹', '🇺🇸'];
  for (const flag of langFlags) {
    const btn = page.locator('button').filter({ hasText: flag });
    if (await btn.count() > 0) {
      await btn.first().click();
      await wait(2);
    }
  }
}

/** Scene 14: Performance — Fast scrolling through library */
async function scene14_performance(page: Page) {
  await navTo(page, 'library');
  await wait(1);

  // Fast scroll to show performance
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 500);
    await wait(0.5);
  }
  await wait(2);

  // Scroll back
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -500);
    await wait(0.3);
  }
  await wait(2);

  // Type in search
  const searchInput = page.locator('input[type="text"]').first();
  if (await searchInput.count() > 0) {
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially('Mario', { delay: 150 });
    await wait(3);
    await searchInput.fill('');
    await wait(2);
  }

  // Click through systems rapidly
  const systemBtns = page.locator('button:has(span)').filter({ hasText: /games/ });
  const sysCount = await systemBtns.count();
  for (let i = 1; i < Math.min(sysCount, 8); i++) {
    await systemBtns.nth(i).click();
    await wait(0.5);
  }
  if (sysCount > 0) {
    await systemBtns.first().click();
  }
  await wait(2);
}

/** Scene 15: Outro — Pan across the app one last time */
async function scene15_outro(page: Page) {
  await navTo(page, 'library');
  await wait(2);

  // Cinematic mouse movement
  await page.mouse.move(100, 200, { steps: 10 });
  await wait(1);
  await page.mouse.move(640, 360, { steps: 40 });
  await wait(3);
  await page.mouse.move(1100, 500, { steps: 40 });
  await wait(3);

  // End on center
  await page.mouse.move(640, 360, { steps: 30 });
  await wait(5);

  // Hover the logo
  await hoverSmooth(page, 'img[alt="Cubi"]');
  await wait(5);
}

// ============================================================================
// MAIN — Launch browser, inject mock, record video, run all scenes
// ============================================================================

const SCENE_FUNCTIONS = [
  scene01_intro,
  scene02_library,
  scene03_gridList,
  scene04_gameDetail,
  scene05_themesDefault,
  scene06_themesHyperspin,
  scene07_themesAurora,
  scene08_gamepad,
  scene09_scraper,
  scene10_pcGames,
  scene11_metadataEditor,
  scene12_emulatorSettings,
  scene13_localization,
  scene14_performance,
  scene15_outro,
];

async function main() {
  console.log('=== CUBI FRONTEND v0.7.0 — Demo Recording ===\n');

  // Ensure output dir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read mock script
  const mockScript = fs.readFileSync(MOCK_SCRIPT, 'utf-8');
  console.log('Loaded Tauri API mock script');

  // Launch browser with video recording
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--window-size=1920,1080',
      '--window-position=0,0',
      '--disable-infobars',
      '--hide-scrollbars',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
    colorScheme: 'dark',
  });

  // Inject Tauri API mock BEFORE any page loads
  await context.addInitScript(mockScript);
  console.log('Injected Tauri API mock into browser context');

  const page = await context.newPage();

  console.log('Opening Cubi Frontend at', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await wait(2);

  // Verify mock is working — check we're NOT redirected to Settings
  const pageTitle = await page.locator('h1, h2').first().textContent().catch(() => '');
  console.log(`Initial page heading: "${pageTitle}"`);

  // Run each scene sequentially
  const totalDuration = SEGMENTS.reduce((sum, s) => sum + s.duration, 0);
  console.log(`\nTotal voiceover duration: ${totalDuration.toFixed(1)}s (~${Math.ceil(totalDuration / 60)} min)`);
  console.log(`Running ${SEGMENTS.length} scenes...\n`);

  let elapsed = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    const seg = SEGMENTS[i];
    const sceneFn = SCENE_FUNCTIONS[i];
    const startTime = Date.now();

    console.log(`[${i + 1}/${SEGMENTS.length}] ${seg.name} (${seg.duration}s)...`);

    try {
      await sceneFn(page);

      const elapsedScene = (Date.now() - startTime) / 1000;
      const remaining = seg.duration - elapsedScene;
      if (remaining > 0) {
        console.log(`  Padding ${remaining.toFixed(1)}s...`);
        await wait(remaining);
      }
    } catch (err) {
      console.error(`  Error in ${seg.name}:`, err);
      const elapsedScene = (Date.now() - startTime) / 1000;
      const remaining = seg.duration - elapsedScene;
      if (remaining > 0) await wait(remaining);
    }

    elapsed += seg.duration;
    console.log(`  Done. Elapsed: ${elapsed.toFixed(1)}s`);
  }

  console.log('\n=== Recording complete! Closing browser... ===');

  await page.close();
  await context.close();
  await browser.close();

  // Find the generated video file
  const videoFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = videoFiles.sort().pop()!;
    const videoPath = path.join(OUTPUT_DIR, latestVideo);
    const stats = fs.statSync(videoPath);
    console.log(`\nVideo saved: ${videoPath}`);
    console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`\nNext steps:`);
    console.log(`  1. Combine with voiceover: demo/04-combine.ps1`);
    console.log(`  2. Or manually: ffmpeg -i "${videoPath}" -i demo/audio/full-voiceover.mp3 -c:v libx264 -c:a aac -shortest demo/output/cubi-demo-final.mp4`);
  }
}

main().catch(console.error);
