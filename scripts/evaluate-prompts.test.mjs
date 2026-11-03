import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate } from './evaluate-prompts.mjs';

const cases = JSON.parse(readFileSync(new URL('../eval/goldset.json', import.meta.url), 'utf8'));
const candidates = cases.map(c => ({ id: c.id, prompt: c.required.join('\n') }));
test('scores every bilingual gold case without claiming semantic acceptance', () => {
  assert.equal(evaluate(cases, candidates).passed, cases.length);
  assert.equal(evaluate(cases, candidates).semanticAcceptance, false);
});
test('fails omitted cases, changed constraints and forbidden inventions', () => {
  const changed = candidates.map(c => ({ ...c }));
  changed[0].prompt = 'Budget 500 USD';
  changed.pop();
  const report = evaluate(cases, changed);
  assert.equal(report.passed, cases.length - 2);
  assert.equal(report.results[0].forbidden.length, 1);
  assert.equal(report.results.at(-1).absent, true);
});
test('rejects duplicate or unknown outputs instead of inflating scores', () => {
  assert.throws(() => evaluate(cases, [...candidates, candidates[0]]));
  assert.throws(() => evaluate(cases, [...candidates, { id: 'unknown', prompt: 'x' }]));
  assert.throws(() => evaluate([], candidates));
});
