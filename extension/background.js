import { composePrompt } from './composer.js';

async function openSelection(tabId, frameId = 0) {
  if (!Number.isInteger(tabId)) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['content.js'] });
  } catch {
    // Restricted pages cannot be injected. Open the local popup for manual paste.
    try { await chrome.action.openPopup(); } catch { /* browser may require another gesture */ }
  }
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: 'promptops-selection', title: 'PromptOps: review selected text', contexts: ['selection', 'editable'] }));
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'promptops-selection') void openSelection(tab?.id, info.frameId ?? 0);
});
chrome.commands.onCommand.addListener(async command => {
  if (command !== 'improve-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  void openSelection(tab?.id);
});
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (msg?.type === 'ENHANCE') {
    try {
      const result = composePrompt({ raw: msg.payload?.raw_prompt, purpose: msg.payload?.purpose ?? 'auto' });
      respond({ ok: true, data: { ...result, final_prompt: result.finalPrompt } });
    } catch { respond({ ok: false, error: 'Select or paste between 1 and 8,000 characters.' }); }
  } else if (msg?.type === 'OPEN_SELECTION' && !sender.tab) {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => openSelection(tab?.id));
    respond({ ok: true });
  } else respond({ ok: false, error: 'Unsupported action' });
  return false;
});
