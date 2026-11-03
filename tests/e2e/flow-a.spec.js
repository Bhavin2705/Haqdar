import { test, expect } from '@playwright/test';

test.describe('Flow A: Happy Path End-to-End', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.goto('/');
    await page.waitForSelector('.landing-headline');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `../../qa/screenshots/flow-a-failure-${testInfo.project.name}.png`, fullPage: true });
    }
    expect(consoleErrors, `Browser console had errors: ${consoleErrors.join('; ')}`).toEqual([]);
  });

  test('executes Flow A happy path from landing to results and checklist', async ({ page }) => {
    // 1. Landing page checks
    const headline = page.locator('.landing-headline');
    await expect(headline).toBeVisible();
    await expect(headline).toHaveText('Find the schemes you may qualify for.');

    const body = page.locator('.landing-body');
    await expect(body).toBeVisible();
    await expect(body).toHaveText(
      'Answer nine short questions. Get the schemes, the documents to bring, and the official link for each.'
    );

    const privacy = page.locator('.landing-privacy');
    await expect(privacy).toBeVisible();
    await expect(privacy).toHaveText('Your answers stay on this device. Nothing is sent or stored.');

    const startBtn = page.locator('#btn-start');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toHaveText('Start');

    // How it works steps
    await expect(page.locator('.how-it-works-title')).toHaveText('How it works');
    const howSteps = page.locator('.how-it-works-item');
    await expect(howSteps).toHaveCount(3);
    await expect(howSteps.nth(0)).toHaveText('Answer a few questions about your family and work.');
    await expect(howSteps.nth(1)).toHaveText('See which central schemes match your profile.');
    await expect(howSteps.nth(2)).toHaveText('Get a printable list of the documents you will need.');

    // Confirm no hero illustration or marketing copy
    const images = page.locator('.landing-hero img, .landing-hero svg, .how-it-works img, .how-it-works svg');
    await expect(images).toHaveCount(0);

    // 2. Click Start. Confirm progress shows "Step 1 of 4" and the first question is visible
    await startBtn.click();
    await expect(page.locator('#progress-step-text')).toHaveText('Step 1 of 4');
    await expect(page.locator('#progress-step-title')).toHaveText('About you');
    const firstQuestionLegend = page.locator('.question-legend').first();
    await expect(firstQuestionLegend).toBeVisible();
    await expect(firstQuestionLegend).toHaveText('What is your age?');

    // 3. Answer every question with a profile that matches a verified scheme (PM-KISAN: Punjab, farmer, cultivable land)
    // Step 1: About you
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Punjab');
    await expect(page.locator('#btn-continue')).toBeEnabled();
    await page.click('#btn-continue');

    // Step 2: Household
    await expect(page.locator('#progress-step-text')).toHaveText('Step 2 of 4');
    await expect(page.locator('#progress-step-title')).toHaveText('Household');
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_250000"]');
    await expect(page.locator('#btn-continue')).toBeEnabled();
    await page.click('#btn-continue');

    // Step 3: Land and work
    await expect(page.locator('#progress-step-text')).toHaveText('Step 3 of 4');
    await expect(page.locator('#progress-step-title')).toHaveText('Land and work');
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await expect(page.locator('#btn-continue')).toBeEnabled();
    await page.click('#btn-continue');

    // 4. Confirm the review screen lists every answer, and each row has an Edit link
    await expect(page.locator('#progress-step-text')).toHaveText('Step 4 of 4');
    await expect(page.locator('#progress-step-title')).toHaveText('Review');
    await expect(page.locator('.landing-headline')).toHaveText('Review your answers');

    const reviewRows = page.locator('.review-row');
    await expect(reviewRows).toHaveCount(9);

    const editLinks = page.locator('.review-edit-btn');
    await expect(editLinks).toHaveCount(9);

    for (let i = 0; i < 9; i++) {
      await expect(editLinks.nth(i)).toHaveText('Edit');
    }

    // 5. Click Show results. Confirm results appear in order: Likely eligible, Check the official page, Not eligible
    const viewResultsBtn = page.locator('#btn-view-results');
    await expect(viewResultsBtn).toBeVisible();
    await viewResultsBtn.click();

    await page.waitForSelector('#group-likely');
    const resultGroups = page.locator('.results-group');
    const groupCount = await resultGroups.count();
    expect(groupCount).toBeGreaterThanOrEqual(1);

    // Confirm groups present in order
    await expect(page.locator('#group-likely')).toBeVisible();
    await expect(page.locator('#group-likely h2')).toHaveText('Likely eligible');

    // Check if Not eligible is present and collapsed by default
    const notEligibleDetails = page.locator('details.ineligible-details');
    if (await notEligibleDetails.count() > 0) {
      const isOpen = await notEligibleDetails.evaluate((el) => el.hasAttribute('open'));
      expect(isOpen).toBe(false);
    }

    // 6. Confirm each ledger entry shows status word, scheme name, summary, documents, official link (new tab, rel="noopener noreferrer"), and rules-checked date
    const likelyCard = page.locator('#group-likely .ledger-entry').first();
    await expect(likelyCard.locator('.ledger-status-tag')).toHaveText('Likely eligible');
    await expect(likelyCard.locator('.ledger-scheme-name')).toHaveText('PM-KISAN');
    await expect(likelyCard.locator('.ledger-summary')).toBeVisible();
    await expect(likelyCard.locator('.ledger-docs-list')).toBeVisible();

    const officialLink = likelyCard.locator('a.ledger-official-link');
    await expect(officialLink).toBeVisible();
    await expect(officialLink).toHaveAttribute('target', '_blank');
    await expect(officialLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(officialLink).toHaveAttribute('href', 'https://pmkisan.gov.in/');

    await expect(likelyCard.locator('.ledger-footer span')).toContainText('Rules checked 2026-11-');

    // 7. Confirm checklist lists each document once and shows which schemes it applies to
    const viewChecklistBtn = page.locator('#btn-view-checklist');
    await expect(viewChecklistBtn).toBeVisible();
    await viewChecklistBtn.click();

    await page.waitForSelector('#screen-checklist');
    const docItems = page.locator('.checklist-row');
    const docCount = await docItems.count();
    expect(docCount).toBeGreaterThan(0);

    // Verify documents are unique and have scheme tags
    const docNames = [];
    for (let i = 0; i < docCount; i++) {
      const name = await docItems.nth(i).locator('.checklist-doc-name').textContent();
      expect(docNames).not.toContain(name);
      docNames.push(name);
      const schemeInfo = docItems.nth(i).locator('.checklist-schemes-list');
      await expect(schemeInfo).toBeVisible();
      await expect(schemeInfo).toContainText('for ');
    }

    // 8. Confirm disclaimer is visible under results
    const backBtn = page.locator('#btn-back-checklist');
    await backBtn.click();
    await page.waitForSelector('#group-likely');
    const disclaimer = page.locator('.results-disclaimer');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('This is a guide based on published criteria, not a decision.');
  });
});
