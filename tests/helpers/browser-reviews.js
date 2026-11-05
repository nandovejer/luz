/**
 * The review record, dev/BROWSER-REVIEWS.md: a row is waiting in "Open" (Scope | Files | What to look at | Browser) or has been
 * reviewed in both browsers and is in "Closed" (Closed | Scope | Result). A test that says a feature has a review row finds it
 * in either section: while it waits, with its files, what to look at and the browser that is missing; once reviewed, with
 * its date, its scope (which names its files) and a result that says Safari and Firefox.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

const repo = fileURLToPath(new URL("../../", import.meta.url));

const section = (text, name) => {
  const start = text.search(new RegExp(`^## ${name}\\s*$`, "m"));
  if (start === -1) return "";
  return text.slice(start).split(/\n## /)[0];
};

/**
 * The row of the record that `predicate(line)` finds, in "Open" or in "Closed". Returns
 * { section: "Open", scope, files, look, browser } or { section: "Closed", date, scope, result }, or undefined.
 */
export function reviewRow(predicate) {
  const text = readFileSync(`${repo}dev/BROWSER-REVIEWS.md`, "utf-8");
  for (const name of ["Open", "Closed"]) {
    const line = section(text, name).split("\n").find((l) => l.startsWith("|") && predicate(l));
    if (!line) continue;
    const cells = line.split("|").map((c) => c.trim()).slice(1, -1);
    return name === "Open"
      ? { section: name, scope: cells[0], files: cells[1], look: cells[2], browser: cells[3] }
      : { section: name, date: cells[0], scope: cells[1], result: cells[2] };
  }
  return undefined;
}

/**
 * Say what a row must hold, for either section.
 * @param {ReturnType<typeof reviewRow>} row
 * @param {{ files?: string[], look?: RegExp[], browser?: string | RegExp, closedFiles?: string[] }} want
 *   files: names in the Files cell of an Open row; closedFiles: names in the scope of a Closed row (its files are in
 *   parentheses there; default: files); look: patterns in what to look at (Open only: a closed row has a result instead)
 */
export function expectReviewRow(row, { files = [], look = [], browser, closedFiles = files } = {}) {
  expect(row, "a row of the review record, in Open or in Closed").toBeTruthy();
  if (row.section === "Open") {
    for (const file of files) expect(row.files, file).toContain(file);
    for (const pattern of look) expect(row.look, "what to look at").toMatch(pattern);
    expect(row.look.length, "what to look at").toBeGreaterThan(40);
    if (browser instanceof RegExp) expect(row.browser).toMatch(browser);
    else if (browser) expect(row.browser).toBe(browser);
    expect(row.browser).toMatch(/Safari|Firefox/);
  } else {
    expect(row.date, "the date of the review").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const file of closedFiles) expect(row.scope, `${file} in the scope of the closed row`).toContain(file);
    expect(row.result, "a closed row has a result for both browsers").toMatch(/Safari/);
    expect(row.result, "a closed row has a result for both browsers").toMatch(/Firefox/);
  }
}
