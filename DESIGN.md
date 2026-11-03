# DESIGN.md: Haqdar

## 1. Design intent
Haqdar should feel like a well-made civic guide: warm, clear, and quietly confident. People arrive anxious about money, paperwork, and whether they are "allowed." The design should lower that anxiety without patronising them. It should look like something worth opening: deliberate typography, a considered palette, and a layout with real rhythm, while staying calm enough for a first-time phone user.

Three words: warm, clear, dignified.

Avoid: government-portal grey, generic SaaS blue-and-white, gradient hero banners, purple, AI sparkle motifs, stock photos of smiling families, icon-in-circle feature grids, and emoji.

## 2. Principles
1. One question at a time on mobile. Never a wall of fields.
2. Warmth comes from colour and type, not decoration. No ornaments.
3. Results read like a ledger: numbered, ruled, and easy to scan.
4. Honesty is part of the look. Status labels are words, not just colours.
5. Motion confirms actions. It never performs.

## 3. Colour

Base (light, default):
- Paper: #F5EFE4 (warm linen, page background)
- Card: #FFFBF4 (answer cards and result entries)
- Ink: #1E2B24 (deep forest-black, primary text)
- Ink soft: #5B6358 (secondary text, meta)
- Hairline: #D9CFBD (rules and borders)
- Brand: #1F5B4A (deep green; primary buttons, selected states, links)
- Brand hover: #174537
- Accent: #C0701F (saffron-ochre; used once per screen at most, for the progress line and the "Check the official page" label)

Status (text labels always shown; colour is reinforcement):
- Likely eligible: #1F5B4A (green), label "Likely eligible"
- Check the official page: #8A5A12 (ochre-brown), label "Check the official page"
- Not eligible: #6B4A4A (muted rose-brown), label "Not eligible"

Contrast: every text colour meets WCAG AA (4.5:1) on Paper and Card. Record the computed ratios in the README before release.

Dark mode: optional for beta. If built, Paper #161A17, Card #1E2420, Ink #EDE8DC, Brand #7FC4A9, and recompute contrast.

## 4. Typography
- Display (page titles, scheme names in results, the wordmark): Fraunces, weights 500 and 600, with the "SOFT" and "opsz" axes at default. Fallback: Georgia, serif.
- UI and body (questions, labels, buttons, body copy): Figtree, weights 400, 500, 600. Fallback: system-ui, sans-serif.
- Scale (rem, base 16px):
  - Display large (landing headline): 2.5rem mobile, 3.25rem desktop, Fraunces 500, line-height 1.05
  - Question heading: 1.5rem, Fraunces 500, line-height 1.25
  - Scheme name (result): 1.25rem, Fraunces 600, line-height 1.3
  - Body: 1.0625rem (17px), Figtree 400, line-height 1.6
  - Label (uppercase): 0.75rem, Figtree 600, letter-spacing 0.08em
  - Small (meta, sources, dates): 0.875rem, Figtree 400
- Body text never below 16px. Max prose width 60ch.

## 5. Layout and spacing
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 72. Use only these.
- Mobile first: single column, 20px side padding.
- From 768px: content column 680px max, centred; 40px side padding. Results may use a two-column ledger only at 1024px and up, with the status label in the left column and the scheme details in the right.
- Radius: 12px on cards, 999px on option chips and the primary button (the one place pill shapes are used), 0 on rules.
- Shadows: none. Depth comes from the Card colour against Paper and a 1px Hairline border.

## 6. Components

### Masthead
- Left: wordmark "Haqdar" in Fraunces 600, 1.5rem.
- Right: a "Start over" text link, shown only after the form has started.
- Below: a 1px Hairline rule. No navigation, no logos.

### Landing
- Headline in Display large: "Find the schemes you may qualify for."
- One line of body text: "Answer nine short questions. Get the schemes, the documents to bring, and the official link for each."
- Privacy line in Small Ink soft: "Your answers stay on this device. Nothing is sent or stored."
- Primary button: "Start" (full width on mobile, 56px tall).
- Below: a short "How it works" in three lines, numbered 1, 2, 3, in Body. No illustrations.

### Progress
- A thin progress bar at the top of the form screens: 3px high, Brand fill on Hairline track, with the accent colour only for the final segment.
- Text beside it: "Step 2 of 4" in Label style. Four steps: About you, Household, Land and work, Review.

