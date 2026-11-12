/**
 * LUZ docs site — the print preview of /docs/get-started/print/ (R5).
 *
 * The page carries a <template data-docs-print-preview>: the opener and a core
 * modal (a native <dialog class="luz-modal">), with every string in the
 * page's language. Without JavaScript the template is never opened and the
 * page says Ctrl+P in words. With it, the opener is inserted, and the first
 * time it is pressed the dialog opens and a frame is loaded in it: a fixed
 * sample page of LUZ pieces (assets/print-sample.html), on one A4-wide sheet.
 *
 * How a screen shows print rules: the frame is same-origin and sandboxed
 * (`allow-same-origin` only, so no script runs in it). When it has loaded, its
 * CSSOM is read, every rule that is in an `@media print` (also inside
 * `@layer`, `@supports` or another `@media`) is written again, in the same
 * wrappers and in the same order, in a <style> of the frame, with no media
 * query at all: it applies on a screen as it would on paper. Nothing is typed
 * or copied by hand, and the layers keep their order, so the rules of the
 * layer luz.print still come last, and a rule in no layer still wins over it.
 *
 * It is an approximation: a screen has no @page margins, no page breaks and no
 * header repeated on each page. The dialog says so.
 */

/** The sample page: a file of the docs app, which the pages build ships as an asset. */
const SAMPLE = new URL("./assets/print-sample.html", import.meta.url).href;

/* ---- Print rules, on a screen ------------------------------------------ */

/** True when a media query list is for print: `print`, `print and (…)`, `only print`, not `not print`. */
function isPrint(mediaText) {
  return /\bprint\b/.test(mediaText) && !/\bnot\s+print\b/.test(mediaText);
}

/** The opening of a grouping rule (`@layer luz.print {`), from its own text. */
function opening(rule) {
  return rule.cssText.slice(0, rule.cssText.indexOf("{") + 1);
}

/**
 * The print rules of the sheets of a document, as CSS text: each one inside
 * the wrappers (layer, supports, media) it has in its sheet, and in source order.
 * A sheet the page cannot read (another origin) is skipped.
 */
export function printRules(doc) {
  const out = [];
  const walk = (rules, wrappers, print) => {
    for (const rule of rules) {
      if (rule.styleSheet && rule.media) {
        // @import: its own sheet, under its own media query
        walk(rule.styleSheet.cssRules, wrappers, print || isPrint(rule.media.mediaText));
      } else if (rule.cssRules && rule.media) {
        // @media: print rules are written without the query; any other keeps it as a wrapper
        const text = rule.media.mediaText;
        if (isPrint(text)) walk(rule.cssRules, wrappers, true);
        else walk(rule.cssRules, [...wrappers, opening(rule)], print);
      } else if (rule.cssRules && !rule.selectorText && !rule.cssText.startsWith("@keyframes")) {
        // @layer block, @supports, @container (a @keyframes is a rule of its own)
        walk(rule.cssRules, [...wrappers, opening(rule)], print);
      } else if (print) {
        out.push(`${wrappers.join(" ")} ${rule.cssText} ${"}".repeat(wrappers.length)}`.trim());
      }
    }
  };
  for (const sheet of doc.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walk(rules, [], isPrint(sheet.media.mediaText));
  }
  return out.join("\n");
}

/* ---- The frames --------------------------------------------------------- */

/** Resolves when a frame (or a link) has loaded, or failed: the preview shows what it has. */
function settled(target) {
  return new Promise((resolve) => {
    target.addEventListener("load", resolve, { once: true });
    target.addEventListener("error", resolve, { once: true });
  });
}

/**
 * Resolves when a <link> in the sample has loaded, or failed. WebKit sends no load or error event for a <link> in a
 * frame whose scripts are sandboxed, so its sheet (null until it has loaded) is also polled, for a few seconds.
 */
function linked(link) {
  return new Promise((resolve) => {
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", resolve, { once: true });
    const started = Date.now();
    const poll = () => (link.sheet || Date.now() - started > 8000 ? resolve() : setTimeout(poll, 25));
    poll();
  });
}

/** The sample has no <link>: it takes the stylesheets of the page that opened it. */
async function linkSheets(doc) {
  const links = [...document.querySelectorAll('link[rel~="stylesheet"]')].map((own) => {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = own.href;
    if (own.media) link.media = own.media;
    return link;
  });
  const loaded = links.map(linked);
  doc.head.append(...links);
  await Promise.all(loaded);
}

/** The frame is as tall as its page: the sheet around it scrolls, the frame never does. */
function fit(frame) {
  const doc = frame.contentDocument;
  frame.style.setProperty("--docs-print-height", `${Math.ceil(doc.documentElement.getBoundingClientRect().height)}px`);
}

async function prepare(frame) {
  await settled(frame);
  const doc = frame.contentDocument;
  if (!doc?.documentElement) throw new Error("no document");
  await linkSheets(doc);
  const style = doc.createElement("style");
  style.textContent = printRules(doc);
  doc.head.append(style);
  // Paper has no transitions: a color that was changing when the rules came in is where it ends
  doc.getAnimations().forEach((animation) => animation.finish());
  // A picture of a page, not a page: nothing in it is a link or a control
  doc.documentElement.setAttribute("inert", "");
  fit(frame);
  const view = doc.defaultView;
  if (view.ResizeObserver) new view.ResizeObserver(() => fit(frame)).observe(doc.documentElement);
  await doc.fonts?.ready;
  fit(frame);
}

/** The sheet (a region that scrolls) around the paper around the frame; returns the frame. */
function buildSheet(stage) {
  const data = stage.dataset;
  const sheet = document.createElement("div");
  sheet.className = "docs-print__sheet";
  sheet.tabIndex = 0;
  sheet.setAttribute("role", "region");
  sheet.setAttribute("aria-label", data.luzLabelSheet);
  const paper = document.createElement("div");
  paper.className = "docs-print__paper";
  const frame = document.createElement("iframe");
  frame.className = "docs-print__frame";
  frame.title = data.luzLabelTitle;
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.setAttribute("inert", "");
  paper.append(frame);
  sheet.append(paper);
  stage.append(sheet);
  frame.src = SAMPLE;
  return frame;
}

/* ---- The dialog ---------------------------------------------------------- */

export function initPrintPreview() {
  const template = document.querySelector("template[data-docs-print-preview]");
  if (!template) return;
  template.after(template.content.cloneNode(true));
  const dialog = template.nextElementSibling.nextElementSibling;
  const opener = template.nextElementSibling.querySelector("[data-docs-print-open]");
  const stage = dialog.querySelector("[data-docs-print-stage]");
  const status = dialog.querySelector(".docs-print__status");

  let started = false;
  opener.addEventListener("click", () => {
    // The dialog is open before the frame is made: a frame in a closed
    // dialog has no size, so its page would be laid out at 0 px
    dialog.showModal();
    if (started) return;
    started = true;
    status.textContent = status.dataset.luzLabelLoading;
    prepare(buildSheet(stage)).then(
      () => {
        status.textContent = status.dataset.luzLabelReady;
      },
      () => {
        // A failure is for everyone: the line shows, the rest of the time it is only for a screen reader
        status.classList.remove("u-sr-only");
        status.textContent = status.dataset.luzLabelFailed;
      },
    );
  });

  // Print the page, not the dialog: close it first, so the focus is back on the opener
  dialog.querySelector("[data-docs-print-now]").addEventListener("click", () => {
    dialog.close();
    window.print();
  });
}
