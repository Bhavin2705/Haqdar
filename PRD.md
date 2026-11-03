# PRD.md: Haqdar (Beta)

## 1. Summary
Haqdar helps a person find central and state welfare schemes they are likely eligible for, lists the documents they need, and links to the official page for each scheme. The user answers a short set of questions. The eligibility result is computed from published rules in a versioned data file. No account, no server-side storage, and no AI model.

## 2. Problem
Eligible households miss welfare benefits for three reasons: they don't know a scheme exists, they can't tell whether they qualify from scattered official pages, and they don't know which documents to bring. Existing portals such as myScheme cover parts of this. Haqdar's contribution in the beta is the document checklist per scheme, a plain-language reason for each result, and a transparent, auditable rules file with a source and a verification date for every rule.

## 3. Users
- Primary: an adult deciding whether to apply for schemes for themselves or their family, often on a phone, often with low time and low patience for forms.
- Secondary: a volunteer or community worker helping several people in one sitting.
- Evaluator: a reviewer who wants to see a working system, transparent rules, and honest limits.

## 4. Goals and success measures

| Goal | Beta measure |
|---|---|
| Complete the flow on a phone | A user can go from landing to results in under 3 minutes (measured in 5 usability runs) |
| Rules are auditable | 100% of schemes in the data file have a source URL and a last-verified date |
| Results match official criteria | On 20 test profiles, results agree with a manual check of the official criteria in at least 90% of cases (reported with failures) |
| No false certainty | Every result says "likely eligible" or "check the official page"; no result says "you will get" |
| Accessibility | Passes axe-core with no serious or critical violations; keyboard-complete flow |

## 5. Scope

### In scope (beta)
- A guided form of up to 9 questions, shown one or two at a time.
- Rules for 5 to 10 central schemes, verified by the team against official pages before launch.
- Results in three groups: Likely eligible, Not eligible (with the rule that failed), and Check the official page (where an answer is missing or the rule needs a document or field the form does not collect).
- For each likely-eligible scheme: the documents required, the official link, and a one-line plain-language explanation.
- A printable or downloadable checklist of documents across all results.
- A "Start over" action and a visible reminder that the result is a guide, not a decision.

### Out of scope (beta; listed as future scope)
- Hindi, Punjabi, or any language other than English in the UI (plain English only in beta)
- Automatic checking of live portal data or scraping of any government website
- Application submission or any link to a portal's login
- User accounts, saved profiles, or history
- AI or LLM-generated eligibility or advice
- State schemes beyond the handful entered in the rules file
- Aadhaar, bank, or identity verification of any kind
- Analytics or tracking beyond anonymous page-view counts (none in beta)

## 6. Users and flow

1. Landing: one sentence on what the tool does, a note that nothing is stored, and a Start button. No marketing content.
2. Questions: one screen per group (about you, your household, your land and work). Each screen has a Back button, and answers persist in the browser session only.
3. Review: a summary of answers with an Edit link for each.
4. Results: three groups (Likely eligible, Check the official page, Not eligible), each scheme as a ledger entry.
5. Checklist: documents across all likely-eligible and check-required schemes, with checkboxes that persist for the session.

## 7. Functional requirements

### 7.1 Questions
- FR-1: The form collects: age band (under 18, 18 to 59, 60 and over); gender (female, male, other, prefer not to say); state or union territory (dropdown from a fixed list); area (rural, urban); caste category (General, EWS, OBC, SC, ST, prefer not to say); annual household income band (defined in the rules file); occupation group (farmer, labourer, salaried, self-employed, not working, other); whether any household member owns agricultural land (yes, no, not sure); family size (1 to 10).
- FR-2: Every question has a "Not sure" option except age band and state. "Not sure" leads to a "Check the official page" result, not to "Not eligible".
- FR-3: Required fields cannot be skipped. Validation messages appear beside the field, in plain language.
- FR-4: Answers are held in memory and sessionStorage for the current tab only, and cleared on "Start over". Nothing is sent to a server.

