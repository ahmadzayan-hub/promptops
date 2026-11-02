import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Offline rubric: never calls a provider and never treats a string match as a
// semantic or safety verdict. Evaluate saved, human-approved synthetic runs.
export function evaluate(cases, candidates) {
  if (!Array.isArray(cases) || !cases.length || !Array.isArray(candidates)) throw new Error('Expected nonempty cases and candidate arrays');
  const ids = new Set();
  for (const row of candidates) {
    if (!row || typeof row.id !== 'string' || typeof row.prompt !== 'string' || ids.has(row.id)) throw new Error('Invalid or duplicate candidate');
    ids.add(row.id);
  }
  const caseIds = new Set();
  const results = cases.map(row => {
    if (!row || typeof row.id !== 'string' || caseIds.has(row.id) || !Array.isArray(row.required) || !row.required.length || !Array.isArray(row.forbidden) || [...row.required, ...row.forbidden].some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid or duplicate gold case');
    caseIds.add(row.id);
    const candidate = candidates.find(c => c.id === row.id);
    const prompt = candidate?.prompt.normalize('NFC') ?? '';
    const missing = row.required.filter(s => !prompt.includes(s.normalize('NFC')));
    const forbidden = row.forbidden.filter(s => prompt.includes(s.normalize('NFC')));
    return { id: row.id, passed: !!candidate && !missing.length && !forbidden.length, missing, forbidden, absent: !candidate };
  });
  if (candidates.some(row => !caseIds.has(row.id))) throw new Error('Unknown candidate id');
  return { rubric: 'literal-constraints-v1', semanticAcceptance: false, passed: results.filter(r => r.passed).length, total: results.length, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/evaluate-prompts.mjs candidates.json');
    const cases = JSON.parse(readFileSync(new URL('../eval/goldset.json', import.meta.url), 'utf8'));
    const report = evaluate(cases, JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed === report.total ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