### Question card
- A Card with 12px radius, 1px Hairline border, 24px padding.
- Question in the Question heading style.
- Helper text in Small Ink soft, one line, where useful.
- Options:
  - Single-choice: a stack of full-width option rows (44px minimum height). Each row has a 1px Hairline border and, when selected, a 2px Brand border and a Brand-tinted background (#EAF2EE). Selection is shown by a filled dot on the right, not a checkmark icon.
  - Dropdown (state): native select styled to match, 48px tall.
  - Number (family size): a stepper with minus and plus buttons, 48px square each, and the number between them in Figtree 600.
- "Not sure" is a separate row below the options with a dashed Hairline border.

### Navigation buttons
- Primary "Continue": Brand background, Paper text, 52px height, full width on mobile, auto width (minimum 180px) on desktop, 999px radius. Pressed state scales to 0.98. Disabled until required fields are answered, with a Small line beneath it explaining what is missing.
- Secondary "Back": text button in Ink with an underline on hover.

### Review screen
- A list of answers as label/value rows separated by Hairlines. Each row has an "Edit" text button on the right that returns to that question.

### Results: section headings
- Three headings in Fraunces 500, 1.5rem, each with a count in Small Ink soft: "Likely eligible (3)", "Check the official page (2)", "Not eligible (4)".
- Not eligible is collapsed by default behind a plain "Show" text button, so the page leads with what the user can act on.

### Result ledger entry
- A Card with a 4px left rule in the status colour, 20px padding.
- Top line: a Label with the status words ("Likely eligible") in the status colour.
- Scheme name in Scheme-name style.
- Body summary in Body.
- "Documents to bring" as a short list in Body, with the document names; no bullets, use an en-dash separated line or a simple list with hairlines.
- Footer row: "Official page" link (Brand, underlined) and "Rules checked [date]" in Small Ink soft.
- Not-eligible entries show only the name and the failing condition in Small text.

### Checklist
- A Card titled "Documents checklist" (Fraunces 500, 1.25rem).
- Each document is a row with a 24px square checkbox (1.5px Ink border, Brand fill when checked, with a drawn tick in Paper) and the document name in Body. Under each name, Small Ink soft: "for PM-KISAN, PM Ujjwala".
- A line at the bottom: "Print this list" (text button, calls the print dialog).

### Disclaimer
- Under results, separated by a Hairline: "This is a guide based on published criteria, not a decision. Confirm eligibility and documents on the official page before you apply. Haqdar does not store your answers."

### Empty result
- A Card with a plain message: "We did not find a scheme that matches these answers. Try again with 'Not sure' on any questions you can check, or see the full list on myScheme." Link to myScheme (opens in new tab).

### Error and stale state
- If the rules file fails to load: "We could not load the scheme rules. Refresh the page or try again later." Inline, no modal.
- If any scheme's last_verified is over 12 months: a Small note on that entry: "Rules last checked [date]. Confirm on the official page."

## 7. Motion
- Question change: the card fades in and moves up 8px over 200ms.
- Results: entries stagger in at 60ms intervals, each fading and moving 8px over 220ms. Maximum total stagger 400ms.
- Checkbox tick: 150ms scale from 0.8 to 1.
- Progress bar: width transitions over 300ms.
- All motion is disabled under prefers-reduced-motion. No looping animation anywhere.

## 8. Copy voice
- Plain, warm, short. Address the reader as "you" sparingly.
- No exclamation marks. No "Great job", "Congratulations", "You're eligible".
- Use "appear to", "likely", and "listed criteria" instead of certainty.
- Explain jargon once: "Antyodaya" or "BPL" should appear with a plain-language gloss.
- Never guarantee a benefit. Never suggest the user is excluded because of their caste or gender; describe the rule, not the person.

## 9. Accessibility
- Every field has a visible label. Options are real radio buttons inside a fieldset with a legend.
- Focus ring: 2px Ink outline with 2px offset on every interactive element. Never removed.
- Progress is announced with aria-live="polite" on the step text.
- Results headings are real h2 elements; ledger entries are articles.
- Touch targets at least 44px. Body never below 16px.
- Colour is never the only status signal; each status has its word.

## 10. Responsive behaviour
- 360px: single column, full-width buttons, Display large 2.5rem, options stacked.
- 768px: 40px side padding, 680px column, Display large 3.25rem.
- 1024px and up: results ledger uses the two-column layout (status label left, details right). Question cards stay single column for readability.

## 11. Forbidden patterns (review checklist)
- Gradient backgrounds, gradient text, or glassmorphism
- Drop shadows
- Emoji or decorative icons, icon-in-circle feature grids
- Stock photos or illustrations of people
- Purple or neon colours
- Generic hero copy such as "Unlock your benefits"
- Any colour not defined in this file
- More than two typefaces
- Any result copy that guarantees a benefit

