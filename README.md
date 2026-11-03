# Haqdar (Beta)

Haqdar is a lightweight, static welfare scheme eligibility checker built for citizens, families, and community workers. It helps a person find central welfare schemes they are likely eligible for, lists the documents they need to bring, and links directly to official government portals.

There is no user account, no database, no analytics, no third-party tracking, and no AI/LLM model. All eligibility evaluation is performed purely on the client device using an auditable, versioned rules file.

---

## 1. What the App Does and Does Not Do

### What it does:
- Presents a guided, 4-step questionnaire (9 questions) with high contrast, touch targets $\ge 44\text{px}$, and keyboard navigation.
- Evaluates rules deterministically in the browser via a pure functional rules engine (`js/rules.js`).
- Categorises schemes into three clear groups:
  1. **Likely eligible**: Criteria met based on provided answers.
  2. **Check the official page**: User answered "Not sure" or a condition requires uncollected criteria.
  3. **Not eligible**: At least one rule criterion failed, with the exact failing condition displayed in plain language.
- Generates a consolidated, deduplicated **document checklist** showing which schemes require each document, with toggleable checkboxes and a clean print layout (`window.print()`).
- Restores active questionnaire sessions on tab reload while remaining strictly isolated from other tabs.
- Warns users when a scheme's verified rules are older than 12 months.

### What it does NOT do:
- It does **not** make decisions or guarantee welfare benefits.
- It does **not** transmit, store, or log user answers to any server.
- It does **not** check official identity databases (no Aadhaar OTP, no bank API, no scraping).
- It does **not** submit applications or log into government portals.
- It is **not** an alternative to legal, financial, or Common Service Centre (CSC) consultation.

---

## 2. Technology Stack & Architecture

- **Runtime**: Plain HTML5, CSS3, and vanilla JavaScript (ES modules). Zero dependencies in the shipped web client.
- **Typography**: Google Fonts (*Fraunces* for display headings, *Figtree* for UI and body text) loaded via a single `<link>` with `display=swap`.
- **Security**: Strict Content Security Policy (`default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:;`).
- **Privacy**: No cookies, no `localStorage`, no third-party telemetry. Only `sessionStorage` is used for answers and checklist persistence within the active tab.

---

## 3. How to Run Locally

You can serve the static files with any local HTTP server:

### Option A: Python 3
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Node.js (npx serve)
```bash
npx serve -l 3000 .
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. How to Run Tests

### Unit Tests (Node.js built-in test runner)
Runs the pure rules engine unit tests and scheme data schema validation:
```bash
node --test tests/rules.test.js tests/data.test.js
```

### End-to-End & Accessibility Tests (Playwright)
The automated browser suite tests flows and WCAG 2.2 AA accessibility at 360px (mobile) and 1280px (desktop):
```bash
cd tests/e2e
npm test
```
Or run Playwright directly:
```bash
cd tests/e2e
npx playwright test
```

---

## 5. Adding a Scheme

To add a new welfare scheme to `data/schemes.json`:

1. Copy the blank template from `data/schemes.template.json`.
2. Inspect the official portal or gazette guidelines for the scheme. Do **not** invent criteria or thresholds from memory.
3. Fill in the required fields:
   - `id`: Unique kebab-case string (e.g., `pm-kisan`).
   - `name`: Official title of the scheme.
   - `body`: Responsible Ministry or Department.
   - `official_url`: Verified official portal URL starting with `https://`.
   - `last_verified`: Date verified against the official source in `YYYY-MM-DD` format.
   - `summary`: One plain-language sentence describing the benefit.
   - `criteria`: List of rule objects:
     - `field`: The question ID (`age_band`, `gender`, `state`, `area`, `caste`, `income`, `occupation`, `land`, `family_size`).
     - `op`: One of `equals`, `in`, `lte`, `gte`, `is_true`.
     - `value`: Target value or array of values.
     - `text`: Plain-language explanation shown when this criterion fails.
   - `documents`: List of required document strings.
4. Ensure no placeholder characters (such as `[` or `]`) remain in your entry.
5. Validate the dataset:
   ```bash
   node --test tests/data.test.js
   ```

---

## 6. Shipped & Verified Schemes

