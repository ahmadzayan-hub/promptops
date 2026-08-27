#!/usr/bin/env node
/**
 * Every shipped client must default to this app's own deployment.
 *
 * The desktop, extension and mobile clients each hardcode a fallback URL.
 * For a long time all four pointed at desktop-tutorial-kappa-five.vercel.app,
 * which serves a different product entirely — so an installed ZAIan Studio
 * opened an MBA study platform. Nothing failed: the clients built, the app
 * built, CI was green. The only symptom was on a user's screen.
 *
 * This asserts the fallback is right, and that no client mentions the old
 * host at all. It is a build-time check because the alternative is finding
 * out from someone who installed it.
 */

import { readFileSync } from "node:fs";

const CANONICAL = "https://promptops-kappa.vercel.app";

/** Hosts a client must never reference: they belong to other products. */
const FORBIDDEN = ["desktop-tutorial", "tweenz.ae", "maktab-sepia-rho"];

/** file → how many times the canonical URL must appear in it. */
const CLIENTS = {
  "desktop/main.js": 1,
  "mobile/capacitor.config.ts": 1,
  "extension/content.js": 1,
  "extension/options.js": 1
};

const problems = [];

for (const [file, expected] of Object.entries(CLIENTS)) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    problems.push(`${file}: missing — a client lost its entry point`);
    continue;
  }

  const found = text.split(CANONICAL).length - 1;
  if (found !== expected) {
    problems.push(
      `${file}: expected ${expected} reference(s) to ${CANONICAL}, found ${found}`
    );
  }

  for (const host of FORBIDDEN) {
    if (text.includes(host)) {
      problems.push(`${file}: still references "${host}" — that is another product`);
    }
  }
}

if (problems.length > 0) {
  console.error("Client endpoint check failed:\n");
  for (const p of problems) console.error("  - " + p);
  console.error(
    "\nA client pointing at the wrong host builds and runs fine. It just " +
    "opens somebody else's app."
  );
  process.exit(1);
}

console.log(
  `Client endpoints OK — ${Object.keys(CLIENTS).length} clients all default to ${CANONICAL}`
);
