import fs from 'node:fs';
import path from 'node:path';

const shippedFiles = [
  'index.html',
  'styles/tokens.css',
  'styles/base.css',
  'styles/components.css',
  'js/app.js',
  'js/questions.js',
  'js/rules.js',
  'js/store.js',
  'js/render.js',
  'data/schemes.json'
];

const results = {
  inlineScript: [],
  inlineOnHandlers: [],
  innerHTMLUsage: [],
  localStorageUsage: [],
  cookieUsage: [],
  thirdPartyScripts: [],
  forbiddenPhrases: [],
  exclamationMarks: [],
  emojis: [],
  schemesValidation: []
};

// Emoji regex
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

for (const file of shippedFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // Check emojis
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      results.emojis.push({ file, line: idx + 1, content: line.trim() });
    }
  });

  // Check inline <script> (content inside script tags)
  if (file === 'index.html') {
    const scriptMatches = content.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      results.inlineScript.push({ file, matches: scriptMatches });
    }
    // Check third-party scripts
    const extScripts = content.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi);
    if (extScripts) {
      extScripts.forEach(s => {
        if (!s.includes('js/app.js') && !s.includes('src="js/')) {
          results.thirdPartyScripts.push({ file, match: s });
        }
      });
    }
  }

  // Check inline on* attributes (onclick, onload, etc.)
  lines.forEach((line, idx) => {
    if (/\bon[a-z]+\s*=/i.test(line)) {
      results.inlineOnHandlers.push({ file, line: idx + 1, content: line.trim() });
    }
  });

  // Check innerHTML
  lines.forEach((line, idx) => {
    if (/\binnerHTML\b/.test(line)) {
      results.innerHTMLUsage.push({ file, line: idx + 1, content: line.trim() });
    }
  });

  // Check localStorage
  lines.forEach((line, idx) => {
    if (/\blocalStorage\b/.test(line)) {
      results.localStorageUsage.push({ file, line: idx + 1, content: line.trim() });
    }
  });

  // Check cookies
  lines.forEach((line, idx) => {
    if (/\bdocument\.cookie\b/.test(line) || /\bcookie\b/i.test(line)) {
      results.cookieUsage.push({ file, line: idx + 1, content: line.trim() });
    }
  });

  // Check forbidden phrases: "you will receive", "guaranteed", "you are eligible"
  const forbidden = [
    /you will receive/i,
    /guaranteed/i,
    /you are eligible/i
  ];
  lines.forEach((line, idx) => {
    forbidden.forEach(rgx => {
      if (rgx.test(line)) {
        results.forbiddenPhrases.push({ file, line: idx + 1, match: rgx.toString(), content: line.trim() });
      }
    });
  });

  // Check exclamation marks in UI copy (JS and HTML)
  if (file.endsWith('.js') || file.endsWith('.html')) {
    lines.forEach((line, idx) => {
      // Exclude comments, !=, !==, !variable
      const stripped = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      const quotes = stripped.match(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g);
      if (quotes) {
        quotes.forEach(q => {
          if (q.includes('!') && !q.includes('!=') && !q.includes('!important')) {
            results.exclamationMarks.push({ file, line: idx + 1, quote: q });
          }
        });
      } else if (file === 'index.html' && stripped.includes('!') && !stripped.includes('<!DOCTYPE') && !stripped.includes('<!--')) {
        results.exclamationMarks.push({ file, line: idx + 1, content: line.trim() });
      }
    });
  }
}

// Schemes verification
const schemesRaw = fs.readFileSync('data/schemes.json', 'utf8');
if (schemesRaw.includes('[') && (schemesRaw.includes('[Scheme Name]') || schemesRaw.includes('[Official URL]'))) {
  results.schemesValidation.push('Found placeholder bracket text in schemes.json');
}
const schemes = JSON.parse(schemesRaw);
schemes.forEach(s => {
  if (!s.official_url || !s.official_url.startsWith('https://')) {
    results.schemesValidation.push(`Scheme ${s.id} official_url is not https: ${s.official_url}`);
  }
  if (!s.last_verified || isNaN(Date.parse(s.last_verified))) {
    results.schemesValidation.push(`Scheme ${s.id} invalid last_verified: ${s.last_verified}`);
  }
});

console.log(JSON.stringify(results, null, 2));

