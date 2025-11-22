import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting screenshot audit...');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=egl',
      '--enable-webgl',
      '--enable-accelerated-2d-canvas',
      '--ignore-gpu-blocklist'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2 // Retina
  });
  const page = await context.newPage();

  // Listen to console logs
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  // Listen to errors
  page.on('pageerror', error => {
    console.error(`[Browser Error]:`, error);
  });

  try {
    console.log('📡 Navigating to http://localhost:3000/Vib3Code-Blog-/...');
    await page.goto('http://localhost:3000/Vib3Code-Blog-/', { waitUntil: 'load', timeout: 30000 });

    console.log('⏱️  Waiting for app initialization...');
    await page.waitForTimeout(5000);

    // Capture initial state
    console.log('📸 Capturing Hero section...');
    await page.screenshot({ path: 'screenshot-hero.png', fullPage: false });

    // Navigate through sections using CircularRevolver clicks
    const sections = [
      { name: 'Philosophy', index: 1 },
      { name: 'Pillars', index: 2 },
      { name: 'Quality', index: 3 },
      { name: 'Sustainability', index: 4 },
      { name: 'Contact', index: 5 }
    ];

    for (const section of sections) {
      console.log(`📸 Navigating to ${section.name} section...`);

      // Click revolver navigation or use arrow keys
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `screenshot-${section.name.toLowerCase()}.png`,
        fullPage: false
      });
    }

    // Capture a card expansion
    console.log('📸 Capturing card expansion...');
    await page.goto('http://localhost:3000/Vib3Code-Blog-/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    // Click first article card
    const firstCard = await page.locator('div[class*="cursor-pointer"]').first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshot-card-expanded.png', fullPage: false });
    }

    console.log('✅ Screenshots captured successfully!');
    console.log('📁 Files saved:');
    console.log('  - screenshot-hero.png');
    console.log('  - screenshot-philosophy.png');
    console.log('  - screenshot-pillars.png');
    console.log('  - screenshot-quality.png');
    console.log('  - screenshot-sustainability.png');
    console.log('  - screenshot-contact.png');
    console.log('  - screenshot-card-expanded.png');

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('🏁 Audit complete!');
  }
})();
