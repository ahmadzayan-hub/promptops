// ZAIan Studio — content script
// Two enhancements per supported AI site:
//
//   1. ✨ Enhance button next to the composer — full polish flow
//      (existing behaviour, kept for backwards compatibility).
//
//   2. Live "Grammarly-style" suggestion bubble that appears above the
//      composer while the user types. Suggestions come from POSTing the
//      current draft to /api/v1/suggest on the configured ZAIan Studio
//      host, debounced 350 ms. Tapping a chip appends the suggestion's
//      markdown to the composer — never replaces what the user wrote.
//
// Settings (host + auto-suggest enabled) are read from chrome.storage.

(function () {
  const HOST = location.hostname;
  const TARGET_MODEL = (() => {
    if (HOST.includes("openai") || HOST.includes("chatgpt")) return "chatgpt";
    if (HOST.includes("claude"))                              return "claude";
    if (HOST.includes("copilot"))                             return "copilot";
    if (HOST.includes("gemini") || HOST.includes("bard"))     return "gemini";
    return "generic";
  })();

  const DEFAULT_BASE = "https://promptops-kappa.vercel.app";

  let cachedBase = DEFAULT_BASE;
  let liveOn = true;          // user-toggleable
  let uiLocale = "en";

  // Pull settings from extension storage (set in options.html)
  try {
    chrome.storage?.local?.get(
      ["base_url", "live_suggestions", "locale"],
      (s) => {
        if (s?.base_url)                            cachedBase = s.base_url;
        if (typeof s?.live_suggestions === "boolean") liveOn = s.live_suggestions;
        if (s?.locale)                              uiLocale = s.locale;
      }
    );
  } catch { /* ignore — extension storage may not be available in all contexts */ }

  // ───────────────────────────────────────────────────────────────────────────
  // Composer detection
  // ───────────────────────────────────────────────────────────────────────────
  function findInput() {
    return (
      document.querySelector('textarea[data-id="root"]') ||
      document.querySelector('textarea[placeholder*="Message" i]') ||
      document.querySelector('textarea[placeholder*="Send" i]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector("textarea")
    );
  }
  function readValue(el)  { return el.tagName === "TEXTAREA" ? el.value : el.innerText; }
  function writeValue(el, value) {
    if (el.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.innerText = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }
  function appendValue(el, suffix) {
    const cur = readValue(el);
    writeValue(el, (cur || "") + suffix);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ✨ Enhance button (full pipeline) — unchanged behaviour
  // ───────────────────────────────────────────────────────────────────────────
  function ensureEnhanceButton(el) {
    if (el.dataset.zaianEnhanceInjected === "1") return;
    el.dataset.zaianEnhanceInjected = "1";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "po-enhance-btn";
    btn.textContent = "✨ Enhance";
    btn.title = "Polish with ZAIan Studio";

    const wrap = document.createElement("div");
    wrap.className = "po-wrap";
    wrap.appendChild(btn);
    el.parentElement?.appendChild(wrap);

    btn.addEventListener("click", async () => {
      const raw = readValue(el).trim();
      if (raw.length < 3) return;
      btn.disabled = true;
      btn.textContent = "Thinking…";
      try {
        const resp = await chrome.runtime.sendMessage({
          type: "ENHANCE",
          payload: { raw_prompt: raw, target_model: TARGET_MODEL }
        });
        if (!resp?.ok) throw new Error(resp?.error || "enhance failed");
        writeValue(el, resp.data.final_prompt);
        btn.textContent = "✓ Enhanced";
      } catch (e) {
        console.error("[ZAIan Studio]", e);
        btn.textContent = "Error";
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = "✨ Enhance";
        }, 1500);
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Live suggestions bubble (Grammarly-style)
  // ───────────────────────────────────────────────────────────────────────────
  let suggestEl   = null;
  let suggestTmr  = null;
  let lastDraft   = "";
  let dismissed   = new Set();

  function ensureBubble(anchor) {
    if (suggestEl) return suggestEl;
    suggestEl = document.createElement("div");
    suggestEl.className = "po-bubble";
    suggestEl.setAttribute("role", "region");
    suggestEl.setAttribute("aria-label", "ZAIan Studio suggestions");
    suggestEl.style.display = "none";
    document.body.appendChild(suggestEl);
    positionBubble(anchor);
    window.addEventListener("scroll",  () => positionBubble(anchor), { passive: true });
    window.addEventListener("resize",  () => positionBubble(anchor));
    return suggestEl;
  }

  function positionBubble(anchor) {
    if (!suggestEl || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const top  = Math.max(8, r.top + window.scrollY - 8 - suggestEl.offsetHeight);
    const left = Math.min(
      window.innerWidth - 16 - suggestEl.offsetWidth,
      Math.max(8, r.left + window.scrollX)
    );
    suggestEl.style.top  = top + "px";
    suggestEl.style.left = left + "px";
  }

  function renderBubble(suggestions, el) {
    if (!suggestEl) return;
    if (!suggestions.length) { suggestEl.style.display = "none"; return; }

    suggestEl.innerHTML = "";

    const head = document.createElement("div");
    head.className = "po-bubble-head";
    head.textContent = "✨ Quick suggestions";
    suggestEl.appendChild(head);

    suggestions.forEach((s) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "po-bubble-chip";
      chip.title = s.preview;
      chip.textContent = s.label;
      chip.addEventListener("click", () => {
        appendValue(el, s.append);
        dismissed.add(s.id);
        scheduleSuggest(el);
      });

      const x = document.createElement("button");
      x.type = "button";
      x.className = "po-bubble-x";
      x.textContent = "×";
      x.title = "Dismiss";
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        dismissed.add(s.id);
        scheduleSuggest(el);
      });

      const grp = document.createElement("span");
      grp.className = "po-bubble-grp";
      grp.appendChild(chip);
      grp.appendChild(x);
      suggestEl.appendChild(grp);
    });

    suggestEl.style.display = "flex";
    positionBubble(el);
  }

  async function fetchSuggestions(draft) {
    try {
      const res = await fetch(`${cachedBase}/api/v1/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, target_model: TARGET_MODEL, locale: uiLocale })
      });
      if (!res.ok) return [];
      const j = await res.json();
      return Array.isArray(j?.suggestions) ? j.suggestions : [];
    } catch {
      return [];
    }
  }

  function scheduleSuggest(el) {
    if (!liveOn) return;
    if (suggestTmr) clearTimeout(suggestTmr);
    suggestTmr = setTimeout(async () => {
      const draft = readValue(el).trim();
      if (draft.length < 12) {
        if (suggestEl) suggestEl.style.display = "none";
        return;
      }
      if (draft === lastDraft) return;
      lastDraft = draft;
      const list = await fetchSuggestions(draft);
      const visible = list.filter((s) => !dismissed.has(s.id)).slice(0, 3);
      ensureBubble(el);
      renderBubble(visible, el);
    }, 350);
  }

  function ensureLiveSuggestions(el) {
    if (el.dataset.zaianLiveInjected === "1") return;
    el.dataset.zaianLiveInjected = "1";

    el.addEventListener("input",  () => scheduleSuggest(el));
    el.addEventListener("focus",  () => scheduleSuggest(el));
    el.addEventListener("blur",   () => {
      // Hide after a beat so the user can click a chip
      setTimeout(() => {
        if (suggestEl && document.activeElement !== el && !suggestEl.contains(document.activeElement)) {
          suggestEl.style.display = "none";
        }
      }, 200);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Boot — observe DOM changes (AI sites are SPAs)
  // ───────────────────────────────────────────────────────────────────────────
  function attach() {
    const el = findInput();
    if (!el) return;
    ensureEnhanceButton(el);
    ensureLiveSuggestions(el);
  }

  const observer = new MutationObserver(attach);
  observer.observe(document.body, { childList: true, subtree: true });

  attach();

  // Listen for live-toggle messages from the popup
  try {
    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg?.type === "TOGGLE_LIVE_SUGGESTIONS") {
        liveOn = !!msg.value;
        if (!liveOn && suggestEl) suggestEl.style.display = "none";
      }
    });
  } catch { /* ignore */ }
})();
