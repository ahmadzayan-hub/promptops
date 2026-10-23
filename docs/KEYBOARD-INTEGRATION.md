# Selected-text integration, safely

## Implemented path: browser extension

The existing Manifest V3 package now provides an explicit selected-text path:

1. Select 1–8,000 characters in a normal textarea or text input. Rich/contenteditable
   editors use the manual paste/copy popup instead.
2. Choose **PromptOps: review selected text** from the context menu, or use
   **Alt+Shift+P**. Alt+P opens the manual-paste popup.
3. Inspect the original and editable structured preview.
4. Choose **Confirm replacement** to replace only the captured selection.
5. Use **Undo** while the same target is still unchanged, or close the preview.

The compiler runs inside the extension. There are no typing-triggered requests,
clipboard reads, background key capture, persistent global tokens or automatic
message submission. Only temporary `activeTab` access is requested; there are no
host-wide permissions or automatic content scripts. No text is sent by the extension to the web
app. Confirming replacement dispatches a normal input event, so the host site
may perform its ordinary autosave; the preview discloses this. Legacy stored API settings are not read or transmitted.

Sensitive fields are rejected before reading their values: password/non-text
inputs, numeric input modes, known payment/credential/OTP metadata and labels,
and sensitive-marked containers. Plain text placed in an unlabeled ordinary field
cannot be reliably classified as sensitive. Do not select secrets for processing.

The preview uses a shadow DOM dialog, which is UI isolation, not a security
boundary against a malicious page or other extension. Confirmation must be a
trusted user event. The target must remain connected, nonsensitive and editable;
selection offsets, length and selected text must match. Input, pointer edits or
DOM changes invalidate the preview. Undo refuses to overwrite subsequent edits.
Contenteditable and rich editors fail closed and can use manual paste/copy instead.

### Verification boundary

Browser CI loads the actual MV3 background/compiler/content code into isolated
Chromium. A temporary copy of the manifest grants **only localhost fixture**
access for the test harness. The production manifest is unchanged by the test.
This verifies preview, confirmation, guarded replacement/undo and field exclusion,
not installation, store acceptance or the browser/OS granting `activeTab` from a
real toolbar/keyboard gesture. Those remain device acceptance gates. Restricted
browser pages and some embedded/rich editors are unsupported.

## Mobile and desktop plan

- **Web/PWA today:** the responsive React composer works within its own page.
  A web page cannot act as a system keyboard or edit arbitrary apps.
- **Existing Electron shell:** opens `/studio` with its global shortcut. A
  global shortcut opens the app; it does not by itself read or replace another
  app's selection. No clipboard polling or accessibility permission is added.
- **Android IME:** a genuine system keyboard requires an `InputMethodService`
  and user enablement. A future adapter should get selected text only on an
  explicit command, exclude password/input variations, preview and then commit
  only while the same editor/selection is unchanged. Native implementation,
  signing and on-device tests are not included in this web/extension release.
- **iOS keyboard extension:** requires an Xcode keyboard target and user
  enablement. Secure text fields use the system keyboard, apps can reject custom
  keyboards, and default keyboard sandboxing restricts network access. A future
  local compiler adapter should avoid Full Access unless separately justified.
  Selection/context and replacement capabilities are platform-limited; do not
  promise arbitrary full-document access or universal app support.

No new keyboard, browser extension, accessibility permission, signing key or
Full Access permission has been installed or enabled on a user's device.

## Primary platform references (checked 23 October 2026)

- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Android input methods](https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method)
- [Apple custom keyboard](https://developer.apple.com/documentation/uikit/creating-a-custom-keyboard)
- [Apple keyboard security](https://support.apple.com/en-gb/guide/security/secabd3504cd/web)
- [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)
- [Playwright extension testing](https://playwright.dev/docs/chrome-extensions)
