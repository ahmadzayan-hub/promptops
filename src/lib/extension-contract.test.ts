import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

describe('extension release contract', () => {
  it('has gesture-only least privilege, no automatic injection or host access', () => {
    const manifest = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
    expect(manifest.permissions.sort()).toEqual(['activeTab', 'contextMenus', 'scripting'].sort());
    expect(manifest.host_permissions).toBeUndefined(); expect(manifest.content_scripts).toBeUndefined();
    for (const file of ['background.js', 'content.js', 'popup.js']) expect(readFileSync(`extension/${file}`, 'utf8')).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|clipboard\.read/);
  });
  it('discards a late popup result when raw text has changed', async () => {
    const elements = Object.fromEntries(['selection','raw','go','err','out','copy'].map(id => [id, { value: '', hidden: false, disabled: false, textContent: '', onclick: undefined as undefined | (() => Promise<void>), oninput: undefined as undefined | (() => void) }]));
    let resolve!: (v: unknown) => void;
    const response = new Promise(r => { resolve = r; });
    runInNewContext(readFileSync('extension/popup.js', 'utf8'), { document: { getElementById: (id: string) => elements[id] }, chrome: { runtime: { sendMessage: () => response } }, window: { close() {} }, navigator: {} });
    elements.raw.value = 'old brief'; const running = elements.go.onclick!();
    elements.raw.value = 'new brief'; elements.raw.oninput!();
    resolve({ ok: true, data: { final_prompt: 'OLD RESULT' } }); await running;
    expect(elements.out.hidden).toBe(true); expect(elements.copy.hidden).toBe(true); expect(elements.out.value).toBe('');
  });
});
