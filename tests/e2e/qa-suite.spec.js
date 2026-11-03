import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../../qa/screenshots');
const TRACE_DIR = path.resolve(__dirname, '../../qa/traces');

test.describe('Haqdar QA Full Suite (Flows B to K & Non-Functional)', () => {
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

  // FLOW B: Required fields and Continue
  test('Flow B: Required fields and Continue behaviour', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForSelector('#progress-step-text');

    // 1. Continue disabled when unanswered, missing line visible
    const continueBtn = page.locator('#btn-continue');
    await expect(continueBtn).toBeDisabled();
    const missingMsg = page.locator('#missing-field-msg');
    await expect(missingMsg).toBeVisible();
    await expect(missingMsg).toContainText('Please answer all questions above to continue');

    // 4. "Not sure" must not be offered on age_band and state (FR-2)
    const ageBandNotSure = page.locator('input[name="age_band"][value="not_sure"]');
    await expect(ageBandNotSure).toHaveCount(0);
    const stateNotSure = page.locator('#state option[value="not_sure"]');
    await expect(stateNotSure).toHaveCount(0);

    // 2. Select age and gender, state still unselected -> continue still disabled
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await expect(continueBtn).toBeDisabled();

    // Select state -> continue enables, missing message hides
    await page.selectOption('#state', 'Punjab');
    await expect(continueBtn).toBeEnabled();
    await expect(missingMsg).toBeHidden();

    // Verify "Not sure" toggle on and off on radio questions (unchecking behaviour)
    await page.click('label[for="gender_not_sure"]');
    await expect(page.locator('#gender_not_sure')).toBeChecked();
    // Clicking "Not sure" a second time unchecks it and clears the answer
    await page.click('label[for="gender_not_sure"]');
    await expect(page.locator('#gender_not_sure')).not.toBeChecked();
    await expect(continueBtn).toBeDisabled();
    await expect(missingMsg).toBeVisible();
    // Re-selecting female restores valid selection
    await page.click('label[for="gender_female"]');
    await expect(page.locator('#gender_female')).toBeChecked();
    await expect(continueBtn).toBeEnabled();
    await expect(missingMsg).toBeHidden();

    // Advance to Step 2
    await continueBtn.click();
    await expect(page.locator('#progress-step-text')).toHaveText('Step 2 of 4');

    // Verify "Not sure" toggle on and off on stepper (family_size)
    const stepperVal = page.locator('.stepper-value');
    const plusBtn = page.locator('.stepper-btn:has-text("+")');
    const notSureFamilyLabel = page.locator('label[for="family_size_not_sure"]');
    const notSureFamilyInput = page.locator('#family_size_not_sure');
    // Increase to 2
    await plusBtn.click();
    await expect(stepperVal).toHaveText('2');
    // Click "Not sure" on family size
    await notSureFamilyLabel.click();
    await expect(notSureFamilyInput).toBeChecked();
    await expect(stepperVal).toHaveText('—');
    await expect(plusBtn).toBeDisabled();
    // Click "Not sure" again to uncheck -> restores previous count (2) and re-enables buttons
    await notSureFamilyLabel.click();
    await expect(notSureFamilyInput).not.toBeChecked();
    await expect(stepperVal).toHaveText('2');
    await expect(plusBtn).toBeEnabled();

    // 3. Select "Not sure" on allowed fields (caste and income)
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_not_sure"]');
    await page.click('label[for="income_not_sure"]');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Step 3: Land and work - set occupation farmer and land not_sure
    await expect(page.locator('#progress-step-text')).toHaveText('Step 3 of 4');
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_not_sure"]');
    await continueBtn.click();

    // Review
    await page.waitForSelector('.landing-headline');
    await page.click('#btn-view-results');
    await page.waitForSelector('#group-check');

    // PM-KISAN depends on land: "yes", which is not_sure -> must be in Check the official page (NEEDS_CHECK), NOT Not eligible
    const checkGroup = page.locator('#group-check');
    await expect(checkGroup).toContainText('PM-KISAN');
    const ineligibleGroup = page.locator('#group-ineligible');
    await expect(ineligibleGroup).not.toContainText('PM-KISAN');
  });

  // FLOW C: Back, Edit, and state
  test('Flow C: Back, Edit, and state management', async ({ page }) => {
    await page.click('#btn-start');

    // Answer Group 1
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Punjab');
    await page.click('#btn-continue');

    // Answer Group 2
    await page.click('label[for="area_rural"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_250000"]');
    await page.click('#btn-continue');

    // Answer Group 3
    await page.click('label[for="occupation_farmer"]');
    await page.click('label[for="land_yes"]');

    // 1. Press Back twice
    await page.click('#btn-back'); // Back to Group 2
    await expect(page.locator('#progress-step-text')).toHaveText('Step 2 of 4');
    await expect(page.locator('#area_rural')).toBeChecked();
    await expect(page.locator('#income_250000')).toBeChecked();

    await page.click('#btn-back'); // Back to Group 1
    await expect(page.locator('#progress-step-text')).toHaveText('Step 1 of 4');
    await expect(page.locator('#age_band_18_to_59')).toBeChecked();
    await expect(page.locator('#gender_female')).toBeChecked();
    await expect(page.locator('#state')).toHaveValue('Punjab');

    // Forward to Review
    await page.click('#btn-continue'); // To Group 2
    await page.click('#btn-continue'); // To Group 3
    await page.click('#btn-continue'); // To Review

    // 2. Click Edit on occupation (change farmer to salaried)
    const editOccupationBtn = page.locator('.review-row:has-text("What is your primary occupation group?") .review-edit-btn');
    await editOccupationBtn.click();
    await expect(page.locator('#progress-step-text')).toHaveText('Step 3 of 4');
    await page.click('label[for="occupation_salaried"]');
    await page.click('#btn-continue');

    // Review reflects changed value
    await expect(page.locator('.review-list')).toContainText('Salaried employee');
    await page.click('#btn-view-results');

    // 3. Confirm PM-KISAN flipped to Not eligible (condition not met: occupation must be farmer)
    await page.waitForSelector('#group-ineligible');
    await page.click('#btn-toggle-ineligible');
    await expect(page.locator('#ineligible-entries')).toContainText('PM-KISAN');
    await expect(page.locator('#group-likely')).not.toContainText('PM-KISAN');

    // 4. Start over clears everything
    await page.click('#btn-start-over');
    await page.waitForSelector('.landing-headline');
    const storageLen = await page.evaluate(() => sessionStorage.length);
    expect(storageLen).toBe(0);
  });

  // FLOW D: Keyboard-only path
  test('Flow D: Keyboard-only path through all screens', async ({ page }) => {
    // Start page: tab to brand and Start button
    await page.keyboard.press('Tab'); // focus wordmark
    await page.keyboard.press('Tab'); // focus Start button
    await expect(page.locator('#btn-start')).toBeFocused();
    await page.keyboard.press('Enter');

    // Group 1: age_band radio group
    await page.keyboard.press('Tab'); // focus first option (under_18)
    await page.keyboard.press('ArrowDown'); // move to 18_to_59
    await page.keyboard.press('Space'); // select 18_to_59
    await expect(page.locator('#age_band_18_to_59')).toBeChecked();

    // Tab to gender
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // select female (first option)
    await expect(page.locator('#gender_female')).toBeChecked();

    // Tab to state select
    await page.keyboard.press('Tab');
    await page.selectOption('#state', 'Punjab');
    await expect(page.locator('#state')).toHaveValue('Punjab');

    // Tab to Continue
    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-continue')).toBeFocused();
    await page.keyboard.press('Enter');

    // Group 2
    await page.focus('#area_rural');
    await page.keyboard.press('Space');
    await page.focus('#caste_General');
    await page.keyboard.press('Space');
    await page.focus('#income_250000');
    await page.keyboard.press('Space');
    await page.focus('#btn-continue');
    await page.keyboard.press('Enter');

    // Group 3
    await page.focus('#occupation_farmer');
    await page.keyboard.press('Space');
    await page.focus('#land_yes');
    await page.keyboard.press('Space');
    await page.focus('#btn-continue');
    await page.keyboard.press('Enter');

    // Review: Tab/Focus View results button and press Enter
    await page.waitForSelector('#btn-view-results');
    await page.focus('#btn-view-results');
    await expect(page.locator('#btn-view-results')).toBeFocused();
    await page.keyboard.press('Enter');

    // Results: Tab to view checklist button
    await page.waitForSelector('#btn-view-checklist');
    await page.focus('#btn-view-checklist');
    await expect(page.locator('#btn-view-checklist')).toBeFocused();
    await page.keyboard.press('Enter');

    // Checklist: Focus first checklist row and toggle with Space
    await page.waitForSelector('.checklist-row');
    const firstRow = page.locator('.checklist-row').first();
    await firstRow.focus();
    await expect(firstRow).toBeFocused();
    await expect(firstRow).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(firstRow).toHaveAttribute('aria-checked', 'true');
  });

  // FLOW E: Rapid clicks, double click & print
  test('Flow E: Rapid and repeated clicks and print stubbing', async ({ page }) => {
    // Stub window.print
    await page.evaluate(() => {
      window.printCalled = false;
      window.print = () => {
        window.printCalled = true;
      };
    });

    // Rapid double click on Start
    await page.dblclick('#btn-start');
    await expect(page.locator('#progress-step-text')).toHaveText('Step 1 of 4');

    // Rapid Back and Start
    for (let i = 0; i < 5; i++) {
      await page.click('#btn-back');
      await page.click('#btn-start');
    }
    await expect(page.locator('#progress-step-text')).toHaveText('Step 1 of 4');

    // Complete questionnaire to reach checklist
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
    await page.click('#btn-view-checklist');

    // Toggle checkbox 20 times rapidly
    const firstRow = page.locator('.checklist-row').first();
    for (let i = 0; i < 20; i++) {
      await firstRow.click();
    }
    // Even number of clicks -> unchecked
    await expect(firstRow).toHaveAttribute('aria-checked', 'false');

    // Click 1 more time -> checked
    await firstRow.click();
    await expect(firstRow).toHaveAttribute('aria-checked', 'true');

    // Verify sessionStorage persisted the checklist state
    const savedChecklist = await page.evaluate(() => JSON.parse(sessionStorage.getItem('haqdar_checklist') || '{}'));
    expect(Object.values(savedChecklist)).toContain(true);

    // Click Print button and verify stub
    await page.evaluate(() => {
      window.printCalled = false;
      window.print = () => {
        window.printCalled = true;
      };
    });
    await page.click('#btn-print-checklist');
    const wasCalled = await page.evaluate(() => window.printCalled);
    expect(wasCalled).toBe(true);
  });

  // FLOW F: Reload and tabs isolation
  test('Flow F: Reload mid-flow and sessionStorage tab isolation', async ({ browser, page }) => {
    await page.click('#btn-start');
    await page.click('label[for="age_band_18_to_59"]');
    await page.click('label[for="gender_female"]');
    await page.selectOption('#state', 'Punjab');
    await page.click('#btn-continue');

    // Reload tab 1
    await page.reload();
    // Mid-flow reload restores saved answers in inputs
    await expect(page.locator('#age_band_18_to_59')).toBeChecked();
    await expect(page.locator('#gender_female')).toBeChecked();
    await expect(page.locator('#state')).toHaveValue('Punjab');

    // Open second tab in same origin
    const context = page.context();
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000');
    // Second tab must start fresh on Landing screen
    await expect(page2.locator('.landing-headline')).toBeVisible();
    const page2Progress = page2.locator('#progress-container');
    await expect(page2Progress).toBeHidden();
    await page2.close();
  });

  // FLOW G: Edge and failure cases
  test('Flow G: Edge cases, stale dates, offline and XSS resistance', async ({ page }) => {
    // 1. Profile matching nothing -> Empty results card
    await page.click('#btn-start');
    await page.click('label[for="age_band_under_18"]');
    await page.click('label[for="gender_male"]');
    await page.selectOption('#state', 'Goa');
    await page.click('#btn-continue');
    await page.click('label[for="area_urban"]');
    await page.click('label[for="caste_General"]');
    await page.click('label[for="income_1500000"]');
    await page.click('#btn-continue');
    await page.click('label[for="occupation_salaried"]');
    await page.click('label[for="land_no"]');
    await page.click('#btn-continue');
    await page.click('#btn-view-results');

    const emptyCard = page.locator('.empty-results-card');
    await expect(emptyCard).toBeVisible();
    await expect(emptyCard).toContainText('We did not find a scheme that matches these answers');
    await expect(emptyCard.locator('a[href="https://www.myscheme.gov.in/"]')).toBeVisible();

    // 2. Stale date fixture injection
    await page.click('#btn-start-over');
    await page.route('**/data/schemes.json', async (route) => {
      const fixturePath = path.resolve(__dirname, '../../qa/fixtures/stale-scheme.json');
      const staleData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(staleData),
      });
    });

    await page.reload();
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

    // Confirm stale note appears
    const staleNote = page.locator('.ledger-stale-note');
    await expect(staleNote).toBeVisible();
    await expect(staleNote).toContainText('Rules last checked 2024-01-01. Confirm on the official page.');

    // 3. Failed rules fetch
    await page.click('#btn-start-over');
    await page.unroute('**/data/schemes.json');
    await page.route('**/data/schemes.json', (route) => route.abort());
    await page.reload();
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
    await expect(page.locator('.ledger-failing-condition')).toContainText(
      'We could not load the scheme rules'
    );

    // 4. XSS injection via fixture
    await page.click('#btn-start-over');
    const xssData = [
      {
        id: 'xss-test',
        name: '<img src=x onerror="window.xssFired=true">',
        body: 'Security Dept',
        official_url: 'https://security.gov.in',
        last_verified: '2026-11-02',
        summary: '<script>window.xssFired=true</script>',
        criteria: [{ field: 'age_band', op: 'equals', value: '18_to_59' }],
        documents: ['<b onmouseover="window.xssFired=true">Doc</b>'],
      },
    ];
    await page.unroute('**/data/schemes.json');
    await page.route('**/data/schemes.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(xssData),
      })
    );
    await page.reload();
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
    const xssFired = await page.evaluate(() => window.xssFired);
    expect(xssFired).toBeUndefined();
    await expect(page.locator('.ledger-scheme-name')).toHaveText('<img src=x onerror="window.xssFired=true">');
  });

  // FLOW H: Network and privacy
  test('Flow H: Network requests strictly isolated and zero tracking', async ({ page }) => {
    const thirdPartyRequests = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (
        url.hostname !== 'localhost' &&
        url.hostname !== '127.0.0.1' &&
        url.hostname !== 'fonts.googleapis.com' &&
        url.hostname !== 'fonts.gstatic.com'
      ) {
        thirdPartyRequests.push(url.href);
      }
    });

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

    // Confirm no third party requests
    expect(thirdPartyRequests).toEqual([]);

    // Confirm zero cookies
    const cookies = await page.context().cookies();
    expect(cookies.length).toBe(0);

    // Confirm localStorage is empty
    const localLen = await page.evaluate(() => localStorage.length);
    expect(localLen).toBe(0);
  });

  // FLOW I: Visual and responsive checks
  test('Flow I: Responsive layout, typography sizes, touch targets and screenshots', async ({ page }) => {
    // 1. Landing screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/landing-${page.viewportSize()?.width}px.png`, fullPage: true });

    // Confirm no horizontal scroll
    const isScrollX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isScrollX).toBe(false);

    // Confirm touch target height >= 44px
    const startBtnBox = await page.locator('#btn-start').boundingBox();
    expect(startBtnBox?.height).toBeGreaterThanOrEqual(44);

    // Headline font size
    const headlineFontSize = await page.locator('.landing-headline').evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    const viewportWidth = page.viewportSize()?.width || 0;
    if (viewportWidth <= 640) {
      // 2.5rem = 40px at 16px root
      expect(headlineFontSize).toBeCloseTo(40, -1);
    } else {
      // 3.25rem = 52px at 16px root
      expect(headlineFontSize).toBeCloseTo(52, -1);
    }

    // Advance to question
    await page.click('#btn-start');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/question-${viewportWidth}px.png`, fullPage: true });

    // Option row touch targets >= 44px
    const optionBox = await page.locator('.option-row').first().boundingBox();
    expect(optionBox?.height).toBeGreaterThanOrEqual(44);

    // Answer questions to review
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

    // Review screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/review-${viewportWidth}px.png`, fullPage: true });

    // Results screenshot
    await page.click('#btn-view-results');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/results-${viewportWidth}px.png`, fullPage: true });

    // Checklist screenshot
    await page.click('#btn-view-checklist');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/checklist-${viewportWidth}px.png`, fullPage: true });

    // Checkbox touch target >= 44px
    const checkboxBox = await page.locator('.checklist-row').first().boundingBox();
    expect(checkboxBox?.height).toBeGreaterThanOrEqual(44);
  });

  // FLOW J: Accessibility audits (WCAG 2.2 AA)
  test('Flow J: Axe audits on all screens with zero serious or critical violations', async ({ page }) => {
    // Landing
    let axe = await new AxeBuilder({ page }).analyze();
    let severeViolations = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(severeViolations).toEqual([]);

    // Question
    await page.click('#btn-start');
    await page.waitForTimeout(300);
    axe = await new AxeBuilder({ page }).analyze();
    severeViolations = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(severeViolations).toEqual([]);

    // Confirm fieldset and legend
    const fieldset = page.locator('fieldset.question-fieldset');
    await expect(fieldset.first()).toBeVisible();
    await expect(fieldset.first().locator('legend.question-legend')).toBeVisible();

    // Confirm progress live region
    await expect(page.locator('#progress-step-text')).toHaveAttribute('aria-live', 'polite');

    // Answer to review
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

    // Review
    await page.waitForTimeout(300);
    axe = await new AxeBuilder({ page }).analyze();
    severeViolations = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(severeViolations).toEqual([]);

    // Results
    await page.click('#btn-view-results');
    await page.waitForTimeout(700);
    axe = await new AxeBuilder({ page }).analyze();
    severeViolations = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(severeViolations).toEqual([]);

    // Results headings real h2 and ledger articles
    await expect(page.locator('#group-likely h2')).toBeVisible();
    await expect(page.locator('article.ledger-entry').first()).toBeVisible();

    // Checklist
    await page.click('#btn-view-checklist');
    await page.waitForTimeout(300);
    axe = await new AxeBuilder({ page }).analyze();
    severeViolations = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(severeViolations).toEqual([]);
  });
});
