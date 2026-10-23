const $ = id => document.getElementById(id);
let revision = 0;
$('selection').onclick = async () => { await chrome.runtime.sendMessage({ type: 'OPEN_SELECTION' }); window.close(); };
$('go').onclick = async () => {
  const requestRevision = revision;
  const raw = $('raw').value;
  $('err').textContent = ''; $('go').disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ENHANCE', payload: { raw_prompt: raw } });
    if (revision !== requestRevision || $('raw').value !== raw) return;
    if (!response?.ok || typeof response.data?.final_prompt !== 'string') throw new Error(response?.error || 'Could not compose this text.');
    $('out').value = response.data.final_prompt; $('out').hidden = false; $('copy').hidden = false;
  } catch(e) { if (revision === requestRevision) $('err').textContent = e.message; }
  finally { $('go').disabled = false; }
};
$('raw').oninput = () => { revision++;  $('copy').hidden = true; $('out').hidden = true; };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText($('out').value); $('err').textContent = 'Copied.'; }
  catch { $('err').textContent = 'Clipboard blocked. Select and copy the preview manually.'; }
};
