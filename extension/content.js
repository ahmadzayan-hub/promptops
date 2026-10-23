// Injected only by a context-menu command or shortcut. No typing listeners,
// network calls, clipboard reads, auto-send or document-wide input scanning.
(() => {
  const STUDIO_URL = 'https://promptops-kappa.vercel.app';
  const target = document.activeElement;
  if (globalThis.__promptopsClose) globalThis.__promptopsClose();
  const url = location.href;
  const isText = target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type === 'text');
  const sensitive = el => {
    if (!(el instanceof HTMLElement)) return true;
    const meta = ['type','autocomplete','name','id','aria-label','placeholder','data-sensitive'].map(k => el.getAttribute(k) || '').join(' ') + ' ' + [...(el.labels || [])].map(label => label.textContent).join(' ');
    if (el.getAttribute('inputmode') === 'numeric' || el.getAttribute('inputmode') === 'decimal') return true;
    return /password|passcode|secret|token|api.?key|credit|debit|card|cvc|cvv|cc-|payment|iban|account.?number|routing|one.time|otp|pin\b|كلمة.?المرور|بطاقة|رمز.?التحقق/i.test(meta) || el.closest('[data-sensitive="true"], [autocomplete^="cc-"]') !== null;
  };
  // Deny before reading any value from sensitive or unsupported fields.
  if (!isText || sensitive(target) || target.disabled || target.readOnly) {
    showMessage('Select text in a non-sensitive text field. Passwords, payment fields and rich editors are excluded. / حدد نصًا في حقل عادي غير حساس.');
    return;
  }
  const start = target.selectionStart, end = target.selectionEnd;
  const value = () => target.value;
  const original = value().slice(start, end);
  const length = value().length;
  if (!original.trim() || original.length > 8000) { showMessage('Select between 1 and 8,000 characters first. / حدد من ١ إلى ٨٠٠٠ حرف أولًا.'); return; }
  let stale = false, applied = false, currentText = original, currentLength = length;
  let internal = false;
  const invalidated = () => { if (!internal) { stale = true; status.textContent = 'The field changed. Start a new preview. / تغيّر الحقل؛ ابدأ معاينة جديدة.'; replace.disabled = true; undo.disabled = true; } };
  // Only an active, visible preview is observed, never typed content.
  target.addEventListener('input', invalidated);
  target.addEventListener('pointerdown', invalidated);
  const observer = new MutationObserver(() => { if (!internal) stale = true; });
  observer.observe(target, { childList: true, characterData: true, subtree: true, attributes: true });
  const { host, root, panel, close } = makePanel(() => { target.removeEventListener('input', invalidated); target.removeEventListener('pointerdown', invalidated); observer.disconnect(); });
  const ar = /[\u0600-\u06ff]/u.test(original);
  panel.dir = ar ? 'rtl' : 'ltr';
  const heading = document.createElement('h2'); heading.textContent = ar ? 'راجع النص قبل الاستبدال' : 'Review before replacing'; panel.append(heading);
  const note = document.createElement('p'); note.textContent = ar ? 'قواعد محلية وليست نموذجًا. الإضافة لا ترسل النص، لكن الاستبدال قد يشغّل الحفظ التلقائي المعتاد للموقع.' : 'Local rules, not an AI model. The extension sends no text. Replacement may trigger the site’s normal autosave.'; panel.append(note);
  const originalLabel = document.createElement('strong'); originalLabel.textContent = ar ? 'الأصلي' : 'Original'; panel.append(originalLabel);
  const before = document.createElement('pre'); before.textContent = original; panel.append(before);
  const preview = document.createElement('textarea'); preview.rows = 10; preview.maxLength = 30000; preview.setAttribute('aria-label', ar ? 'معاينة قابلة للتعديل' : 'Editable preview'); panel.append(preview);
  const status = document.createElement('p'); status.setAttribute('role', 'status'); panel.append(status);
  const row = document.createElement('div'); row.className = 'actions'; panel.append(row);
  const replace = button(ar ? 'وافق واستبدل المحدد' : 'Confirm replacement');
  const undo = button(ar ? 'تراجع' : 'Undo'); undo.disabled = true;
  const cancel = button(ar ? 'إغلاق' : 'Close');
  row.append(replace, undo, cancel);
  cancel.onclick = close;
  replace.disabled = true;
  function matches() {
    return !stale && target.isConnected && location.href === url && !sensitive(target) && !target.disabled && !target.readOnly &&
      (target.selectionStart === start && target.selectionEnd === start + currentText.length) && value().length === currentLength && value().slice(start, start + currentText.length) === currentText;
  }
  function write(text) {
    if (isText && target.maxLength >= 0 && currentLength - currentText.length + text.length > target.maxLength) { status.textContent = ar ? 'النص أطول من الحد المسموح لهذا الحقل. اختصر المعاينة أو استخدم النسخ اليدوي.' : 'The result exceeds this field’s character limit. Shorten the preview or copy manually.'; return false; }
    if (!matches()) { status.textContent = ar ? 'تغيّر الحقل. أعد تحديد النص وابدأ من جديد.' : 'The field changed. Select the text again and start a new preview.'; replace.disabled = true; undo.disabled = true; return false; }
    internal = true; observer.disconnect();
    {
      const next = value().slice(0, start) + text + value().slice(start + currentText.length);
      const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(target, next);
      target.setSelectionRange(start, start + text.length);
    }
    currentLength += text.length - currentText.length; currentText = text;
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
    internal = false;
    observer.observe(target, { childList: true, characterData: true, subtree: true, attributes: true });
    // A controlled editor can replace/revert its DOM. Fail closed on later actions.
    if (!target.isConnected || target.disabled || target.readOnly || sensitive(target) || value().length !== currentLength || value().slice(start, start + text.length) !== text) {
      stale = true; replace.disabled = true; undo.disabled = true;
      status.textContent = ar ? 'المحرر لم يحتفظ بالتغيير. تحقق من الحقل واستخدم النسخ اليدوي.' : 'The editor did not preserve the change. Check the field and use manual copy instead.';
      return false;
    }
    return true;
  }
  replace.onclick = event => {
    if (!event.isTrusted) return;
    if (applied || !preview.value.trim()) return;
    if (write(preview.value)) { applied = true; replace.disabled = true; preview.disabled = true; undo.disabled = false; status.textContent = ar ? 'استُبدل النص المحدد فقط. الإضافة لم تنفّذ أي طلب شبكي.' : 'Only the selected text was replaced. The extension made no network request.'; }
  };
  undo.onclick = event => {
    if (!event.isTrusted) return;
    if (applied && write(original)) { applied = false; undo.disabled = true; replace.disabled = false; preview.disabled = false; status.textContent = ar ? 'استُعيد النص الأصلي.' : 'Original selection restored.'; }
  };
  preview.addEventListener('input', () => { replace.disabled = applied || !preview.value.trim(); });
  chrome.runtime.sendMessage({ type: 'ENHANCE', payload: { raw_prompt: original } }).then(response => {
    if (!host.isConnected) return;
    if (!response?.ok || typeof response.data?.final_prompt !== 'string') { status.textContent = 'Could not compose this selection.'; return; }
    preview.value = response.data.final_prompt; replace.disabled = false; preview.focus();
  }).catch(() => { status.textContent = 'Extension unavailable. Close and try again.'; });
  // Keep the canonical app link available without sending any selected text.
  const link = document.createElement('a'); link.href = STUDIO_URL; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = 'PromptOps Studio'; panel.append(link);
  function button(label) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; return b; }
  function makePanel(cleanup = () => {}) {
    const host = document.createElement('div'); host.id = 'promptops-review';
    // Closed shadow tree isolates text from ordinary page scripts; not a
    // security boundary against a malicious site or browser extension.
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style'); style.textContent = ':host{position:fixed;inset:0;z-index:2147483647;background:#00150d88;display:grid;place-items:center;font:14px system-ui;color:#152a28}*{box-sizing:border-box}section{background:#fff;border:1px solid #dce6df;border-radius:18px;padding:22px;width:min(620px,94vw);max-height:90vh;overflow:auto;box-shadow:0 20px 70px #0004}h2{font-size:20px;margin:0 0 12px}p{line-height:1.6;color:#586d69;font-size:12px}pre{white-space:pre-wrap;max-height:100px;overflow:auto;background:#eff6f0;padding:12px;border-radius:8px}textarea{width:100%;resize:vertical;border:1px solid #b3c8ba;border-radius:10px;padding:12px;font:13px/1.7 system-ui}button{padding:12px;border:1px solid #b3c8ba;border-radius:9px;background:#fff;color:#152a28;cursor:pointer}button:first-child{background:#176b50;color:white}button:disabled{opacity:.45;cursor:not-allowed}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}a{color:#176b50}button:focus-visible,a:focus-visible,textarea:focus-visible{outline:3px solid #67bc99;outline-offset:2px}';
    const panel = document.createElement('section'); panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label','PromptOps review'); panel.tabIndex = -1;
    root.append(style, panel); document.documentElement.append(host);
    const close = () => { cleanup(); host.remove(); if (globalThis.__promptopsClose === close) delete globalThis.__promptopsClose; if (target?.isConnected) target.focus(); };
    globalThis.__promptopsClose = close;
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const items = [...panel.querySelectorAll('button:not(:disabled), textarea:not(:disabled), a[href]')];
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && root.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && root.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    panel.focus();
    return { host, root, panel, close };
  }
  function showMessage(text) {
    const { panel, close } = makePanel();
    const p = document.createElement('p'); p.textContent = text; p.setAttribute('role','status');
    const b = document.createElement('button'); b.type='button'; b.textContent='Close / إغلاق'; b.onclick=close; panel.append(p,b); b.focus();
  }
})();
