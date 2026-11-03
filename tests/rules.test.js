import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  OPERATORS,
  STATUS,
  evaluateCondition,
  isUncertain,
  isStaleDate,
  evaluateScheme,
  evaluateSchemes,
} from '../js/rules.js';

describe('Rules Engine - Unit Tests', () => {
  const referenceDate = '2026-11-02';

  describe('Operators', () => {
    test('operator: equals', () => {
      assert.equal(evaluateCondition('farmer', OPERATORS.EQUALS, 'farmer'), true);
      assert.equal(evaluateCondition('FARMER', OPERATORS.EQUALS, 'farmer'), true);
      assert.equal(evaluateCondition('labourer', OPERATORS.EQUALS, 'farmer'), false);
    });

    test('operator: in', () => {
      const allowed = ['General', 'OBC', 'SC', 'ST'];
      assert.equal(evaluateCondition('SC', OPERATORS.IN, allowed), true);
      assert.equal(evaluateCondition('sc', OPERATORS.IN, allowed), true);
      assert.equal(evaluateCondition('Other', OPERATORS.IN, allowed), false);
      assert.equal(evaluateCondition('General', OPERATORS.IN, 'not-an-array'), false);
    });

    test('operator: lte', () => {
      assert.equal(evaluateCondition(150000, OPERATORS.LTE, 200000), true);
      assert.equal(evaluateCondition('200000', OPERATORS.LTE, 200000), true); // exact boundary
      assert.equal(evaluateCondition(200001, OPERATORS.LTE, 200000), false);
      assert.equal(evaluateCondition('invalid', OPERATORS.LTE, 200000), false);
    });

    test('operator: gte', () => {
      assert.equal(evaluateCondition(65, OPERATORS.GTE, 60), true);
      assert.equal(evaluateCondition('60', OPERATORS.GTE, 60), true); // exact boundary
      assert.equal(evaluateCondition(59, OPERATORS.GTE, 60), false);
      assert.equal(evaluateCondition('invalid', OPERATORS.GTE, 60), false);
    });

    test('operator: is_true', () => {
      assert.equal(evaluateCondition(true, OPERATORS.IS_TRUE, true), true);
      assert.equal(evaluateCondition('yes', OPERATORS.IS_TRUE, true), true);
      assert.equal(evaluateCondition('YES', OPERATORS.IS_TRUE, true), true);
      assert.equal(evaluateCondition('true', OPERATORS.IS_TRUE, true), true);
      assert.equal(evaluateCondition('1', OPERATORS.IS_TRUE, true), true);

      assert.equal(evaluateCondition(false, OPERATORS.IS_TRUE, true), false);
      assert.equal(evaluateCondition('no', OPERATORS.IS_TRUE, true), false);
      assert.equal(evaluateCondition('false', OPERATORS.IS_TRUE, true), false);
      assert.equal(evaluateCondition('0', OPERATORS.IS_TRUE, true), false);
    });
  });

  describe('Uncertainty checks', () => {
    test('isUncertain identifies not_sure and missing values', () => {
      assert.equal(isUncertain(undefined), true);
      assert.equal(isUncertain(null), true);
      assert.equal(isUncertain(''), true);
      assert.equal(isUncertain('not_sure'), true);
      assert.equal(isUncertain('Not Sure'), true);
      assert.equal(isUncertain('prefer_not_to_say'), true);
      assert.equal(isUncertain('farmer'), false);
      assert.equal(isUncertain(0), false);
      assert.equal(isUncertain(false), false);
    });
  });

  describe('Result statuses', () => {
    const sampleScheme = {
      id: 'test-scheme',
      name: 'Test Scheme',
      body: 'Test Ministry',
      official_url: 'https://example.gov.in',
      last_verified: '2026-06-01',
      summary: 'Sample summary',
      criteria: [
        { field: 'occupation', op: 'equals', value: 'farmer', text: 'Must be a farmer' },
        { field: 'income', op: 'lte', value: 200000, text: 'Income must be <= 200,000' },
      ],
      documents: ['Aadhaar card'],
    };

    test('result: ELIGIBLE when all conditions pass', () => {
      const answers = { occupation: 'farmer', income: 150000 };
      const res = evaluateScheme(answers, sampleScheme, referenceDate);
      assert.equal(res.status, STATUS.ELIGIBLE);
      assert.equal(res.failing_condition, null);
    });

    test('result: NOT_ELIGIBLE with first failing condition reported', () => {
      const answers = { occupation: 'salaried', income: 150000 };
      const res = evaluateScheme(answers, sampleScheme, referenceDate);
      assert.equal(res.status, STATUS.NOT_ELIGIBLE);
      assert.equal(res.failing_condition, 'Must be a farmer');
    });

    test('condition on "not_sure" value returns NEEDS_CHECK, not NOT_ELIGIBLE', () => {
      const answers = { occupation: 'farmer', income: 'not_sure' };
      const res = evaluateScheme(answers, sampleScheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
      assert.equal(res.failing_condition, null);
    });

    test('unanswered condition returns NEEDS_CHECK', () => {
      const answers = { occupation: 'farmer' }; // income missing
      const res = evaluateScheme(answers, sampleScheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
      assert.equal(res.failing_condition, null);
    });

    test('failing condition overrides not_sure condition for NOT_ELIGIBLE', () => {
      // If occupation definitely fails, user is not eligible even if income is not_sure
      const answers = { occupation: 'salaried', income: 'not_sure' };
      const res = evaluateScheme(answers, sampleScheme, referenceDate);
      assert.equal(res.status, STATUS.NOT_ELIGIBLE);
      assert.equal(res.failing_condition, 'Must be a farmer');
    });
  });

  describe('Threshold boundary checks', () => {
    const thresholdScheme = {
      id: 'thresh-scheme',
      name: 'Threshold Scheme',
      last_verified: '2026-06-01',
      criteria: [
        { field: 'income', op: 'lte', value: 250000, text: 'Income ceiling Rs 2,50,000' },
        { field: 'age', op: 'gte', value: 60, text: 'Age 60 or older' },
      ],
    };

    test('income exactly at lte threshold and age exactly at gte threshold are ELIGIBLE', () => {
      const answers = { income: 250000, age: 60 };
      const res = evaluateScheme(answers, thresholdScheme, referenceDate);
      assert.equal(res.status, STATUS.ELIGIBLE);
    });

    test('income 1 above lte threshold is NOT_ELIGIBLE', () => {
      const answers = { income: 250001, age: 60 };
      const res = evaluateScheme(answers, thresholdScheme, referenceDate);
      assert.equal(res.status, STATUS.NOT_ELIGIBLE);
      assert.equal(res.failing_condition, 'Income ceiling Rs 2,50,000');
    });

    test('age 1 below gte threshold is NOT_ELIGIBLE', () => {
      const answers = { income: 250000, age: 59 };
      const res = evaluateScheme(answers, thresholdScheme, referenceDate);
      assert.equal(res.status, STATUS.NOT_ELIGIBLE);
      assert.equal(res.failing_condition, 'Age 60 or older');
    });
  });

  describe('Stale date verification (FR-8)', () => {
    test('scheme with last_verified older than 12 months gets stale flag and note', () => {
      const staleScheme = {
        id: 'stale-scheme',
        name: 'Stale Scheme',
        last_verified: '2025-05-10', // ~18 months prior to referenceDate 2026-11-02
        criteria: [],
      };
      const res = evaluateScheme({}, staleScheme, referenceDate);
      assert.equal(res.is_stale, true);
      assert.equal(
        res.stale_note,
        'Rules last checked 2025-05-10. Confirm on the official page.'
      );
    });

    test('scheme verified within 12 months is not marked stale', () => {
      const freshScheme = {
        id: 'fresh-scheme',
        name: 'Fresh Scheme',
        last_verified: '2026-05-10', // ~6 months prior to referenceDate 2026-11-02
        criteria: [],
      };
      const res = evaluateScheme({}, freshScheme, referenceDate);
      assert.equal(res.is_stale, false);
      assert.equal(res.stale_note, null);
    });
  });

  describe('Purity and Determinism (FR-9)', () => {
    const schemeA = {
      id: 'scheme-a',
      name: 'Scheme A',
      last_verified: '2026-01-01',
      criteria: [{ field: 'occupation', op: 'equals', value: 'farmer', text: 'Farmer only' }],
      documents: ['Land record'],
    };
    const schemeB = {
      id: 'scheme-b',
      name: 'Scheme B',
      last_verified: '2024-01-01',
      criteria: [{ field: 'income', op: 'lte', value: 100000, text: 'Income <= 100000' }],
      documents: ['Income certificate'],
    };

    test('evaluateSchemes is deterministic (100 runs on same input produce identical output)', () => {
      const answers = { occupation: 'farmer', income: 80000 };
      const schemes = [schemeA, schemeB];

      const baseline = evaluateSchemes(answers, schemes, referenceDate);
      for (let i = 0; i < 100; i++) {
        const result = evaluateSchemes(answers, schemes, referenceDate);
        assert.deepEqual(result, baseline);
      }
    });

    test('evaluateSchemes does not mutate inputs', () => {
      const originalAnswers = { occupation: 'farmer', income: 80000 };
      const answersCopy = JSON.parse(JSON.stringify(originalAnswers));

      const originalSchemes = [
        { ...schemeA, criteria: [...schemeA.criteria], documents: [...schemeA.documents] },
        { ...schemeB, criteria: [...schemeB.criteria], documents: [...schemeB.documents] },
      ];
      const schemesCopy = JSON.parse(JSON.stringify(originalSchemes));

      evaluateSchemes(originalAnswers, originalSchemes, referenceDate);

      assert.deepEqual(originalAnswers, answersCopy);
      assert.deepEqual(originalSchemes, schemesCopy);
    });
  });

  describe('Comprehensive Operator Uncertainty & Boundaries', () => {
    test('operator: equals with not_sure yields NEEDS_CHECK', () => {
      const scheme = { id: 's', criteria: [{ field: 'caste', op: 'equals', value: 'SC' }] };
      const res = evaluateScheme({ caste: 'not_sure' }, scheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
    });

    test('operator: in with not_sure yields NEEDS_CHECK', () => {
      const scheme = { id: 's', criteria: [{ field: 'state', op: 'in', value: ['Punjab', 'Haryana'] }] };
      const res = evaluateScheme({ state: 'not_sure' }, scheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
    });

    test('operator: lte with not_sure yields NEEDS_CHECK', () => {
      const scheme = { id: 's', criteria: [{ field: 'income', op: 'lte', value: 200000 }] };
      const res = evaluateScheme({ income: 'not_sure' }, scheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
    });

    test('operator: gte with not_sure yields NEEDS_CHECK', () => {
      const scheme = { id: 's', criteria: [{ field: 'age', op: 'gte', value: 60 }] };
      const res = evaluateScheme({ age: 'not_sure' }, scheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
    });

    test('operator: is_true with not_sure yields NEEDS_CHECK', () => {
      const scheme = { id: 's', criteria: [{ field: 'bpl_card', op: 'is_true', value: true }] };
      const res = evaluateScheme({ bpl_card: 'not_sure' }, scheme, referenceDate);
      assert.equal(res.status, STATUS.NEEDS_CHECK);
    });

    test('operator: lte boundary at threshold is ELIGIBLE, 1 above is NOT_ELIGIBLE', () => {
      const scheme = { id: 's', criteria: [{ field: 'income', op: 'lte', value: 100000 }] };
      assert.equal(evaluateScheme({ income: 100000 }, scheme, referenceDate).status, STATUS.ELIGIBLE);
      assert.equal(evaluateScheme({ income: 100001 }, scheme, referenceDate).status, STATUS.NOT_ELIGIBLE);
    });

    test('operator: gte boundary at threshold is ELIGIBLE, 1 below is NOT_ELIGIBLE', () => {
      const scheme = { id: 's', criteria: [{ field: 'age', op: 'gte', value: 60 }] };
      assert.equal(evaluateScheme({ age: 60 }, scheme, referenceDate).status, STATUS.ELIGIBLE);
      assert.equal(evaluateScheme({ age: 59 }, scheme, referenceDate).status, STATUS.NOT_ELIGIBLE);
    });
  });

  describe('Malformed Scheme Robustness', () => {
    test('missing criteria array fails safely with NEEDS_CHECK or clear error, not false ELIGIBLE', () => {
      const scheme = { id: 's-no-crit', name: 'No Criteria Scheme' };
      const res = evaluateScheme({}, scheme, referenceDate);
      assert.ok(res);
      // Malformed scheme missing criteria should NOT be marked ELIGIBLE
      assert.equal(res.status, STATUS.NEEDS_CHECK, 'Scheme with missing criteria should yield NEEDS_CHECK');
    });

    test('unknown operator fails safely with NEEDS_CHECK or clear error, not crash', () => {
      const scheme = {
        id: 's-unknown-op',
        criteria: [{ field: 'income', op: 'unknown_magic_op', value: 100 }],
      };
      const res = evaluateScheme({ income: 50 }, scheme, referenceDate);
      assert.ok(res);
      assert.equal(res.status === STATUS.NEEDS_CHECK || res.status === STATUS.NOT_ELIGIBLE, true);
    });

    test('null target value in criterion fails safely with NEEDS_CHECK, not evaluating null as 0', () => {
      const scheme = {
        id: 's-null-val',
        criteria: [{ field: 'income', op: 'lte', value: null }],
      };
      const res = evaluateScheme({ income: 0 }, scheme, referenceDate);
      assert.ok(res);
      assert.equal(res.status, STATUS.NEEDS_CHECK, 'Criterion with null target value should yield NEEDS_CHECK');
    });

    test('null scheme in schemes list does not crash evaluateSchemes', () => {
      let didThrow = false;
      try {
        const res = evaluateSchemes({}, [null]);
        assert.ok(Array.isArray(res));
      } catch (err) {
        didThrow = true;
      }
      assert.equal(didThrow, false, 'evaluateSchemes should handle null scheme in array safely without crashing');
    });
  });
});

