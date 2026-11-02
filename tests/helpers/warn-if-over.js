/**
 * The page and AI-reading limits are warnings for now (owner, 2026-11-02): the
 * docs pages, llms.txt and llms-full.txt, the five prompts and the debug page
 * are to be optimised later. Their numbers stay in budgets.json (and in the
 * constants of the tests) as the targets; a size over its target prints a
 * visible warning in the log and never fails a test. The tests of tokens, core
 * and the check CLI keep failing over their ceilings: they do not use this.
 */

/**
 * Prints `⚠ <name>: <bytes> B, over its target of <limit> B (warning, to optimise)` when `bytes > limit`.
 * Returns whether it was over. It never throws.
 */
export function warnIfOver(name, bytes, limit) {
  const over = bytes > limit;
  if (over) console.warn(`⚠ ${name}: ${bytes} B, ${bytes - limit} B over its target of ${limit} B (warning, to optimise)`);
  return over;
}