### Shipped Verified Schemes (10 Schemes)
1. **PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)**: Income support for landholder farming families (`https://pmkisan.gov.in/`). Last verified: `2026-11-03`.
2. **PM Ujjwala Yojana (PMUY)**: Deposit-free LPG connections for adult women from low-income households (`https://www.pmuy.gov.in/`). Last verified: `2026-11-03`.
3. **MGNREGA (Rural Work Guarantee)**: 100 days of guaranteed wage employment for rural households (`https://nrega.nic.in/`). Last verified: `2026-11-03`.
4. **Ayushman Bharat (PM-JAY)**: Free secondary and tertiary hospital health cover of Rs 5 lakh per family per year (`https://pmjay.gov.in/`). Last verified: `2026-11-03`.
5. **PM Awas Yojana - Gramin (PMAY-G)**: Financial assistance to construct permanent brick homes for rural poor (`https://pmayg.nic.in/`). Last verified: `2026-11-03`.
6. **PM Vishwakarma Yojana**: Free training, tool kit grant (Rs 15,000), and credit for traditional craftspeople and artisans (`https://pmvishwakarma.gov.in/`). Last verified: `2026-11-03`.
7. **PM Mudra Yojana (PMMY)**: Institutional micro-loans up to Rs 10 lakh to set up or expand small businesses and shops (`https://www.jansamarth.in/`). Last verified: `2026-11-03`.
8. **National Old Age Pension Scheme (IGNOAPS / NSAP)**: Monthly social pension for senior citizens aged 60+ from BPL households (`https://nsap.nic.in/`). Last verified: `2026-11-03`.
9. **PM Shram Yogi Maan-dhan (PM-SYM)**: Old-age pension of Rs 3,000 per month for unorganised and daily wage workers (`https://www.maandhan.in/`). Last verified: `2026-11-03`.
10. **Atal Pension Yojana (APY)**: Government-backed pension scheme of Rs 1,000 to Rs 5,000 monthly for unorganised sector workers (`https://enps.nsdl.com/`). Last verified: `2026-11-03`.

---

## 7. Contrast Ratios (WCAG 2.2 AA Compliance)

Every text colour used in the interface has been measured against both background surfaces: **Paper** (`#F5EFE4`) and **Card** (`#FFFBF4`). All text colours comfortably exceed the WCAG AA minimum requirement of 4.5:1.

| Element / Color Token | Hex Code | Contrast on Paper (`#F5EFE4`) | Contrast on Card (`#FFFBF4`) | Compliance |
|---|---|---|---|---|
| Primary Text (`--color-ink`) | `#1E2B24` | **12.87:1** | **14.27:1** | Pass (AAA) |
| Secondary / Meta (`--color-ink-soft`) | `#5B6358` | **5.44:1** | **6.04:1** | Pass (AA) |
| Brand / Links (`--color-brand`) | `#1F5B4A` | **6.91:1** | **7.67:1** | Pass (AA) |
| Status Eligible (`--color-status-eligible`) | `#1F5B4A` | **6.91:1** | **7.67:1** | Pass (AA) |
| Status Check (`--color-status-check`) | `#8A5A12` | **5.17:1** | **5.73:1** | Pass (AA) |
| Status Ineligible (`--color-status-ineligible`) | `#6B4A4A` | **6.79:1** | **7.53:1** | Pass (AA) |

*(Note: `--color-accent` (`#C0701F`) is reserved strictly for non-text UI components, specifically the progress bar fill).*

---

## 8. Known Limitations (from PRD Section 12)

- **Rules are a snapshot**: Welfare schemes and criteria change over time. Each entry clearly displays its last verification date.
- **No document or identity checks**: The app lists what documents to prepare; it does not inspect, verify, or scan documents.
- **Limited catalogue**: Results cover only verified schemes included in `data/schemes.json`, not the exhaustive national registry.
- **Simplified categories**: Income bands and caste classifications are structured for fast triage. Official schemes may feature nuanced sub-rules.
- **English only in beta**: Translation layers are not included in this release.
- **Not legal or financial counsel**: The application is an informational guide, not an official government determination or legal advisor.

---

## 9. Future Scope (from PRD Section 13)

The following items are intentionally out of scope for the beta and slated for future releases:
- Multilingual support (Hindi, Punjabi, Tamil, Bengali) with native-speaker copy review.
- State-specific scheme packs (e.g., Punjab, Tamil Nadu, Maharashtra).
- Offline-first Progressive Web App (PWA) with Service Worker caching.
- Community helper mode enabling volunteers to evaluate multiple family profiles in one session.
- Standardized open schema for civic authorities to publish machine-readable scheme eligibility definitions.

---

## 10. Deployment

Haqdar is completely static. To deploy:

### GitHub Pages
1. Push repository to GitHub.
2. In the repository **Settings** $\rightarrow$ **Pages**, select **Deploy from a branch**.
3. Choose the `main` branch and `/ (root)` folder. Click **Save**.

### Netlify
1. Connect repository or run `netlify deploy --prod --dir=.`.
2. No build command required; publish directory is `./`.
