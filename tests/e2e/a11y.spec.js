import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function auditA11y(page) {
  // Wait for 220ms CSS entrance animations to complete before measuring contrast
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
}

test.describe('Accessibility Audits (WCAG 2.2 AA)', () => {
  test('Landing screen passes axe audit with no serious or critical violations', async ({ page }) => {
    await page.goto('/');
    expect(await auditA11y(page)).toEqual([]);
  });

  test('Question groups pass axe audit with no serious or critical violations', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-start');

    // Step 1: About you
    expect(await auditA11y(page)).toEqual([]);

    // Fill Step 1
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Punjab');
    await page.click('#btn-continue');

    // Step 2: Household
    expect(await auditA11y(page)).toEqual([]);

    // Fill Step 2
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_250000"]');
    await page.click('#btn-continue');

    // Step 3: Land and work
    expect(await auditA11y(page)).toEqual([]);

    // Fill Step 3
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await page.click('#btn-continue');

    // Step 4: Review
    expect(await auditA11y(page)).toEqual([]);

    // Go to Results
    await page.click('#btn-view-results');
    await page.waitForSelector('#group-likely');
    expect(await auditA11y(page)).toEqual([]);

    // Go to Checklist
    await page.click('#btn-view-checklist');
    await page.waitForSelector('#screen-checklist');
    expect(await auditA11y(page)).toEqual([]);
  });
});

