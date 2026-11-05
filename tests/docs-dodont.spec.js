/**
 * LUZ — the Do and don't examples of the Design tab (a11y.md TAB-20, HUB-2).
 * Each example is live LUZ markup inside a stage with `inert` and
 * `aria-hidden="true"`, captioned by a figcaption that starts with the verdict.
 * The stage is a picture: nothing in it takes focus or reaches the
 * accessibility tree, so the figure is announced by its caption alone. It is
 * still seen, so its text and parts keep the contrast of the page: axe skips
 * hidden content, so it is measured here with the stage exposed.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { isControls, routesWith } from './helpers/docs-site.js';

// The pages with a Design tab: the Do and don't section is a direct child of its panel
const DESIGN = routesWith('luz-do-dont__stage').filter((r) => routesWith('docs-view-tabs').includes(r));
// Any other page that shows a pair as a demo (a recipe of the Kinds of site area,
// inside a specimen): no Design tab, but the stage is the same picture
const DEMOS = routesWith('luz-do-dont__stage').filter((r) => !DESIGN.includes(r));
const THEMES = ['light', 'dark', 'high-contrast'];

/**
 * Open the Design tab and say where each Do and don't section is: a page's (`#do-dont`, then `#content`), or on a page of controls
 * (the pages of Form fields: one Design tab for each control, and one click moves them all) each control's
 * (`#<control>-do-dont`, then `#<control>-content`).
 */
async function openDesign(page, route) {
  if (!isControls(route)) {
    await page.goto(`${route}#design`);
    await expect(page.locator('#design-panel')).toBeVisible();
    return [{ id: 'do-dont', next: 'content' }];
  }
  await page.goto(route);
  await page.getByRole('tab', { name: 'Design' }).first().click();
  const ids = await page.locator('[id$="-do-dont"]').evaluateAll((list) => list.map((el) => el.id.slice(0, -'-do-dont'.length)));
  expect(ids.length, route).toBeGreaterThanOrEqual(2);
  for (const id of ids) await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
  return ids.map((id) => ({ id: `${id}-do-dont`, next: `${id}-content` }));
}

