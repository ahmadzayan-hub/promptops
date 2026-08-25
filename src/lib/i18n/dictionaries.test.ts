import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dict } from "./dictionaries";

/**
 * Every t("some.key") in a component must exist in both locales.
 *
 * The i18n helper returns the key itself when it is missing, so a typo or a
 * newly added string renders as literal "nav.workspace" in the UI instead of
 * failing anywhere. That is exactly how the nav shipped with raw keys visible.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

const USED = new Set(
  walk("src").flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/\bt\(\s*"([a-z][a-zA-Z]*(?:\.[a-zA-Z]+)+)"/g)]
      .map((m) => m[1])
  )
);

describe("i18n dictionaries", () => {
  it("finds keys to check (guards the scan itself)", () => {
    expect(USED.size).toBeGreaterThan(10);
  });

  it.each(["en", "ar"] as const)("%s defines every key the components use", (locale) => {
    const table = dict[locale] as Record<string, string>;
    const missing = [...USED].filter((k) => !(k in table)).sort();
    expect(missing).toEqual([]);
  });

  it("has no key defined in one locale but not the other", () => {
    const en = Object.keys(dict.en);
    const ar = Object.keys(dict.ar);
    expect([...en].filter((k) => !ar.includes(k)).sort()).toEqual([]);
    expect([...ar].filter((k) => !en.includes(k)).sort()).toEqual([]);
  });
});
