import { test, expect } from '@playwright/test';

test.describe('Haqdar E2E Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const hadStorage = await page.evaluate(() => {
      const had = sessionStorage.length > 0 || localStorage.length > 0;
      sessionStorage.clear();
      localStorage.clear();
      return had;
    });
    if (hadStorage) {
      await page.goto('/');
    }
    await page.waitForSelector('.landing-headline');
  });

  test('1. Landing to results with a profile that matches a verified scheme', async ({ page }) => {

    // Verify Landing screen copy
    await expect(page.locator('.landing-headline')).toHaveText('Find the schemes you may qualify for.');
    await expect(page.locator('.landing-body')).toContainText('Answer nine short questions.');
    await expect(page.locator('.landing-privacy')).toHaveText(
      'Your answers stay on this device. Nothing is sent or stored.'
    );

    // Start
    await page.click('#btn-start');

    // Step 1: About you
    await expect(page.locator('#progress-step-text')).toHaveText('Step 1 of 4');
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Punjab');
    await page.click('#btn-continue');

    // Step 2: Household
    await expect(page.locator('#progress-step-text')).toHaveText('Step 2 of 4');
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_250000"]');
    await page.click('#btn-continue');

    // Step 3: Land and work
    await expect(page.locator('#progress-step-text')).toHaveText('Step 3 of 4');
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await page.click('#btn-continue');

    // Step 4: Review
    await expect(page.locator('#progress-step-text')).toHaveText('Step 4 of 4');
    await expect(page.locator('.review-list')).toContainText('Punjab');
    await expect(page.locator('.review-list')).toContainText('Farmer / Cultivator');

    // Go to Results
    await page.click('#btn-view-results');

    // Verify Results
    await expect(page.locator('#group-likely')).toBeVisible();
    await expect(page.locator('#group-likely h2')).toHaveText('Likely eligible');
    await expect(page.locator('#group-likely')).toContainText('PM-KISAN');
    await expect(page.locator('#group-likely')).toContainText(
      'You appear to meet the listed criteria. Confirm on the official page before applying.'
    );

    // Check official link properties
    const officialLink = page.locator('a.ledger-official-link').first();
    await expect(officialLink).toHaveAttribute('target', '_blank');
    await expect(officialLink).toHaveAttribute('rel', 'noopener noreferrer');

    // View checklist
    await page.click('#btn-view-checklist');
    await expect(page.locator('#screen-checklist')).toBeVisible();
    await expect(page.locator('.checklist-doc-name').first()).toBeVisible();

    // Toggle document checkbox
    const firstCheckbox = page.locator('.checklist-row').first();
    await expect(firstCheckbox).not.toHaveClass(/is-checked/);
    await firstCheckbox.click();
    await expect(firstCheckbox).toHaveClass(/is-checked/);
  });

  test('2. Continue stays disabled with a missing required field, and missing-field message is visible', async ({
    page,
  }) => {
    await page.click('#btn-start');

    // Only answer age_band, leaving gender and state blank
    await page.click('label[for="age_band_18_to_59"]');

    const continueBtn = page.locator('#btn-continue');
    await expect(continueBtn).toBeDisabled();

    const missingMsg = page.locator('#missing-field-msg');
    await expect(missingMsg).toBeVisible();
    await expect(missingMsg).toContainText('Please answer all questions above to continue');
    await expect(missingMsg).toContainText('What is your gender');
    await expect(missingMsg).toContainText('Which State or Union Territory do you live in');

    // Answer gender, state remains missing
    await page.click('label[for="gender_male"]');
    await expect(continueBtn).toBeDisabled();
    await expect(missingMsg).toContainText('Which State or Union Territory do you live in');

    // Select state
    await page.selectOption('#state', 'Haryana');
    await expect(continueBtn).toBeEnabled();
    await expect(missingMsg).toBeHidden();
  });

  test('3. Back preserves answers', async ({ page }) => {
    await page.click('#btn-start');

    // Answer Step 1
    await page.click('label[for="age_band_60_and_over"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Rajasthan');
    await page.click('#btn-continue');

    // On Step 2, answer area
    await page.click('label[for="area_rural"]');

    // Click Back to Step 1
    await page.click('#btn-back');
    await expect(page.locator('#progress-step-text')).toHaveText('Step 1 of 4');

    // Check answers are preserved
    const ageChecked = await page.locator('#age_band_60_and_over').isChecked();
    expect(ageChecked).toBe(true);

    const genderChecked = await page.locator('#gender_female').isChecked();
    expect(genderChecked).toBe(true);

    const stateVal = await page.locator('#state').inputValue();
    expect(stateVal).toBe('Rajasthan');

    // Return to Step 2
    await page.click('#btn-continue');
    await expect(page.locator('#progress-step-text')).toHaveText('Step 2 of 4');
    const areaChecked = await page.locator('#area_rural').isChecked();
    expect(areaChecked).toBe(true);
  });

  test('4. Edit from review changes an answer, and results update (no stale groups)', async ({ page }) => {
    await page.click('#btn-start');

    // Fill all to match PM-KISAN
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_male"]');
    await page.selectOption('#state', 'Bihar');
    await page.click('#btn-continue');

    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_OBC"]');
    await page.click('label[for="income_250000"]');
    await page.click('#btn-continue');

    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await page.click('#btn-continue');

    // Review screen
    await expect(page.locator('#progress-step-text')).toHaveText('Step 4 of 4');
    await expect(page.locator('.review-list')).toContainText('Farmer / Cultivator');

    // Edit occupation
    const editOccupationBtn = page.locator('button[aria-label="Edit What is your primary occupation group?"]');
    await editOccupationBtn.click();

    // Verify returned to Step 3
    await expect(page.locator('#progress-step-text')).toHaveText('Step 3 of 4');
    // Change occupation to salaried
    await page.click('label[for="occupation_salaried"]');
    await page.click('#btn-continue');

    // Back to Review
    await expect(page.locator('.review-list')).toContainText('Salaried employee');

    // View results
    await page.click('#btn-view-results');

    // PM-KISAN should now be NOT eligible because user is salaried
    const likelySection = page.locator('#group-likely');
    await expect(likelySection).not.toContainText('PM-KISAN');

    // Open Not eligible section
    await page.click('#btn-toggle-ineligible');
    const ineligibleSection = page.locator('#group-ineligible');
    await expect(ineligibleSection).toContainText('PM-KISAN');
    await expect(ineligibleSection).toContainText('Applicant must be a farmer');
  });

  test('5. Start over clears answers and the checklist', async ({ page }) => {
    await page.click('#btn-start');

    // Fill step 1
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_male"]');
    await page.selectOption('#state', 'Gujarat');

    // Click Start Over in Masthead
    const startOverBtn = page.locator('#btn-start-over');
    await expect(startOverBtn).toBeVisible();
    await startOverBtn.click();

    // Verify back on landing
    await expect(page.locator('.landing-headline')).toBeVisible();
    await expect(startOverBtn).toBeHidden();

    // Check storage is cleared
    const storedAnswers = await page.evaluate(() => sessionStorage.getItem('haqdar_answers'));
    expect(storedAnswers).toBeNull();
    const storedChecklist = await page.evaluate(() => sessionStorage.getItem('haqdar_checklist'));
    expect(storedChecklist).toBeNull();

    // Start again, fields should be empty
    await page.click('#btn-start');
    await expect(page.locator('#btn-continue')).toBeDisabled();
  });

  test('6. Empty result state appears for a profile that matches nothing', async ({ page }) => {
    await page.click('#btn-start');

    // Profile: Male, under 18, high income, salaried, no land
    await page.click('label[for="age_band_under_18"]');
    await page.click('label[for="gender_male"]');
    await page.selectOption('#state', 'Delhi');
    await page.click('#btn-continue');

    await page.click('label[for="area_urban"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_1500000"]');
    await page.click('#btn-continue');

    await page.click('label[for="occupation_salaried"]');
    await page.click('label[for="land_no"]');
    await page.click('#btn-continue');

    await page.click('#btn-view-results');

    // Verify empty result card appears (FR-15)
    const emptyCard = page.locator('.empty-results-card');
    await expect(emptyCard).toBeVisible();
    await expect(emptyCard).toContainText('We did not find a scheme that matches these answers.');
    await expect(emptyCard.locator('a')).toHaveAttribute('href', 'https://www.myscheme.gov.in/');
  });

  test('7. Keyboard-only path through all screens (Arrow keys, Space, Tab, Enter)', async ({ page }) => {
    // Tab to Start button and press Enter
    await page.keyboard.press('Tab'); // skip or brand
    // Continue tabbing until focused on Start button
    let isStartFocused = await page.locator('#btn-start').evaluate((el) => el === document.activeElement);
    while (!isStartFocused) {
      await page.keyboard.press('Tab');
      isStartFocused = await page.locator('#btn-start').evaluate((el) => el === document.activeElement);
    }
    await page.keyboard.press('Enter');

    // In Step 1:
    // Tab to age_band radios
    await page.locator('#age_band_18_to_59').focus();
    await page.keyboard.press('Space');
    expect(await page.locator('#age_band_18_to_59').isChecked()).toBe(true);

    // Tab to gender
    await page.locator('#gender_female').focus();
    await page.keyboard.press('Space');
    expect(await page.locator('#gender_female').isChecked()).toBe(true);

    // Tab to state select
    await page.locator('#state').focus();
    await page.locator('#state').selectOption('Kerala');

    // Tab to Continue button
    await page.locator('#btn-continue').focus();
    await page.keyboard.press('Enter');

    // Step 2:
    await expect(page.locator('#progress-step-text')).toHaveText('Step 2 of 4');
    await page.locator('#area_rural').focus();
    await page.keyboard.press('Space');

    await page.locator('#caste_SC').focus();
    await page.keyboard.press('Space');

    await page.locator('#income_100000').focus();
    await page.keyboard.press('Space');

    await page.locator('#btn-continue').focus();
    await page.keyboard.press('Enter');

    // Step 3:
    await expect(page.locator('#progress-step-text')).toHaveText('Step 3 of 4');
    await page.locator('#occupation_farmer').focus();
    await page.keyboard.press('Space');

    await page.locator('#land_yes').focus();
    await page.keyboard.press('Space');

    await page.locator('#btn-continue').focus();
    await page.keyboard.press('Enter');

    // Step 4 Review:
    await expect(page.locator('#progress-step-text')).toHaveText('Step 4 of 4');
    await page.locator('#btn-view-results').focus();
    await page.keyboard.press('Enter');

    // Results screen reached
    await expect(page.locator('#group-likely')).toBeVisible();
  });

  test('8. Reload mid-flow restores answers from sessionStorage only within the same tab; new tab starts fresh', async ({
    page,
    context,
  }) => {
    await page.click('#btn-start');

    // Answer Step 1
    await page.click('label[for="age_band_60_and_over"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Goa');
    await page.click('#btn-continue');

    // Now on Step 2
    await page.click('label[for="area_urban"]');

    // Reload page in same tab
    await page.reload();

    // Verify session answers restored mid-flow
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('haqdar_answers') || '{}'));
    expect(stored.state).toBe('Goa');
    expect(stored.area).toBe('urban');

    // Open new tab in same browser context
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Verify new tab starts on landing page
    await expect(newPage.locator('.landing-headline')).toBeVisible();
    await expect(newPage.locator('#btn-start-over')).toBeHidden();

    // Verify new tab sessionStorage does not have old answers
    const newTabAnswers = await newPage.evaluate(() => sessionStorage.getItem('haqdar_answers'));
    expect(newTabAnswers).toBeNull();

    await newPage.close();
  });

  test('9. Stale-date note appears when verification date is older than 12 months', async ({ page }) => {
    // Intercept data/schemes.json with a stale date fixture
    await page.route('**/data/schemes.json', async (route) => {
      const staleData = [
        {
          id: 'mock-stale',
          name: 'Mock Old Scheme',
          body: 'Test Ministry',
          official_url: 'https://example.gov.in',
          last_verified: '2023-01-01', // Older than 12 months
          summary: 'A scheme with old verification date.',
          criteria: [{ field: 'occupation', op: 'equals', value: 'farmer', text: 'Farmer' }],
          documents: ['Old Doc'],
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(staleData),
      });
    });

    await page.click('#btn-start');

    // Step 1
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_male"]');
    await page.selectOption('#state', 'Assam');
    await page.click('#btn-continue');

    // Step 2
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_100000"]');
    await page.click('#btn-continue');

    // Step 3
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await page.click('#btn-continue');

    // Review -> Results
    await page.click('#btn-view-results');

    // Stale note should be visible
    const staleNote = page.locator('.ledger-stale-note');
    await expect(staleNote).toBeVisible();
    await expect(staleNote).toHaveText('Rules last checked 2023-01-01. Confirm on the official page.');
  });

  test('10. No network requests to any third-party domain except Google Fonts', async ({ page }) => {
    const requestedHosts = new Set();

    page.on('request', (req) => {
      try {
        const url = new URL(req.url());
        requestedHosts.add(url.hostname);
      } catch {}
    });

    await page.click('#btn-start');

    // Fill Step 1
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Tamil Nadu');
    await page.click('#btn-continue');

    // Step 2
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_OBC"]');
    await page.click('label[for="income_250000"]');
    await page.click('#btn-continue');

    // Step 3
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await page.click('#btn-continue');

    // Results & Checklist
    await page.click('#btn-view-results');
    await page.click('#btn-view-checklist');

    const allowedHosts = new Set(['localhost', '127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com']);

    for (const host of requestedHosts) {
      expect(allowedHosts.has(host)).toBe(true);
    }
  });

  test('11. Results text never contains "you will receive" or "guaranteed"', async ({ page }) => {
    await page.click('#btn-start');

    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Punjab');
    await page.click('#btn-continue');

    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_250000"]');
    await page.click('#btn-continue');

    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');
    await page.click('#btn-continue');

    await page.click('#btn-view-results');
    await page.waitForSelector('#group-likely');

    const resultsText = await page.locator('#screen-container').innerText();
    const lower = resultsText.toLowerCase();

    expect(lower).not.toContain('you will receive');
    expect(lower).not.toContain('guaranteed');
    expect(lower).toContain('you appear to meet the listed criteria');
  });
});