for (const route of DESIGN) {
  test(`${route}: the Do and don't examples are captioned pictures`, async ({ page }) => {
    const sections = await openDesign(page, route);
    // One pair for each lesson of the page (of each control): a Do, then its Don't
    const figuresOf = ({ id }) => page.locator(`#${id} ~ .luz-do-dont > figure`);
    let count = 0;
    for (const section of sections) {
      const n = await figuresOf(section).count();
      expect(n, `${route} #${section.id}`).toBeGreaterThanOrEqual(2);
      expect(n % 2, `${route} #${section.id}`).toBe(0);
      count += n;
    }

    // Every stage is inert and hidden; an id in it (a label's for) is used
    // inside that stage only, so nothing outside points into a picture
    const stages = page.locator('.luz-do-dont__stage');
    for (const stage of await stages.all()) {
      await expect(stage).toHaveAttribute('inert', '');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
    }
    const outsideRefs = await stages.evaluateAll((list) =>
      list.flatMap((stage) => [...stage.querySelectorAll('[id]')].flatMap(({ id }) =>
        [...document.querySelectorAll(`[href="#${id}"], [for="${id}"], [aria-labelledby~="${id}"], [aria-describedby~="${id}"], [aria-controls~="${id}"], [commandfor="${id}"], [popovertarget="${id}"]`)]
          .filter((el) => !stage.contains(el))
          .map((el) => `${id} ← ${el.outerHTML.slice(0, 60)}`))));
    expect(outsideRefs).toEqual([]);

    // In the accessibility tree the figure holds its caption and nothing else:
    // the verdict first, as a word (the ✓ / ✕ is CSS with empty alt text)
    expect(count, route).toBeGreaterThanOrEqual(2);
    for (const section of sections) {
      const figures = figuresOf(section);
      for (const [i, verdict] of Array.from({ length: await figures.count() }, (_, i) => [i, i % 2 ? "Don't" : 'Do'])) {
        const figure = figures.nth(i);
        const [head, ...inside] = (await figure.ariaSnapshot()).split('\n');
        expect(head, route).toMatch(/^- '?figure\b/);
        const caption = await figure.locator(':scope > figcaption').ariaSnapshot();
        expect(inside.map((l) => l.replace(/^ {2}/, '')).join('\n'), route).toBe(caption);
        expect(caption.split('\n')[0], route).toBe(`- strong: ${verdict}`);
      }
    }

    // Nothing in a stage takes focus, by script or by Tab
    const focusable = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], audio[controls], video[controls], iframe';
    const reached = await page.locator('.luz-do-dont__stage').evaluateAll((list, sel) => {
      const hits = [];
      for (const stage of list) for (const el of stage.querySelectorAll(sel)) {
        el.focus();
        if (document.activeElement === el) hits.push(el.outerHTML.slice(0, 80));
      }
      return hits;
    }, focusable);
    expect(reached).toEqual([]);
    // Tab from the section heading (a click sets the starting point) until focus
    // passes the next heading: it never stops in a stage
    for (const section of sections) {
      await page.locator(`#${section.id}`).click();
      let passed = false;
      for (let i = 0; i < 40 && !passed; i++) {
        await page.keyboard.press('Tab');
        const where = await page.evaluate((nextId) => {
          const a = document.activeElement;
          const next = document.getElementById(nextId);
          return {
            inStage: !!a?.closest('.luz-do-dont__stage'),
            passed: !!(next.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING),
          };
        }, section.next);
        expect(where.inStage, route).toBe(false);
        passed = where.passed;
      }
      expect(passed, `${route} #${section.id}: Tab left the section`).toBe(true);
    }
  });

  for (const theme of THEMES) {
    test(`${route}: the Do and don't examples keep the page's contrast in ${theme}`, async ({ page }) => {
      await openDesign(page, route);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        // axe skips hidden content: expose the stages to measure what is seen
        for (const s of document.querySelectorAll('.luz-do-dont__stage')) {
          s.removeAttribute('aria-hidden');
          s.removeAttribute('inert');
        }
      }, theme);
      // The page fades between modes for 1.4 s: measure the settled colours
      await faded(page);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .include('.luz-do-dont')
        .withRules(['color-contrast', 'link-in-text-block'])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join('; ')}`)).toEqual([]);
    });
  }
}

for (const route of DEMOS) {
  test(`${route}: a Do and don't demo is a captioned picture`, async ({ page }) => {
    await page.goto(route);
    const stages = page.locator('.luz-do-dont__stage');
    expect(await stages.count(), route).toBeGreaterThanOrEqual(2);
    for (const stage of await stages.all()) {
      await expect(stage).toHaveAttribute('inert', '');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
    }
    const figures = page.locator('.luz-do-dont > figure');
    const count = await figures.count();
    expect(count % 2, route).toBe(0);
    for (let i = 0; i < count; i++) {
      const caption = await figures.nth(i).locator(':scope > figcaption').ariaSnapshot();
      expect(caption.split('\n')[0], route).toBe(`- strong: ${i % 2 ? "Don't" : 'Do'}`);
    }
    const focusable = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], audio[controls], video[controls], iframe';
    const reached = await stages.evaluateAll((list, sel) => {
      const hits = [];
      for (const stage of list) for (const el of stage.querySelectorAll(sel)) {
        el.focus();
        if (document.activeElement === el) hits.push(el.outerHTML.slice(0, 80));
      }
      return hits;
    }, focusable);
    expect(reached).toEqual([]);
  });

  for (const theme of THEMES) {
    test(`${route}: a Do and don't demo keeps the page's contrast in ${theme}`, async ({ page }) => {
      await page.goto(route);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        for (const s of document.querySelectorAll('.luz-do-dont__stage')) {
          s.removeAttribute('aria-hidden');
          s.removeAttribute('inert');
        }
      }, theme);
      await faded(page);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .include('.luz-do-dont')
        .withRules(['color-contrast', 'link-in-text-block'])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join('; ')}`)).toEqual([]);
    });
  }
}
