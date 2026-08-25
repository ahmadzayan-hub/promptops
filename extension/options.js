const $ = (id) => document.getElementById(id);

(async () => {
  const cfg = await chrome.storage.sync.get([
    "apiBase", "apiKey", "live_suggestions", "locale"
  ]);
  $("apiBase").value     = cfg.apiBase || "https://promptops-kappa.vercel.app";
  $("apiKey").value      = cfg.apiKey  || "";
  $("liveOn").checked    = cfg.live_suggestions !== false;
  $("locale").value      = cfg.locale  || "en";
})();

$("save").addEventListener("click", async () => {
  const next = {
    apiBase:          $("apiBase").value.trim(),
    apiKey:           $("apiKey").value.trim(),
    live_suggestions: $("liveOn").checked,
    locale:           $("locale").value
  };
  await chrome.storage.sync.set(next);
  // Mirror to local so the content script can read settings without a second fetch
  await chrome.storage.local.set({
    base_url:          next.apiBase,
    live_suggestions:  next.live_suggestions,
    locale:            next.locale
  });
  // Tell every open tab to apply the new toggle immediately
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      try {
        chrome.tabs.sendMessage(t.id, {
          type: "TOGGLE_LIVE_SUGGESTIONS",
          value: next.live_suggestions
        });
      } catch { /* ignore tabs without our content script */ }
    }
  } catch { /* tabs API may be unavailable */ }
  $("status").textContent = "Saved.";
  setTimeout(() => ($("status").textContent = ""), 1500);
});
