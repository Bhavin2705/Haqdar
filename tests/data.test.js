import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATORS } from '../js/rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemesFilePath = path.join(__dirname, '../data/schemes.json');

describe('Data Validation - data/schemes.json', () => {
  const rawData = fs.readFileSync(schemesFilePath, 'utf8');
  let schemes;

  test('schemes.json is valid JSON array', () => {
    schemes = JSON.parse(rawData);
    assert.equal(Array.isArray(schemes), true, 'schemes.json must be an array');
    assert.ok(schemes.length >= 1, 'schemes.json must contain at least one verified scheme');
  });

  test('no unreplaced placeholder text exists in schemes.json raw content', () => {
    // Shipped data must not contain "[" placeholders or "TODO"
    const parsed = JSON.parse(rawData);
    const checkForPlaceholders = (val, pathStr) => {
      if (typeof val === 'string') {
        assert.ok(
          !val.includes('[') && !val.includes(']'),
          `Placeholder bracket detected at ${pathStr}: "${val}"`
        );
        assert.ok(
          !val.toLowerCase().includes('todo'),
          `TODO detected at ${pathStr}: "${val}"`
        );
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => checkForPlaceholders(item, `${pathStr}[${idx}]`));
      } else if (typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([k, v]) => checkForPlaceholders(v, `${pathStr}.${k}`));
      }
    };
    parsed.forEach((scheme, index) => {
      checkForPlaceholders(scheme, `scheme[${index}]`);
    });
  });

  test('each scheme contains all required fields with correct types', () => {
    const list = JSON.parse(rawData);
    const allowedOps = Object.values(OPERATORS);

    for (const scheme of list) {
      assert.ok(scheme.id && typeof scheme.id === 'string', `${scheme.id}: missing id`);
      assert.ok(scheme.name && typeof scheme.name === 'string', `${scheme.id}: missing name`);
      assert.ok(scheme.body && typeof scheme.body === 'string', `${scheme.id}: missing body`);
      assert.ok(
        scheme.summary && typeof scheme.summary === 'string',
        `${scheme.id}: missing summary`
      );

      // official_url must start with https://
      assert.ok(
        typeof scheme.official_url === 'string' && scheme.official_url.startsWith('https://'),
        `${scheme.id}: official_url must start with https:// (got: ${scheme.official_url})`
      );

      // last_verified must be valid ISO date (YYYY-MM-DD)
      assert.match(
        scheme.last_verified,
        /^\d{4}-\d{2}-\d{2}$/,
        `${scheme.id}: last_verified must match YYYY-MM-DD format`
      );
      const parsedDate = new Date(scheme.last_verified);
      assert.ok(
        !Number.isNaN(parsedDate.getTime()),
        `${scheme.id}: last_verified must be a valid date`
      );

      // Criteria validation
      assert.ok(
        Array.isArray(scheme.criteria) && scheme.criteria.length > 0,
        `${scheme.id}: criteria must be a non-empty array`
      );
      for (const [cIdx, criterion] of scheme.criteria.entries()) {
        const op = criterion.op || criterion.operator;
        assert.ok(
          allowedOps.includes(op),
          `${scheme.id} criterion #${cIdx}: operator "${op}" not in allowed list [${allowedOps.join(', ')}]`
        );
        assert.ok(
          criterion.field && typeof criterion.field === 'string',
          `${scheme.id} criterion #${cIdx}: missing field`
        );
        assert.ok(
          criterion.value !== undefined,
          `${scheme.id} criterion #${cIdx}: missing value`
        );
        assert.ok(
          criterion.text && typeof criterion.text === 'string' && criterion.text.trim().length > 0,
          `${scheme.id} criterion #${cIdx}: criterion text must be non-empty plain string`
        );
      }

      // Documents validation
      assert.ok(
        Array.isArray(scheme.documents) && scheme.documents.length > 0,
        `${scheme.id}: documents must be a non-empty array`
      );
      for (const doc of scheme.documents) {
        assert.ok(
          typeof doc === 'string' && doc.trim().length > 0,
          `${scheme.id}: document name must be a non-empty string`
        );
      }
    }
  });
});
