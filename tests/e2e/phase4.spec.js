import { test, expect } from '@playwright/test';

test.describe('Phase 4: Non-Functional Tests', () => {
  test('Measure First Contentful Paint (FCP) on throttled mobile profile', async ({ page }) => {
    // Connect to CDP session to throttle network to 4G and CPU by 4x
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps 4G
      uploadThroughput: (3 * 1024 * 1024) / 8, // 3 Mbps
      latency: 50, // 50ms RTT
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    // Extract FCP from Performance API
    const fcp = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });

    console.log(`Measured FCP on throttled 4G Android: ${fcp ? fcp.toFixed(2) : 'N/A'} ms (Page Load: ${loadTime} ms)`);
    if (fcp !== null) {
      expect(fcp).toBeLessThan(2000); // Target: under 2 seconds
    } else {
      expect(loadTime).toBeLessThan(2000);
    }
  });

  test('Run 5 parallel browser contexts to confirm zero cross-session leakage', async ({ browser }) => {
    test.setTimeout(60000);
    const profiles = [
      { age_band: '18_to_59', gender: 'female', state: 'Punjab' },
      { age_band: '60_and_over', gender: 'male', state: 'Kerala' },
      { age_band: 'under_18', gender: 'other', state: 'Goa' },
      { age_band: '18_to_59', gender: 'male', state: 'Bihar' },
      { age_band: '60_and_over', gender: 'female', state: 'Assam' },
    ];

    const contexts = await Promise.all(profiles.map(() => browser.newContext()));
    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));

    // Open landing in all 5 sequentially to prevent python http.server socket starvation
    for (let i = 0; i < 5; i++) {
      const p = pages[i];
      const prof = profiles[i];
      await p.goto('http://localhost:3000');
      await p.waitForSelector('.landing-headline');
      await p.click('#btn-start');
      await p.waitForSelector('#progress-step-text');
      await p.click(`label[for="age_band_${prof.age_band}"]`);
      await p.click(`label[for="gender_${prof.gender}"]`);
      await p.selectOption('#state', prof.state);
      await p.click('#btn-continue');
    }

    // Verify sessionStorage in each context only contains its own state
    for (let i = 0; i < 5; i++) {
      const p = pages[i];
      const prof = profiles[i];
      const stored = await p.evaluate(() => JSON.parse(sessionStorage.getItem('haqdar_answers') || '{}'));
      expect(stored.state).toBe(prof.state);
      expect(stored.age_band).toBe(prof.age_band);
      expect(stored.gender).toBe(prof.gender);
    }

    // Cleanup
    await Promise.all(contexts.map((ctx) => ctx.close()));
  });
});
