# Haqdar Bug Register

This register documents all defects identified during comprehensive end-to-end and static quality assurance testing across the Haqdar welfare eligibility checker codebase.

---

## BUG-001: Strict Content Security Policy Violation Due to Dynamic Inline Style Injection

- **Bug ID**: BUG-001
- **Title**: Inline `style="animation-delay: ...ms"` injection in results ledger violates strict CSP
- **Severity**: High (Security / Non-Functional / Console Policy Violation)
- **Status**: **RESOLVED** in commit `9f9c01b`
- **Requirement Tracing**: PRD Section 7 (Non-Functional Requirements - Security: `style-src 'self' https://fonts.googleapis.com`), DESIGN.md Section 7 (Motion)
- **Preconditions**:
  1. The application is served under its defined CSP meta tag: `default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:;`.
  2. The user answers all questions and arrives at the Results screen.
- **Reproduction Steps**:
  1. Navigate to Haqdar (`http://localhost:3000`).
  2. Click "Start".
  3. Complete questions with matching inputs: Age: 18 to 59, Gender: Female, State: Punjab, Area: Rural, Caste: General, Family size: 4, Income: Up to ₹1,00,000, Occupation: Farmer, Land: Yes.
  4. On the Review screen, click "View results".
  5. Inspect the browser developer console.
- **Expected Behaviour**:
  The Results screen renders cleanly without any CSP violations or console error messages. Staggered animation delays should be managed via CSS utility classes or predefined CSS attributes that do not require inline style strings.
- **Actual Behaviour**:
  The browser console reports a security violation:
  `Refused to apply inline style because it violates the following Content Security Policy directive: "style-src 'self' https://fonts.googleapis.com". Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...') is required to enable inline styles.`
  The card rendering fails Playwright console-error zero-tolerance verification.
- **Evidence**:
  Playwright error context in `tests/e2e/flow-a.spec.js`:
  ```
  Error: Console error detected: Refused to apply inline style because it violates the following Content Security Policy directive: "style-src 'self' https://fonts.googleapis.com".
  ```
- **Root Cause & Fix Applied**:
  Replaced dynamic inline style attribute in `js/app.js` with indexed CSS classes `.delay-0` through `.delay-7` defined in `styles/components.css`. Verified via `flow-a.spec.js` (0 console errors).

---

## BUG-002: Unhandled TypeError and Process Crash on Null or Undefined Scheme in `evaluateSchemes`

- **Bug ID**: BUG-002
- **Title**: `evaluateSchemes` crashes with `TypeError: Cannot read properties of null (reading 'criteria')` when processing nullish scheme entries
- **Severity**: High (Reliability / Runtime Crash / Rules Engine)
- **Status**: **RESOLVED** in commit `60db9b7`
- **Requirement Tracing**: PRD Section 6 (FR-6, FR-9: Pure function robustness & determinism)
- **Preconditions**:
  1. `evaluateSchemes(answers, schemes, today)` is called where `schemes` contains `null` or `undefined` (e.g. corrupted API/JSON payload or array gap).
- **Reproduction Steps**:
  1. Execute unit test:
     ```javascript
     evaluateSchemes({}, [null], new Date());
     ```
- **Expected Behaviour**:
  The rules engine safely handles non-object or nullish array elements without throwing an unhandled exception, returning a safe placeholder with status `NEEDS_CHECK`.
- **Actual Behaviour**:
  Throws unhandled exception:
  `TypeError: Cannot read properties of null (reading 'criteria') at js/rules.js:143:24`
- **Evidence**:
  Node test runner failure output in `tests/rules.test.js:303`:
  ```
  ✖ null scheme in schemes list does not crash evaluateSchemes
  TypeError: Cannot read properties of null (reading 'criteria')
      at js/rules.js:143:24
  ```
- **Root Cause & Fix Applied**:
  Added defensive verification in `js/rules.js` (`evaluateScheme`): `if (!scheme || typeof scheme !== 'object')` returns a safe `STATUS.NEEDS_CHECK` object with `failing_condition: 'Scheme data is missing or invalid'`. Verified via unit test suite.

---

## BUG-003: Scheme with Missing `criteria` Array Evaluates as False `ELIGIBLE`

- **Bug ID**: BUG-003
- **Title**: Schemes missing `criteria` default to `STATUS.ELIGIBLE` instead of failing safely
- **Severity**: Critical (Logic / Core Rules Engine / False Eligibility)
- **Status**: **RESOLVED** in commit `764de6f`
- **Requirement Tracing**: PRD Section 6 (FR-6: Eligibility Engine, Section 8: Scheme Data Shape)
- **Preconditions**:
  1. A scheme object lacks the `criteria` array (e.g., `criteria: undefined` or omitted in data source).
- **Reproduction Steps**:
  1. Execute unit test:
     ```javascript
     const results = evaluateSchemes({}, [{ id: 'test', name: 'Corrupt', criteria: [] }], new Date());
     ```
