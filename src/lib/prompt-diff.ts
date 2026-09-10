/**
 * Lightweight before/after diff used by the workspace to teach the user what
 * the orchestrator added.
 *
 * Strategy: line-level LCS (longest common subsequence) over the trimmed
 * input vs trimmed output. Lines present in the output but not the input are
 * "added"; lines present in both are "context". We don't bother emitting
 * "removed" lines — the orchestrator never removes user content meaningfully,
 * so showing additions is the educational signal.
 *
 * Pure function, no DOM. The renderer is in components/PromptDiff.tsx.
 */

export type DiffLineKind = "context" | "added";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

function splitLines(s: string): string[] {
  return s.replace(/\r\n/g, "\n").split("\n");
}

/** Compute an LCS between two arrays of strings, returning the indices into
 *  the second array that are NOT in the LCS — those are the "added" lines. */
function lcsAddedSet(a: string[], b: string[]): Set<number> {
  const n = a.length, m = b.length;
  // Bound the cost: if either side is huge, fall back to "everything new"
  // so the UI never freezes. 5k * 5k cells = 25M, comfortable budget.
  if (n > 5000 || m > 5000) {
    const all = new Set<number>();
    for (let i = 0; i < m; i++) all.add(i);
    return all;
  }
  // dp[i][j] = LCS length of a[0..i) and b[0..j)
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      dp[i][j] = ai === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Walk back and mark which b-lines are *not* part of the LCS
  const added = new Set<number>();
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { i--; }
    else { added.add(j - 1); j--; }
  }
  while (j > 0) { added.add(j - 1); j--; }
  return added;
}

/** Returns one DiffLine per line in `final`, classified relative to `raw`. */
export function diffPrompts(raw: string, final: string): DiffLine[] {
  const a = splitLines(raw.trim());
  const b = splitLines(final.trim());
  const addedIdx = lcsAddedSet(a, b);
  return b.map((text, i) => ({
    kind: addedIdx.has(i) ? "added" : "context",
    text
  }));
}

/** Returns counts useful for headline stats next to the diff. */
export function diffSummary(raw: string, final: string): {
  added: number;
  total: number;
  pct: number;
} {
  const lines = diffPrompts(raw, final);
  const added = lines.filter((l) => l.kind === "added").length;
  const total = lines.length || 1;
  return { added, total, pct: Math.round((added / total) * 100) };
}
