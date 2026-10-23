# PromptOps · ZAIan Studio browser extension

Local, deterministic prompt composition. Not an LLM. No account or API key needed.

Select text, invoke the context menu or **Alt+Shift+P**, review the preview, then
explicitly confirm replacement. Undo is available only while the target remains
unchanged. **Alt+P** opens the manual-paste popup.

See [keyboard integration and privacy](../docs/KEYBOARD-INTEGRATION.md) for supported
fields, security boundaries, verification coverage and mobile/desktop limitations.
No automatic typing capture, network sends, auto-submit or host-wide permissions.
Existing server endpoints remain available for separately configured clients.

The shared compiler is generated from `src/lib/prompt-composer.ts`. Run
`npm run build:composer` after changing it and `npm run check:composer` before
packaging. The existing release workflow packages this directory; a release tag,
store submission and installing/enabling on a device are separate deliberate steps.