- **Expected Behaviour**:
  A scheme without criteria cannot evaluate as eligible because no rules were verified. It must return `STATUS.NEEDS_CHECK` with `failing_condition: 'Scheme criteria are missing or unverified.'`
- **Actual Behaviour**:
  Because the loop over criteria never ran, `firstFailingCondition` remained `null` and `hasUncertainCondition` remained `false`, defaulting to `STATUS.ELIGIBLE`.
- **Evidence**:
  Node test runner failure output in `tests/rules.test.js:275`:
  ```
  ✖ missing criteria array fails safely with NEEDS_CHECK or clear error, not false ELIGIBLE
  AssertionError [ERR_ASSERTION]: Scheme with missing criteria should yield NEEDS_CHECK
  + actual: 'ELIGIBLE'
  - expected: 'NEEDS_CHECK'
  ```
- **Root Cause & Fix Applied**:
  Added guard in `js/rules.js` (`evaluateScheme`): `if (!Array.isArray(scheme.criteria) || scheme.criteria.length === 0)` immediately returns `STATUS.NEEDS_CHECK` with `failing_condition: 'Scheme criteria are missing or unverified'`. Verified via unit test suite.

---

## BUG-004: Numeric Comparison Operators Evaluate `value: null` as `0`, Granting Incorrect Eligibility

- **Bug ID**: BUG-004
- **Title**: `lte` and `gte` operators coerce `null` criterion value to `0`, inappropriately passing zero income
- **Severity**: Critical (Logic / Rules Engine / Calculation Defect)
- **Status**: **RESOLVED** in commit `b9f1dfb`
- **Requirement Tracing**: PRD Section 6 (FR-7: Operators - `lte`, `gte`)
- **Preconditions**:
  1. A scheme has a numeric criterion with `value: null` (malformed or unparsed threshold).
  2. The user has an income of 0 or negative.
- **Reproduction Steps**:
  1. Execute unit test:
     ```javascript
     const scheme = {
       id: 'test',
       criteria: [{ field: 'income', op: 'lte', value: null }]
     };
     evaluateSchemes({ income: 0 }, [scheme], new Date());
     ```
- **Expected Behaviour**:
  When a target criterion value is `null` or `undefined`, the rule should recognize the condition as invalid/uncertain and evaluate to `NEEDS_CHECK`.
- **Actual Behaviour**:
  JavaScript's `Number(null)` evaluates to `0`. `0 <= 0` evaluated to `true`, marking the user as `STATUS.ELIGIBLE`.
- **Evidence**:
  Node test runner failure output in `tests/rules.test.js:293`:
  ```
  ✖ null target value in criterion fails safely with NEEDS_CHECK, not evaluating null as 0
  AssertionError [ERR_ASSERTION]: Criterion with null target value should yield NEEDS_CHECK
  + actual: 'ELIGIBLE'
  - expected: 'NEEDS_CHECK'
  ```
- **Root Cause & Fix Applied**:
  In `js/rules.js`, added nullish checks for `userValue` and `targetValue` in `OPERATORS.LTE` and `OPERATORS.GTE` branches of `evaluateCondition`, and treated `targetValue === null || targetValue === undefined` as uncertain in `evaluateScheme`. Verified via unit test suite.

---

## BUG-005: Page Reload on Review, Results, or Checklist Always Resets Navigation to Step 1

- **Bug ID**: BUG-005
- **Title**: Mid-session page refresh unexpectedly redirects user back to Step 1 of 4
- **Severity**: Medium (UX / Navigation State Persistence)
- **Status**: **OPEN (Backlog)**
- **Requirement Tracing**: PRD Section 5 (Screen State Machine), Section 6 (FR-5: Answers in `sessionStorage`)
- **Preconditions**:
  1. The user answers all questions and navigates to the Review, Results, or Checklist screen.
  2. The user refreshes the page or reopens the tab in the same session.
- **Reproduction Steps**:
  1. Complete questions through Step 3 and arrive at the Review screen (`Review your answers`).
  2. Press browser reload (F5 / `Cmd+R`).
- **Expected Behaviour**:
  The user remains on their current screen, or their active screen state is restored (or at minimum returns to Review if all questions are answered).
- **Actual Behaviour**:
  `init()` in `js/app.js` checks `if (hasExistingAnswers)` and hardcodes:
  ```javascript
  state.currentScreen = 'question_group';
  state.currentGroupIndex = 0;
  ```
  The user is forced back to Step 1 of 4 ("About you"). While their input answers are preserved, their navigation position is lost.
- **Evidence**:
  `js/app.js`, lines 933-944.
- **Suspected Root Cause**:
  Navigation screen state is maintained exclusively in memory in `state.currentScreen` without synchronizing the active screen name to `sessionStorage` alongside answers.
- **Proposed Fix**:
  Store active screen state (or if all questions answered, default to `'review'`). Note: PRD FR-5 specifies "sessionStorage holds answers only", so saving screen state to `sessionStorage` requires explicit confirmation.
