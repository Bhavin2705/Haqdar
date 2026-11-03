import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { evaluateSchemes } from '../js/rules.js';

// 1. Calculate precise WCAG contrast ratios
function getLuminance(hex) {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const surfaces = {
  Paper: '#F5EFE4',
  Card: '#FFFBF4',
};

const tokens = {
  'Primary Text (--color-ink)': '#1E2B24',
  'Secondary Text (--color-ink-soft)': '#5B6358',
  'Brand / Links (--color-brand)': '#1F5B4A',
  'Status Eligible (--color-status-eligible)': '#1F5B4A',
  'Status Check (--color-status-check)': '#8A5A12',
  'Status Ineligible (--color-status-ineligible)': '#6B4A4A',
  'Accent / Progress fill (--color-accent)': '#C0701F',
};

console.log('=== WCAG CONTRAST AUDIT ===');
const contrastResults = [];
for (const [name, hex] of Object.entries(tokens)) {
  const onPaper = getContrastRatio(hex, surfaces.Paper);
  const onCard = getContrastRatio(hex, surfaces.Card);
  contrastResults.push({
    token: name,
    hex,
    onPaper: onPaper.toFixed(2),
    onCard: onCard.toFixed(2),
    passAA: onPaper >= 4.5 && onCard >= 4.5,
  });
  console.log(`${name} (${hex}): On Paper: ${onPaper.toFixed(2)}:1, On Card: ${onCard.toFixed(2)}:1 (Pass AA: ${onPaper >= 4.5 && onCard >= 4.5})`);
}

// 2. Performance benchmark: Rules engine execution time
const schemes = JSON.parse(fs.readFileSync('data/schemes.json', 'utf8'));
const sampleProfile = {
  age_band: '18_to_59',
  gender: 'female',
  state: 'Punjab',
  area: 'rural',
  caste: 'General',
  income: '250000',
  occupation: 'farmer',
  land: 'yes',
  family_size: 4,
};

const iterations = 5000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  evaluateSchemes(sampleProfile, schemes, '2026-11-02');
}
const elapsed = performance.now() - start;
const avgPerRunMs = elapsed / iterations;
console.log(`\n=== RULES ENGINE BENCHMARK ===`);
console.log(`Executed ${iterations} evaluations in ${elapsed.toFixed(2)} ms.`);
console.log(`Average time per evaluation: ${avgPerRunMs.toFixed(4)} ms (Target: < 50 ms)`);

// 3. Shipped copy and abbreviations scanner
const appCode = fs.readFileSync('js/app.js', 'utf8');
const questionsCode = fs.readFileSync('js/questions.js', 'utf8');
const allCopy = appCode + '\n' + questionsCode;

console.log(`\n=== COPY & ABBREVIATION SCANNER ===`);
const forbiddenCheck = [
  /you will receive/i,
  /guaranteed/i,
  /you are eligible/i,
];
forbiddenCheck.forEach(rx => {
  if (rx.test(allCopy)) {
    console.warn(`WARNING: Forbidden phrase matched: ${rx}`);
  }
});

// Check if BPL is glossed
if (allCopy.includes('BPL') && !allCopy.includes('Below Poverty Line')) {
  console.log('Note: BPL mentioned without explicit definition');
} else {
  console.log('Abbreviations audit passed.');
}