### 7.2 Rules
- FR-5: Schemes are defined in data/schemes.json. Each scheme has: id, name, ministry or body, official_url, last_verified (ISO date), criteria (list of conditions), documents (list), and a plain-English summary.
- FR-6: A condition has: field, operator (equals, in, lte, gte, is_true), value, and a human-readable description used in results.
- FR-7: Evaluation for each scheme returns one of: ELIGIBLE (all conditions met), NOT_ELIGIBLE (a condition fails; the first failing condition is reported), NEEDS_CHECK (no condition fails, but at least one needed field is "Not sure" or unanswered).
- FR-8: A scheme with last_verified older than 12 months is shown with a note: "Rules last checked [date]. Confirm on the official page."
- FR-9: The rules engine is a pure function with no network calls. Given the same answers and the same data file, it always returns the same result.

### 7.3 Results
- FR-10: Results are grouped into Likely eligible, Check the official page, and Not eligible, in that order.
- FR-11: Each Likely eligible entry shows: scheme name, body, one-line summary, required documents, the official link (opens in a new tab with rel="noopener noreferrer"), and the last-verified date.
- FR-12: Each Not eligible entry shows the scheme name and the failing condition in plain words, for example "Requires annual household income below the limit listed in the rules."
- FR-13: Results never use the words "you will receive" or "guaranteed". Required phrasing: "You appear to meet the listed criteria. Confirm on the official page before applying."
- FR-14: The document checklist merges documents across the Likely eligible and Check the official page groups, removes duplicates, and lists each document once with the schemes it applies to.

### 7.4 Limits and safety
- FR-15: If no schemes are Likely eligible or Check the official page, show a clear empty result with a link to myScheme and a suggestion to contact the local Common Service Centre. Do not show a blank page.
- FR-16: The app contains no server-side code in beta. It is a static site.
- FR-17: No cookies, no third-party scripts, no analytics in beta.

## 8. Data file (data/schemes.json)
Each scheme must follow this shape. Entries without a verified source are not shipped.

{
  "id": "pm-kisan",
  "name": "PM-KISAN",
  "body": "Ministry of Agriculture and Farmers Welfare",
  "official_url": "[copy from the official page]",
  "last_verified": "[YYYY-MM-DD, the date you checked]",
  "summary": "[one plain-English sentence, written by you after reading the official page]",
  "criteria": [
    { "field": "occupation", "op": "equals", "value": "farmer", "text": "[criterion in plain words, copied from the official page]" }
  ],
  "documents": ["[document name from the official page]"]
}

Fields with a "[...]" placeholder are not filled in by this document. The team fills them from official pages.

## 9. Non-functional requirements
- Performance: first contentful paint under 2 seconds on a mid-range Android phone over 4G; the rules engine returns in under 50 ms.
- Privacy: no data leaves the device. No logs of answers. The privacy line appears on the landing screen.
- Security: static site, strict Content-Security-Policy (self only, no inline scripts), no external fonts that load third-party JS.
- Reliability: the app works offline after the first load (service worker is optional; if not built, state this in the README).
- Accessibility: WCAG 2.2 AA. Keyboard-complete. Labels on every field. Touch targets at least 44px. Respect prefers-reduced-motion.
- Maintainability: rules are data, not code. Adding a scheme requires no code change.

## 10. Acceptance criteria
- A reviewer can complete the flow with a keyboard only and reach results.
- Changing an answer and returning to results updates the results (no stale groups).
- Every scheme in the data file displays its source URL and last-verified date.
- The rules unit tests cover each operator, each result type, and the threshold boundary for income.
- axe-core reports no serious or critical violations on each screen.

## 11. Evaluation plan (for the report)
1. Write 20 test profiles covering each caste category, rural and urban, farmers and non-farmers, and boundary incomes.
2. For each profile, check the official criteria by hand and record the expected result before running the app.
3. Run the app and record the match rate and every mismatch.
4. Run 5 usability sessions with people who are not on the team, recording time to results and any confusion points.

## 12. Known limitations (copy into the report and README)
- Rules are a snapshot. Schemes change; each entry shows its verification date.
- The app does not check documents or identity. It lists what to bring.
- Results cover only the schemes in the data file, not the full catalogue.
- Income bands and caste categories are simplified. Official rules may have more conditions.
- English only in beta.
- Not a substitute for the official portal, a Common Service Centre, or a legal or financial advisor.

## 13. Future scope
Hindi and Punjabi with native-speaker review, state scheme packs, a printable form-filling guide, offline-first PWA, a community helper mode for multiple profiles, and a mechanism for scheme authorities to publish machine-readable criteria.

---

