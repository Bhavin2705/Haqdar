/**
 * @file app.js
 * Screen state machine, navigation, and DOM rendering for Haqdar.
 * Adheres strictly to PRD.md and DESIGN.md.
 */

import { QUESTION_GROUPS, QUESTION_MAP, ALL_QUESTIONS } from './questions.js';
import { getAnswers, saveAnswer, removeAnswer, saveAnswers, getChecklistState, saveChecklistDocument, clear as clearStore } from './store.js';
import { evaluateSchemes, STATUS } from './rules.js';
import { el, clearChildren } from './render.js';

// Application state
const state = {
  currentScreen: 'landing', // 'landing' | 'question_group' | 'review' | 'results' | 'checklist'
  currentGroupIndex: 0,
  schemes: [],
  evaluatedResults: [],
  loadError: null,
};

// Cached DOM containers
const screenContainer = document.getElementById('screen-container');
const progressContainer = document.getElementById('progress-container');
const progressStepText = document.getElementById('progress-step-text');
const progressStepTitle = document.getElementById('progress-step-title');
const progressFill = document.getElementById('progress-fill');
const progressBarRole = document.getElementById('progress-bar-role');
const startOverBtn = document.getElementById('btn-start-over');
const brandWordmark = document.getElementById('brand-wordmark');

/**
 * Loads schemes from data/schemes.json once.
 *
 * @returns {Promise<Array<object>>} Loaded schemes.
 */
async function loadSchemes() {
  if (state.schemes.length > 0) {
    return state.schemes;
  }
  try {
    const res = await fetch('data/schemes.json');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    state.schemes = Array.isArray(data) ? data : [];
    return state.schemes;
  } catch (err) {
    state.loadError = 'We could not load the scheme rules. Refresh the page or try again later.';
    return [];
  }
}

/**
 * Updates the masthead and progress bar according to active screen.
 */
