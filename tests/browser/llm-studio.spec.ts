import { test, expect, type Page } from '@playwright/test';
// Entire provider boundary is mocked. These tests establish UI contracts, not model quality.
const config = { configured: true, verified: false, provider: 'groq', model: 'openai/gpt-oss-20b', workspaceConfigured: true, saved: false };
const analysis = { intent: 'Write an email without promising dates', protectedQuotes: ['Do not promise a date.'], questions: [{ id: 'q1', question: 'Who will receive it?', why: 'Tone depends on the recipient.' }] };
const result = { draft: { role: 'Writer', task: 'Write an email', context: '', constraints: 'Do not promise a date.', outputFormat: 'Email', reviewCriteria: 'Preserve meaning', assumptions: [], unresolved: ['Who will receive it?'] }, finalPrompt: 'Write an email. Do not promise a date.\n[missing: recipient]', review: { meaningPreserved: true, noInventedFacts: true, constraintsPreserved: true, coverage: [{ quote: 'Do not promise a date.', draftExcerpt: 'Do not promise a date.' }], issues: [] }, modelReview: 'passed', issues: [], repaired: false, humanReviewRequired: true };
async function mock(page: Page, fail = false) {
  await page.route('**/api/compose', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: config });
    const data = route.request().postDataJSON();
    if (fail) return route.fulfill({ status: 429, json: { unavailable: true, reason: 'quota_exhausted', retryAfter: 2 } });
    return route.fulfill({ json: { engine: 'llm', ...config, requestId: data.requestId, ...(data.phase === 'understand' ? { analysis } : { result }) } });
  });
}
test('LLM-first explicit transmission, clarification, review and human approval before copy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mock(page); const posts: string[] = []; page.on('request', r => { if (r.method() === 'POST') posts.push(r.url()); });
  await page.goto('/studio'); await page.locator('#ai-raw').fill('Write an email. Do not promise a date.'); expect(posts).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Understand my intent' })).toBeDisabled();
  await page.getByRole('checkbox').first().check(); await page.getByRole('button', { name: 'Understand my intent' }).click();
  await expect(page.getByText('Understanding to confirm')).toBeVisible(); expect(posts).toHaveLength(1);
  await page.getByRole('button', { name: 'Draft & run a separate review' }).click();
  await expect(page.locator('#ai-result')).toHaveValue(/Do not promise a date/); expect(posts).toHaveLength(2);
  await expect(page.getByRole('button', { name: 'Copy reviewed prompt' })).toBeDisabled();
  await page.getByRole('checkbox').last().check(); await expect(page.getByRole('button', { name: 'Copy reviewed prompt' })).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0)); await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  console.log('SCREENSHOT_LLM_DESKTOP_START' + (await page.screenshot({ fullPage: true })).toString('base64') + 'SCREENSHOT_LLM_DESKTOP_END');
  await page.locator('#ai-result').fill('My edit'); await expect(page.getByRole('button', { name: 'Copy reviewed prompt' })).toBeDisabled();
  await expect(page.getByText('Your edits have not been model-reviewed')).toBeVisible();
  await page.getByRole('button', { name: 'Undo edits' }).click(); await expect(page.locator('#ai-result')).toHaveValue(result.finalPrompt);
});
test('quota exhaustion keeps original, never retries or silently presents a local template as AI', async ({ page }) => {
  await mock(page, true); let posts = 0; page.on('request', r => { if (r.method() === 'POST') posts++; });
  await page.goto('/studio'); await page.locator('#ai-raw').fill('My brief'); await page.getByRole('checkbox').first().check(); await page.getByRole('button', { name: 'Understand my intent' }).click();
  await expect(page.locator('.prompt-workspace').getByRole('alert')).toContainText('quota'); await expect(page.locator('#ai-raw')).toHaveValue('My brief');
  await page.waitForTimeout(2300); expect(posts).toBe(1); await expect(page.locator('#ai-result')).toHaveCount(0);
  await page.getByRole('button', { name: 'Local alternative · no LLM' }).click(); await expect(page.locator('#raw')).toHaveValue('My brief');
});
test('cancelled late response cannot overwrite a changed brief and requires explicit new-attempt acknowledgement', async ({ page }) => {
  await page.route('**/api/compose', async route => { if (route.request().method() === 'GET') return route.fulfill({ json: config }); const data = route.request().postDataJSON(); await new Promise(r => setTimeout(r, 1000)); await route.fulfill({ json: { engine: 'llm', ...config, requestId: data.requestId, analysis } }).catch(() => {}); });
  await page.goto('/studio'); await page.locator('#ai-raw').fill('Old brief'); await page.getByRole('checkbox').first().check(); await page.getByRole('button', { name: 'Understand my intent' }).click(); await page.getByRole('button', { name: 'Cancel waiting' }).click();
  await page.locator('#ai-raw').fill('New brief'); await page.waitForTimeout(1200); await expect(page.getByText('Understanding to confirm')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Understand my intent' })).toBeDisabled(); await expect(page.getByText(/The outcome is uncertain/)).toBeVisible();
});
test('unresolved review issues never display approved or silently enable copy', async ({ page }) => {
  await page.route('**/api/compose', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: config });
    const data = route.request().postDataJSON(); return route.fulfill({ json: { engine: 'llm', ...config, requestId: data.requestId, ...(data.phase === 'understand' ? { analysis } : { result: { ...result, modelReview: 'needs_changes', issues: ['An unsupported claim remains'], repaired: true } }) } });
  });
  await page.goto('/studio'); await page.locator('#ai-raw').fill('My brief'); await page.getByRole('checkbox').first().check(); await page.getByRole('button', { name: 'Understand my intent' }).click(); await page.getByRole('button', { name: 'Draft & run a separate review' }).click();
  await expect(page.getByText('Review found unresolved issues · not approved')).toBeVisible(); await expect(page.getByRole('button', { name: 'Copy reviewed prompt' })).toBeDisabled();
});

test('Arabic LLM-first mobile layout retains the exact rough brief and shows explicit consent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('po_locale', 'ar'));
  await mock(page);
  await page.goto('/studio');
  const original = 'هل تقدر تعمل اي شي تاني وتشغل كل المشاريع اللي ينفع تشتغل';
  await page.locator('#ai-raw').fill(original);
  await expect(page.locator('#ai-raw')).toHaveValue(original);
  await expect(page.getByRole('button', { name: 'افهم قصدي', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  console.log('SCREENSHOT_LLM_MOBILE_START' + (await page.screenshot({ fullPage: true })).toString('base64') + 'SCREENSHOT_LLM_MOBILE_END');
});
test('switching modes preserves an edited local draft without a network request', async ({ page }) => {
  await mock(page); await page.goto('/studio'); await page.locator('#ai-raw').fill('Keep my idea');
  await page.getByRole('button', { name: 'Local alternative · no LLM' }).click(); await page.getByRole('button', { name: 'Build my prompt', exact: true }).click(); await page.locator('#prompt-result').fill('My local edits');
  await page.getByRole('button', { name: 'AI · understand, draft, review' }).click(); await page.getByRole('button', { name: 'Local alternative · no LLM' }).click(); await expect(page.locator('#prompt-result')).toHaveValue('My local edits');
});
