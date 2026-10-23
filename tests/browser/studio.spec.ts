import { test, expect } from '@playwright/test';
const raw = 'هل تقدر تعمل اي شي تاني وتشغل كل المشاريع اللي ينفع تشتغل';

test('Arabic mobile screenshot regression, edit, undo, stale preview and local privacy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('po_locale', 'ar'));
  const errors: string[] = []; const transmissions: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.method() === 'POST') transmissions.push(r.url()); });
  await page.goto('/studio');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.locator('#raw').fill(raw);
  await page.getByRole('button', { name: 'صِغ البرومبت', exact: true }).click();
  await expect(page.locator('#prompt-result')).toContainText('');
  await expect(page.locator('#prompt-result')).toHaveValue(new RegExp(raw));
  expect(transmissions).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const compiled = await page.locator('#prompt-result').inputValue();
  await page.locator('#prompt-result').fill('تعديل يدوي');
  await page.getByRole('button', { name: 'تراجع عن التعديلات' }).click();
  await expect(page.locator('#prompt-result')).toHaveValue(compiled);
  await page.locator('#raw').fill(raw + ' اليوم');
  await expect(page.getByRole('button', { name: 'انسخ البرومبت' })).toBeDisabled();
  await page.getByRole('button', { name: 'حدّث البرومبت' }).click();
  await expect(page.getByRole('button', { name: 'انسخ البرومبت' })).toBeEnabled();
  console.log('SCREENSHOT_MOBILE_START' + (await page.screenshot()).toString('base64') + 'SCREENSHOT_MOBILE_END');
});

test('English desktop details, download and honest server error keep draft', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio');
  await page.locator('#raw').fill('Write an email about a delayed delivery');
  await page.getByText('Add details · optional', { exact: true }).click();
  await page.locator('#context').fill('The delivery is delayed. No new date is known.');
  await page.locator('#audience').fill('Our customer');
  await page.locator('#constraints').fill('Do not promise a date');
  await page.locator('#format').fill('A short email');
  await page.getByRole('button', { name: 'Build my prompt', exact: true }).click();
  const generated = await page.locator('#prompt-result').inputValue();
  expect(generated).toContain('Do not promise a date');
  await expect(page.getByText('Details you can still add')).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .txt' }).click();
  expect((await downloaded).suggestedFilename()).toBe('promptops-prompt.txt');
  await page.route('**/api/sessions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unavailable: true, reason: 'backend_not_configured' }) }));
  await page.getByText('Use my connected workspace', { exact: true }).click();
  await page.getByRole('button', { name: 'Send & refine with Ollama' }).click();
  await expect(page.getByRole('alert')).toContainText('could not complete');
  await expect(page.locator('#prompt-result')).toHaveValue(generated);
  await expect(page.locator('#raw')).toHaveValue('Write an email about a delayed delivery');
  console.log('SCREENSHOT_DESKTOP_START' + (await page.screenshot()).toString('base64') + 'SCREENSHOT_DESKTOP_END');
});

test('cancelled server request and changed brief cannot overwrite newer local result', async ({ page }) => {
  await page.goto('/studio');
  await page.locator('#raw').fill('Plan a project');
  await page.getByRole('button', { name: 'Build my prompt', exact: true }).click();
  await page.route('**/api/sessions', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: { id: 'test', prompt_versions: [{ version: 1, final_prompt: 'STALE SERVER RESULT' }] } }) }).catch(() => {});
  });
  await page.getByText('Use my connected workspace', { exact: true }).click();
  await page.getByRole('button', { name: 'Send & refine with Ollama' }).click();
  await page.getByRole('button', { name: 'Cancel request' }).click();
  await page.locator('#raw').fill('Write a new email');
  await page.getByRole('button', { name: 'Update my prompt' }).click();
  await page.waitForTimeout(1700);
  await expect(page.locator('#prompt-result')).not.toHaveValue('STALE SERVER RESULT');
  await expect(page.locator('#prompt-result')).toHaveValue(/Write a new email/);
});

test('copy denial is actionable and never clears the prompt', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } }));
  await page.goto('/studio');
  await page.locator('#raw').fill('hello');
  await page.getByRole('button', { name: 'Build my prompt', exact: true }).click();
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Clipboard');
  await expect(page.locator('#prompt-result')).toHaveValue(/hello/);
});

test('compiler remains usable with blocked preference storage', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('storage blocked'); }; Storage.prototype.setItem = () => { throw new Error('storage blocked'); }; });
  await page.goto('/studio');
  await page.locator('#raw').fill('hello');
  await page.getByRole('button', { name: 'Build my prompt', exact: true }).click();
  await expect(page.locator('#prompt-result')).toHaveValue(/hello/);
});

test('manual changes to a saved server version are labelled unsynced', async ({ page }) => {
  await page.goto('/studio'); await page.locator('#raw').fill('write an email');
  await page.getByRole('button', { name: 'Build my prompt', exact: true }).click();
  await page.route('**/api/sessions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: { id: 'fixture', prompt_versions: [{ version: 1, final_prompt: 'Model output for review' }] } }) }));
  await page.getByText('Use my connected workspace', { exact: true }).click(); await page.getByRole('button', { name: 'Send & refine with Ollama' }).click();
  await expect(page.locator('#prompt-result')).toHaveValue('Model output for review');
  await page.locator('#prompt-result').fill('My later edit');
  await expect(page.getByText('Server version saved · your later edits are local, not synced').first()).toBeVisible();
  await expect(page.getByText('Original wording retained without changes')).toHaveCount(0);
});