function updateProgress() {
  if (state.currentScreen === 'landing') {
    progressContainer.hidden = true;
    startOverBtn.hidden = true;
    return;
  }

  // Once started, Start Over button is visible
  startOverBtn.hidden = false;

  if (state.currentScreen === 'question_group') {
    progressContainer.hidden = false;
    const stepNum = state.currentGroupIndex + 1;
    const group = QUESTION_GROUPS[state.currentGroupIndex];
    progressStepText.textContent = `Step ${stepNum} of 4`;
    progressStepTitle.textContent = group.title;
    progressBarRole.setAttribute('aria-valuenow', String(stepNum));
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${(stepNum / 4) * 100}%`;
  } else if (state.currentScreen === 'review') {
    progressContainer.hidden = false;
    progressStepText.textContent = 'Step 4 of 4';
    progressStepTitle.textContent = 'Review';
    progressBarRole.setAttribute('aria-valuenow', '4');
    progressFill.className = 'progress-fill step-accent';
    progressFill.style.width = '100%';
  } else {
    // results or checklist screens
    progressContainer.hidden = true;
  }
}

/**
 * Finds missing required questions in the given group.
 *
 * @param {object} group - Question group.
 * @param {Record<string, *>} answers - Current answers.
 * @returns {Array<object>} List of unanswered questions.
 */
function getMissingQuestions(group, answers) {
  const missing = [];
  for (const q of group.questions) {
    const val = answers[q.id];
    if (val === undefined || val === null || val === '') {
      missing.push(q);
    }
  }
  return missing;
}

/**
 * Formats an answer value for display on the review screen.
 *
 * @param {string} questionId - Question ID.
 * @param {*} value - Answer value.
 * @returns {string} Human-friendly display string.
 */
function formatAnswerDisplay(questionId, value) {
  if (value === undefined || value === null || value === '') {
    return 'Not answered';
  }
  if (value === 'not_sure') {
    return 'Not sure';
  }
  if (value === 'prefer_not_to_say') {
    return 'Prefer not to say';
  }

  const q = QUESTION_MAP.get(questionId);
  if (!q) {
    return String(value);
  }

  if (q.type === 'radio' && Array.isArray(q.options)) {
    const matched = q.options.find((opt) => String(opt.value) === String(value));
    if (matched) return matched.label;
  }
  if (q.type === 'stepper') {
    return `${value} ${value === 1 ? 'member' : 'members'}`;
  }
  return String(value);
}

// ---------------- Screen: Landing ---------------- //
function renderLanding() {
  clearChildren(screenContainer);

  const headline = el('h1', { className: 'landing-headline' }, 'Find the schemes you may qualify for.');
  const bodyText = el(
    'p',
    { className: 'landing-body' },
    'Answer nine short questions. Get the schemes, the documents to bring, and the official link for each.'
  );
  const privacyLine = el(
    'p',
    { className: 'landing-privacy' },
    'Your answers stay on this device. Nothing is sent or stored.'
  );

  const startBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-continue',
      id: 'btn-start',
      onClick: () => {
        state.currentScreen = 'question_group';
        state.currentGroupIndex = 0;
        renderCurrentScreen();
      },
    },
    'Start'
  );

  const heroSection = el('section', { className: 'landing-hero' }, headline, bodyText, privacyLine, startBtn);

  // How it works
  const howTitle = el('h2', { className: 'how-it-works-title' }, 'How it works');
  const step1 = el('li', { className: 'how-it-works-item' }, 'Answer a few questions about your family and work.');
  const step2 = el('li', { className: 'how-it-works-item' }, 'See which central schemes match your profile.');
  const step3 = el('li', { className: 'how-it-works-item' }, 'Get a printable list of the documents you will need.');
  const howList = el('ol', { className: 'how-it-works-list' }, step1, step2, step3);
  const howSection = el('section', { className: 'how-it-works' }, howTitle, howList);

  screenContainer.appendChild(heroSection);
  screenContainer.appendChild(howSection);
}

// ---------------- Screen: Question Group ---------------- //
function renderQuestionGroup(groupIndex) {
  clearChildren(screenContainer);
  const group = QUESTION_GROUPS[groupIndex];
  const answers = getAnswers();

  const groupWrapper = el('div', { className: 'question-group-wrapper' });
  const card = el('div', { className: 'card' });

  // Missing field warning element
  const missingFieldMsg = el('p', {
    className: 'missing-field-line',
    id: 'missing-field-msg',
    role: 'alert',
  });

  // Continue button definition
  const continueBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-continue',
      id: 'btn-continue',
      disabled: true,
      onClick: () => {
        if (groupIndex < QUESTION_GROUPS.length - 1) {
          state.currentGroupIndex = groupIndex + 1;
          renderCurrentScreen();
        } else {
          state.currentScreen = 'review';
          renderCurrentScreen();
        }
      },
    },
    'Continue'
  );

  const updateValidation = () => {
    const currentAns = getAnswers();
    const missing = getMissingQuestions(group, currentAns);
    if (missing.length > 0) {
      continueBtn.disabled = true;
      const names = missing.map((m) => m.label.replace('?', '').trim()).join(', ');
      missingFieldMsg.textContent = `Please answer all questions above to continue (missing: ${names}).`;
      missingFieldMsg.hidden = false;
    } else {
      continueBtn.disabled = false;
      missingFieldMsg.textContent = '';
      missingFieldMsg.hidden = true;
    }
  };

  // Build each question inside group
  for (const q of group.questions) {
    const fieldset = el('fieldset', { className: 'question-fieldset' });
    const legend = el('legend', { className: 'question-legend' }, q.label);
    fieldset.appendChild(legend);

    if (q.helper) {
      const helper = el('p', { className: 'question-helper' }, q.helper);
      fieldset.appendChild(helper);
    }

    const currentVal = answers[q.id];

    if (q.type === 'radio') {
      const optionsStack = el('div', { className: 'options-stack' });

      const allRadioOptions = [...q.options];
      if (q.hasNotSure) {
        allRadioOptions.push({ value: 'not_sure', label: 'Not sure', isNotSure: true });
      }

      for (const opt of allRadioOptions) {
        const isSelected = String(currentVal) === String(opt.value);
        const inputId = `${q.id}_${opt.value}`;

        let optionRow = null;
        let wasNotSureSelectedOnPointerDown = false;

        const radioInput = el('input', {
          type: 'radio',
          name: q.id,
          id: inputId,
          value: opt.value,
          className: 'sr-only',
          checked: isSelected,
          onKeydown: (e) => {
            if (opt.isNotSure && (e.key === ' ' || e.code === 'Space')) {
              if (getAnswers()[q.id] === 'not_sure') {
                e.preventDefault();
                radioInput.checked = false;
                if (optionRow) optionRow.classList.remove('is-selected');
                removeAnswer(q.id);
                delete answers[q.id];
                updateValidation();
              }
            }
          },
          onChange: () => {
            saveAnswer(q.id, opt.value);
            answers[q.id] = opt.value;
            const allRows = optionsStack.querySelectorAll('.option-row');
            for (const r of allRows) {
              const radio = r.querySelector('input[type="radio"]');
              if (radio && radio.checked) {
                r.classList.add('is-selected');
              } else {
                r.classList.remove('is-selected');
              }
            }
            updateValidation();
          },
        });

        const labelText = el('span', { className: 'option-text' }, opt.label);
        const dotInner = el('span', { className: 'option-dot-inner' });
        const dot = el('span', { className: 'option-dot' }, dotInner);

        const rowClasses = ['option-row'];
        if (isSelected) rowClasses.push('is-selected');
        if (opt.isNotSure) rowClasses.push('option-row-not-sure');

        optionRow = el(
          'label',
          {
            className: rowClasses.join(' '),
            htmlFor: inputId,
            onPointerdown: () => {
              if (opt.isNotSure) {
                wasNotSureSelectedOnPointerDown = (getAnswers()[q.id] === 'not_sure');
              }
            },
            onClick: (e) => {
              if (opt.isNotSure && wasNotSureSelectedOnPointerDown) {
                e.preventDefault();
                radioInput.checked = false;
                optionRow.classList.remove('is-selected');
                removeAnswer(q.id);
                delete answers[q.id];
                wasNotSureSelectedOnPointerDown = false;
                updateValidation();
              }
            },
          },
          radioInput,
          labelText,
          dot
        );

        optionsStack.appendChild(optionRow);
      }
      fieldset.appendChild(optionsStack);
    } else if (q.type === 'select') {
      const select = el(
        'select',
        {
          className: 'native-select',
          id: q.id,
          name: q.id,
          'aria-label': q.label,
          onChange: (e) => {
            const val = e.target.value;
            saveAnswer(q.id, val);
            updateValidation();
          },
        },
        el('option', { value: '' }, 'Select state or union territory...')
      );

      for (const opt of q.options) {
        const isSelected = String(currentVal) === String(opt.value);
        const optEl = el('option', { value: opt.value, selected: isSelected }, opt.label);
        select.appendChild(optEl);
      }
      if (currentVal) {
        select.value = currentVal;
      }
      fieldset.appendChild(select);
    } else if (q.type === 'stepper') {
      if (answers[q.id] === undefined) {
        const defaultVal = q.defaultValue || 1;
        saveAnswer(q.id, defaultVal);
        answers[q.id] = defaultVal;
      }
      const isNotSure = currentVal === 'not_sure';
      const numVal = typeof currentVal === 'number' ? currentVal : (parseInt(currentVal, 10) || q.defaultValue || 1);

      let currentValNum = isNotSure ? 1 : numVal;

      let notSureRow = null;
      let notSureInput = null;

      const updateStepperState = (nextVal, nextNotSure) => {
        if (nextNotSure) {
          saveAnswer(q.id, 'not_sure');
          answers[q.id] = 'not_sure';
          valDisplay.textContent = '—';
          minusBtn.disabled = true;
          plusBtn.disabled = true;
          if (notSureRow) notSureRow.classList.add('is-selected');
          if (notSureInput) notSureInput.checked = true;
        } else {
          currentValNum = nextVal;
          saveAnswer(q.id, nextVal);
          answers[q.id] = nextVal;
          valDisplay.textContent = String(nextVal);
          minusBtn.disabled = nextVal <= q.min;
          plusBtn.disabled = nextVal >= q.max;
          if (notSureRow) notSureRow.classList.remove('is-selected');
          if (notSureInput) notSureInput.checked = false;
        }
        updateValidation();
      };

      const stepperContainer = el('div', { className: 'stepper-container' });

      const minusBtn = el(
        'button',
        {
          type: 'button',
          className: 'stepper-btn',
          'aria-label': 'Decrease family size',
          disabled: isNotSure || numVal <= q.min,
          onClick: () => {
            if (isNotSure) {
              updateStepperState(1, false);
            } else if (currentValNum > q.min) {
              updateStepperState(currentValNum - 1, false);
            }
          },
        },
        '−'
      );

      const valDisplay = el('span', { className: 'stepper-value', 'aria-live': 'polite' }, isNotSure ? '—' : String(numVal));

      const plusBtn = el(
        'button',
        {
          type: 'button',
          className: 'stepper-btn',
          'aria-label': 'Increase family size',
          disabled: isNotSure || numVal >= q.max,
          onClick: () => {
            if (isNotSure) {
              updateStepperState(2, false);
            } else if (currentValNum < q.max) {
              updateStepperState(currentValNum + 1, false);
            }
          },
        },
        '+'
      );

      stepperContainer.appendChild(minusBtn);
      stepperContainer.appendChild(valDisplay);
      stepperContainer.appendChild(plusBtn);
      fieldset.appendChild(stepperContainer);

      if (q.hasNotSure) {
        const notSureInputId = `${q.id}_not_sure`;
        let wasStepperNotSureOnPointerDown = false;

        notSureInput = el('input', {
          type: 'radio',
          name: q.id,
          id: notSureInputId,
          value: 'not_sure',
          className: 'sr-only',
          checked: isNotSure,
          onKeydown: (e) => {
            if (e.key === ' ' || e.code === 'Space') {
              if (getAnswers()[q.id] === 'not_sure') {
                e.preventDefault();
                updateStepperState(currentValNum || q.defaultValue || 1, false);
              }
            }
          },
          onChange: () => {
            updateStepperState(currentValNum, true);
          },
        });

        notSureRow = el(
          'label',
          {
            className: `option-row option-row-not-sure ${isNotSure ? 'is-selected' : ''}`,
            htmlFor: notSureInputId,
            onPointerdown: () => {
              wasStepperNotSureOnPointerDown = (getAnswers()[q.id] === 'not_sure');
            },
            onClick: (e) => {
              if (wasStepperNotSureOnPointerDown) {
                e.preventDefault();
                wasStepperNotSureOnPointerDown = false;
                updateStepperState(currentValNum || q.defaultValue || 1, false);
              }
            },
          },
          notSureInput,
          el('span', { className: 'option-text' }, 'Not sure'),
          el('span', { className: 'option-dot' }, el('span', { className: 'option-dot-inner' }))
        );
        fieldset.appendChild(notSureRow);
      }
    }

    card.appendChild(fieldset);
  }

  groupWrapper.appendChild(card);

  // Back button
  const backBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-back',
      id: 'btn-back',
      onClick: () => {
        if (groupIndex === 0) {
          state.currentScreen = 'landing';
          renderCurrentScreen();
        } else {
          state.currentGroupIndex = groupIndex - 1;
          renderCurrentScreen();
        }
      },
    },
    'Back'
  );

  const navContainer = el('div', { className: 'nav-buttons-container' }, continueBtn, backBtn);
  groupWrapper.appendChild(missingFieldMsg);
  groupWrapper.appendChild(navContainer);

  screenContainer.appendChild(groupWrapper);

  // Initial validation check
  updateValidation();
}

// ---------------- Screen: Review ---------------- //
function renderReview() {
  clearChildren(screenContainer);
  const answers = getAnswers();

  const title = el('h1', { className: 'landing-headline' }, 'Review your answers');
  const reviewCard = el('div', { className: 'card' });
  const reviewList = el('div', { className: 'review-list' });

  for (const group of QUESTION_GROUPS) {
    for (const q of group.questions) {
      const userVal = answers[q.id];
      const displayVal = formatAnswerDisplay(q.id, userVal);

      const labelEl = el('div', { className: 'review-label' }, q.label);
      const valEl = el('div', { className: 'review-value' }, displayVal);
      const metaEl = el('div', { className: 'review-meta' }, labelEl, valEl);

      const editBtn = el(
        'button',
        {
          type: 'button',
          className: 'review-edit-btn',
          'aria-label': `Edit ${q.label}`,
          onClick: () => {
            state.currentScreen = 'question_group';
            state.currentGroupIndex = QUESTION_GROUPS.findIndex((g) => g.id === group.id);
            renderCurrentScreen();
          },
        },
        'Edit'
      );

      const row = el('div', { className: 'review-row' }, metaEl, editBtn);
      reviewList.appendChild(row);
    }
  }

  reviewCard.appendChild(reviewList);

  const viewResultsBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-continue',
      id: 'btn-view-results',
      onClick: async () => {
        await loadSchemes();
        const currentAnswers = getAnswers();
        state.evaluatedResults = evaluateSchemes(currentAnswers, state.schemes, new Date());
        state.currentScreen = 'results';
        renderCurrentScreen();
      },
    },
    'View results'
  );

  const backBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-back',
      id: 'btn-back-review',
      onClick: () => {
        state.currentScreen = 'question_group';
        state.currentGroupIndex = QUESTION_GROUPS.length - 1;
        renderCurrentScreen();
      },
    },
    'Back'
  );

  const navContainer = el('div', { className: 'nav-buttons-container' }, viewResultsBtn, backBtn);

  screenContainer.appendChild(title);
  screenContainer.appendChild(reviewCard);
  screenContainer.appendChild(navContainer);
}

// ---------------- Screen: Results ---------------- //
function renderResults() {
  clearChildren(screenContainer);

  if (state.loadError) {
    const errorCard = el(
      'div',
      { className: 'card' },
      el('p', { className: 'ledger-failing-condition' }, state.loadError)
    );
    screenContainer.appendChild(errorCard);
    return;
  }

  const evaluated = state.evaluatedResults;
  const eligible = evaluated.filter((s) => s.status === STATUS.ELIGIBLE);
  const needsCheck = evaluated.filter((s) => s.status === STATUS.NEEDS_CHECK);
  const ineligible = evaluated.filter((s) => s.status === STATUS.NOT_ELIGIBLE);

  const headline = el('h1', { className: 'landing-headline' }, 'Your scheme eligibility');
  screenContainer.appendChild(headline);

  // Check for empty result state (FR-15: neither likely nor check-required)
  if (eligible.length === 0 && needsCheck.length === 0) {
    const emptyCard = el('div', { className: 'empty-results-card' });
    const emptyMsg = el(
      'p',
      { className: 'empty-results-text' },
      "We did not find a scheme that matches these answers. Try again with 'Not sure' on any questions you can check, or see the full list on myScheme."
    );
    const mySchemeLink = el(
      'a',
      {
        href: 'https://www.myscheme.gov.in/',
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'ledger-official-link',
      },
      'Visit myScheme official portal'
    );
    emptyCard.appendChild(emptyMsg);
    emptyCard.appendChild(mySchemeLink);
    screenContainer.appendChild(emptyCard);
  }

  // Helper to render ledger entry
  const renderLedgerEntry = (item, statusClass, statusLabel, animIndex = 0) => {
    const delayStep = Math.min(animIndex, 7);
    const entry = el('article', {
      className: `ledger-entry ${statusClass} delay-${delayStep}`,
    });

    const statusCol = el(
      'div',
      { className: 'ledger-status-col' },
      el('span', { className: `ledger-status-tag ${statusClass}` }, statusLabel)
    );

    const contentCol = el('div', { className: 'ledger-content-col' });
    const schemeName = el('h3', { className: 'ledger-scheme-name' }, item.name);
    const bodyOrg = el('div', { className: 'ledger-body-org' }, item.body);

    contentCol.appendChild(schemeName);
    contentCol.appendChild(bodyOrg);

    if (item.status === STATUS.NOT_ELIGIBLE) {
      const failReason = el(
        'p',
        { className: 'ledger-failing-condition' },
        `Condition not met: ${item.failing_condition || 'Eligibility criteria not satisfied.'}`
      );
      contentCol.appendChild(failReason);
    } else {
      const summary = el('p', { className: 'ledger-summary' }, item.summary);
      contentCol.appendChild(summary);

      if (Array.isArray(item.documents) && item.documents.length > 0) {
        const docsSection = el('div', { className: 'ledger-documents-section' });
        const docsHeading = el('h4', { className: 'ledger-docs-heading' }, 'Documents to bring');
        const docsList = el('ul', { className: 'ledger-docs-list' });
        for (const doc of item.documents) {
          docsList.appendChild(el('li', {}, doc));
        }
        docsSection.appendChild(docsHeading);
        docsSection.appendChild(docsList);
        contentCol.appendChild(docsSection);
      }
    }

    // Stale verification date note (FR-8)
    if (item.is_stale && item.stale_note) {
      const staleNoteEl = el('p', { className: 'ledger-stale-note' }, item.stale_note);
      contentCol.appendChild(staleNoteEl);
    }

    // Footer row
    const footer = el('footer', { className: 'ledger-footer' });
    const officialLink = el(
      'a',
      {
        href: item.official_url,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'ledger-official-link',
      },
      'Official page'
    );
    const verifiedDate = el('span', {}, `Rules checked ${item.last_verified}`);
    footer.appendChild(officialLink);
    footer.appendChild(verifiedDate);
    contentCol.appendChild(footer);

    const inner = el('div', { className: 'ledger-entry-inner' }, statusCol, contentCol);
    entry.appendChild(inner);

    return entry;
  };

  let globalEntryIndex = 0;

  // Group 1: Likely eligible
  const group1 = el('section', { className: 'results-group', id: 'group-likely' });
  const heading1Row = el(
    'div',
    { className: 'results-heading-row' },
    el('h2', { className: 'results-heading' }, 'Likely eligible'),
    el('span', { className: 'results-count' }, `(${eligible.length})`)
  );
  group1.appendChild(heading1Row);
  if (eligible.length > 0) {
    const requiredNote = el(
      'p',
      { className: 'landing-body' },
      'You appear to meet the listed criteria. Confirm on the official page before applying.'
    );
    group1.appendChild(requiredNote);
  }
  for (const s of eligible) {
    group1.appendChild(renderLedgerEntry(s, 'status-eligible', 'Likely eligible', globalEntryIndex++));
  }
  screenContainer.appendChild(group1);

  // Group 2: Check the official page
  const group2 = el('section', { className: 'results-group', id: 'group-check' });
  const heading2Row = el(
    'div',
    { className: 'results-heading-row' },
    el('h2', { className: 'results-heading' }, 'Check the official page'),
    el('span', { className: 'results-count' }, `(${needsCheck.length})`)
  );
  group2.appendChild(heading2Row);
  for (const s of needsCheck) {
    group2.appendChild(renderLedgerEntry(s, 'status-check', 'Check the official page', globalEntryIndex++));
  }
  screenContainer.appendChild(group2);

  // Group 3: Not eligible (collapsed by default)
  const group3 = el('section', { className: 'results-group', id: 'group-ineligible' });
  let isIneligibleVisible = false;
  const entriesContainer = el('div', { id: 'ineligible-entries', hidden: true });

  const toggleBtn = el(
    'button',
    {
      type: 'button',
      className: 'results-toggle-btn',
      id: 'btn-toggle-ineligible',
      'aria-expanded': 'false',
      onClick: () => {
        isIneligibleVisible = !isIneligibleVisible;
        entriesContainer.hidden = !isIneligibleVisible;
        toggleBtn.textContent = isIneligibleVisible ? 'Hide' : 'Show';
        toggleBtn.setAttribute('aria-expanded', String(isIneligibleVisible));
      },
    },
    'Show'
  );

  const heading3Row = el(
    'div',
    { className: 'results-heading-row' },
    el('h2', { className: 'results-heading' }, 'Not eligible'),
    el('span', { className: 'results-count' }, `(${ineligible.length})`),
    toggleBtn
  );
  group3.appendChild(heading3Row);

  for (const s of ineligible) {
    entriesContainer.appendChild(renderLedgerEntry(s, 'status-ineligible', 'Not eligible', globalEntryIndex++));
  }
  group3.appendChild(entriesContainer);
  screenContainer.appendChild(group3);

  // Document checklist button if any eligible or needsCheck schemes exist
  if (eligible.length > 0 || needsCheck.length > 0) {
    const checklistActionBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn-continue',
        id: 'btn-view-checklist',
        onClick: () => {
          state.currentScreen = 'checklist';
          renderCurrentScreen();
        },
      },
      'View document checklist'
    );
    screenContainer.appendChild(checklistActionBtn);
  }

  // Disclaimer
  const disclaimer = el(
    'div',
    { className: 'results-disclaimer' },
    'This is a guide based on published criteria, not a decision. Confirm eligibility and documents on the official page before you apply. Haqdar does not store your answers.'
  );
  screenContainer.appendChild(disclaimer);
}

// ---------------- Screen: Checklist ---------------- //
function renderChecklist() {
  clearChildren(screenContainer);

  const relevantSchemes = state.evaluatedResults.filter(
    (s) => s.status === STATUS.ELIGIBLE || s.status === STATUS.NEEDS_CHECK
  );

  // Merge and deduplicate documents
  // Map docName -> Set of scheme names
  const docMap = new Map();
  for (const s of relevantSchemes) {
    if (Array.isArray(s.documents)) {
      for (const d of s.documents) {
        const cleanName = d.trim();
        if (!docMap.has(cleanName)) {
          docMap.set(cleanName, new Set());
        }
        docMap.get(cleanName).add(s.name);
      }
    }
  }

  const checklistCard = el('div', { className: 'checklist-card', id: 'screen-checklist' });
  const title = el('h2', { className: 'checklist-title' }, 'Documents checklist');
  checklistCard.appendChild(title);

  const checklistState = getChecklistState();

  if (docMap.size === 0) {
    const emptyDocs = el('p', { className: 'landing-body' }, 'No documents required for your current results.');
    checklistCard.appendChild(emptyDocs);
  } else {
    for (const [docName, schemeSet] of docMap.entries()) {
      const isChecked = Boolean(checklistState[docName]);
      const schemeListText = `for ${Array.from(schemeSet).join(', ')}`;

      // SVG tick element
      const svgTick = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgTick.setAttribute('viewBox', '0 0 24 24');
      svgTick.setAttribute('class', 'checklist-tick');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5 13l4 4L19 7');
      svgTick.appendChild(path);

      const box = el('span', { className: 'checklist-box' }, svgTick);
      const nameEl = el('div', { className: 'checklist-doc-name' }, docName);
      const schemesEl = el('div', { className: 'checklist-schemes-list' }, schemeListText);
      const details = el('div', { className: 'checklist-details' }, nameEl, schemesEl);

      const row = el(
        'div',
        {
          className: `checklist-row ${isChecked ? 'is-checked' : ''}`,
          role: 'checkbox',
          tabIndex: 0,
          'aria-checked': String(isChecked),
          'aria-label': `${docName} (${schemeListText})`,
          onClick: () => {
            const nextChecked = !row.classList.contains('is-checked');
            saveChecklistDocument(docName, nextChecked);
            row.classList.toggle('is-checked', nextChecked);
            row.setAttribute('aria-checked', String(nextChecked));
          },
          onKeydown: (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              row.click();
            }
          },
        },
        box,
        details
      );

      checklistCard.appendChild(row);
    }
  }

  const printBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-print',
      id: 'btn-print-checklist',
      onClick: () => {
        window.print();
      },
    },
    'Print this list'
  );

  const backToResultsBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn-back',
      id: 'btn-back-checklist',
      onClick: () => {
        state.currentScreen = 'results';
        renderCurrentScreen();
      },
    },
    'Back to results'
  );

  const actionsRow = el('div', { className: 'checklist-actions' }, backToResultsBtn, printBtn);
  checklistCard.appendChild(actionsRow);

  screenContainer.appendChild(checklistCard);
}

/**
 * Main render function based on active screen.
 */
function renderCurrentScreen() {
  updateProgress();
  window.scrollTo(0, 0);

  switch (state.currentScreen) {
    case 'landing':
      renderLanding();
      break;
    case 'question_group':
      renderQuestionGroup(state.currentGroupIndex);
      break;
    case 'review':
      renderReview();
      break;
    case 'results':
      renderResults();
      break;
    case 'checklist':
      renderChecklist();
      break;
    default:
      renderLanding();
      break;
  }
}

// ---------------- Global Event Listeners ---------------- //

// Start over resets answers and checklist, returns to landing
startOverBtn.addEventListener('click', () => {
  clearStore();
  state.currentScreen = 'landing';
  state.currentGroupIndex = 0;
  state.evaluatedResults = [];
  renderCurrentScreen();
});

// Brand wordmark returns to landing without necessarily clearing unless clicked
brandWordmark.addEventListener('click', (e) => {
  e.preventDefault();
  state.currentScreen = 'landing';
  renderCurrentScreen();
});

// Initialize on page load: restore from sessionStorage if answers exist
function init() {
  const existing = getAnswers();
  const hasExistingAnswers = Object.keys(existing).length > 0;
  if (hasExistingAnswers) {
    // Restore session mid-flow
    state.currentScreen = 'question_group';
    state.currentGroupIndex = 0;
  } else {
    state.currentScreen = 'landing';
  }
  renderCurrentScreen();
}

init();
