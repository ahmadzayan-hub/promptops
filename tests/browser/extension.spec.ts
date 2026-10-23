import { test, expect, chromium, type BrowserContext, type Worker, type Page } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
let context: BrowserContext, worker: Worker, folder: string;
test.beforeAll(async () => {
  folder = mkdtempSync(join(tmpdir(), 'promptops-extension-'));
  cpSync(resolve('extension'), join(folder, 'extension'), { recursive: true });
  const path = join(folder, 'extension', 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  // Test-only permission for our local fixture. Production remains activeTab
  // only; CI does not claim to verify toolbar/OS shortcut permission grants.
  manifest.host_permissions = ['http://127.0.0.1:3000/*'];
  writeFileSync(path, JSON.stringify(manifest));
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${join(folder, 'extension')}`, `--load-extension=${join(folder, 'extension')}`] });
  [worker] = context.serviceWorkers(); if (!worker) worker = await context.waitForEvent('serviceworker');
});
test.afterAll(async () => { await context?.close(); if (folder) rmSync(folder, { recursive: true, force: true }); });
async function fixture(html: string) {
  const page = await context.newPage(); await page.goto('http://127.0.0.1:3000/studio'); await page.setContent(html); return page;
}
async function inject(page: Page, selector = 'textarea') {
  await page.locator(selector).focus();
  await page.locator(selector).evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(7, 21));
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome;
    const tabs = await api.tabs.query({ url: 'http://127.0.0.1:3000/*' });
    await api.scripting.executeScript({ target: { tabId: tabs[tabs.length - 1].id }, files: ['content.js'] });
  });
  await expect(page.locator('#promptops-review')).toHaveCount(1);
  // Await background composition and focus inside the closed shadow preview.
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('promptops-review');
  await page.waitForTimeout(300);
}

test('local selected-text preview, trusted confirm and undo preserve surrounding text', async () => {
  const page = await fixture('<textarea>before write an email after</textarea>');
  const requests: string[] = []; page.on('request', r => { if (r.method() === 'POST') requests.push(r.url()); });
  await inject(page);
  await expect(page.locator('textarea')).toHaveValue('before write an email after');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue(/before ## Role/);
  expect(await page.locator('textarea').inputValue()).toMatch(/ after$/);
  // Confirm is disabled; the next enabled control is Undo.
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue('before write an email after');
  expect(requests).toEqual([]);
  await page.keyboard.press('Escape'); await expect(page.locator('#promptops-review')).toHaveCount(0);
  await page.close();
});

test('changed target never receives stale replacement', async () => {
  const page = await fixture('<textarea>before write an email after</textarea>');
  await inject(page);
  await page.locator('textarea').evaluate((el: HTMLTextAreaElement) => { el.value = 'new user draft'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue('new user draft');
  await page.keyboard.press('Escape'); await page.close();
});

test('secure and payment fields excluded before reading', async () => {
  for (const html of ['<input type="password" value="never read me">', '<input type="text" autocomplete="cc-number" value="never read me">', '<label for="x">Card number</label><input id="x" value="never read me">', '<input type="text" inputmode="numeric" value="never read me">']) {
    const page = await fixture(html); await inject(page, 'input');
    await expect(page.locator('input')).toHaveValue('never read me');
    // Blocked dialog only has Close; no composition or replacement control.
    await page.keyboard.press('Enter'); await expect(page.locator('#promptops-review')).toHaveCount(0);
    await page.close();
  }
});

test('destination maxLength is respected without truncation or replacement', async () => {
  const page = await fixture('<textarea maxlength="40">before write an email after</textarea>');
  await inject(page); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue('before write an email after');
  await page.keyboard.press('Escape'); await page.close();
});

test('undo refuses to overwrite a later edit', async () => {
  const page = await fixture('<textarea>before write an email after</textarea>');
  await inject(page); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue(/before ## Role/);
  await page.locator('textarea').evaluate((el: HTMLTextAreaElement) => { el.value = 'later edit'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue('later edit');
  await page.keyboard.press('Escape'); await page.close();
});

test('contenteditable fields fail closed until editor selection contract is verified', async () => {
  const page = await fixture('<div contenteditable="true">write an email</div>');
  await page.locator('[contenteditable]').focus();
  await worker.evaluate(async () => { const api = (globalThis as any).chrome; const tabs = await api.tabs.query({ url: 'http://127.0.0.1:3000/*' }); await api.scripting.executeScript({ target: { tabId: tabs[tabs.length - 1].id }, files: ['content.js'] }); });
  await expect(page.locator('#promptops-review')).toHaveCount(1);
  await page.keyboard.press('Enter'); await expect(page.locator('#promptops-review')).toHaveCount(0);
  await expect(page.locator('[contenteditable]')).toHaveText('write an email'); await page.close();
});

test('controlled editor reverting the input is not treated as an applied change', async () => {
  const page = await fixture('<textarea>before write an email after</textarea>');
  await page.locator('textarea').evaluate(el => el.addEventListener('input', () => { (el as HTMLTextAreaElement).value = 'controlled editor kept this'; }));
  await inject(page); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('textarea')).toHaveValue('controlled editor kept this');
  // Both replacement and undo are disabled; Tab advances to Close, then Enter dismisses.
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('#promptops-review')).toHaveCount(0); await page.close();
});
