/**
 * LUZ site — the dialog of a prompt for AI (ai-and-catalog-only plan,
 * decisions 17 to 19, and the change of 2026-10-25 to 20 and 21).
 *
 * A page that offers a prompt has a link to its text, `/prompts/<id>.txt`,
 * marked `data-prompt-open` and named by `data-prompt-title`, and once the
 * skeleton of the dialog, `<template id="site-prompt-dialog">` (the partial
 * prompt-dialog, in the page's language). Without JavaScript the link opens
 * the text, which the reader copies by hand. With it:
 *
 * - The link becomes a button with the same text (WCAG 4.1.2: it opens, it
 *   no longer goes). The text is fetched, from the site only, when the
 *   pointer or the focus reaches it, so the dialog opens with it.
 * - The button opens a native <dialog> (showModal: the top layer, the inert
 *   page, Escape, the focus inside). The prompt is shown as its own source,
 *   a Markdown file open in an editor: every character, in order, with the
 *   marks of # and ##, lists, `code`, fences and "phrases" in spans by role,
 *   all with textContent: no HTML of the text is ever parsed (SEC-IDX-2).
 *   Its last element is the sentence "End of the prompt.".
 * - Copy stays aria-disabled (and in the tab order) until the region is
 *   scrolled to its end (100 %, that sentence wholly in view), or at once
 *   when the prompt fits. A
 *   press before that says so in the live region and moves the focus to the
 *   region; reaching the end says that Copy is on, without moving the focus.
 *   The progress bar and its text follow the scroll. A prompt read to the end
 *   stays unlocked for the rest of the page's life; nothing is stored.
 * - Copy writes the plain text, as fetched, to the clipboard. Closing gives
 *   the focus back to the button that opened it.
 *
 * Lives in apps/site, which the home page and the docs both import. Not part
 * of any published package.
 */

const texts = new Map();
const unlocked = new Set();

/**
 * Lock or unlock Copy. Locked, it is aria-disabled (still in the tab order)
 * and described by the line of help that says why; unlocked, that line no
 * longer describes it.
 */
function setLocked(copy, locked) {
  copy.setAttribute("aria-disabled", String(locked));
  if (locked) copy.setAttribute("aria-describedby", "site-prompt-help");
  else copy.removeAttribute("aria-describedby");
}

/** The text of a prompt, fetched once per page; only from the site's own origin. */
function load(href) {
  if (!texts.has(href)) {
    const url = new URL(href, location.href);
    const job =
      url.origin === location.origin
        ? fetch(url).then((response) => (response.ok ? response.text() : Promise.reject(new Error(`${response.status}`))))
        : Promise.reject(new Error("other origin"));
    // A failed load is tried again on the next open
    job.catch(() => texts.delete(href));
    texts.set(href, job);
  }
  return texts.get(href);
}

/**
 * An address the dialog links: a page of the published site or a file of
 * @luz-ds on the CDN. Any other URL stays text (a prompt is text addressed to
 * a model; the reader follows only what the site itself published).
 */
const ADDRESS = /https:\/\/(?:nandovejer\.github\.io\/luz\/|cdn\.jsdelivr\.net\/npm\/@luz-ds\/)[^\s<>"`]*/;
/** A phrase in straight quotes, like a string in a source file. */
const SAID = /"[^"\n]{1,60}"/;
const TOKENS = new RegExp(`(${ADDRESS.source})|(${SAID.source})`, "g");

/** <span class="site-prompt__tok-<role>"> (or another element) with `text` (textContent only). */
function tok(role, text = "", name = "span") {
  const span = document.createElement(name);
  span.className = `site-prompt__tok-${role}`;
  span.textContent = text;
  return span;
}

/**
 * A link to `raw`, in a new tab. Its name is its text and then the hint, in
 * the page's language, as an aria-label: the text of the link stays the
 * file's, so a selection or a count of the text gets nothing more (WCAG 2.4.4,
 * 2.5.3: the name starts with the visible text).
 */
function address(raw, newTab) {
  const link = document.createElement("a");
  link.className = "site-prompt__tok-link";
  link.href = raw;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = raw;
  if (newTab) {
    link.setAttribute("aria-label", `${raw} ${newTab}`);
    // The hint is in the page's language and the prompt around it is English:
    // an aria-label is spoken in the language of its element, so the link
    // takes the page's (an address has no language of its own; WCAG 3.1.2)
    const page = document.documentElement.lang;
    if (page && !/^en\b/i.test(page)) link.lang = page;
  }
  return link;
}

/** Append `text` to `parent`: `code` spans, "phrases" and addresses are tokens, the rest stays text. */
function inline(parent, text, newTab) {
  text.split(/(`[^`]+`)/).forEach((part, i) => {
    if (!part) return;
    if (i % 2) {
      parent.append(tok("code", part));
      return;
    }
    let from = 0;
    for (const hit of part.matchAll(TOKENS)) {
      if (hit.index > from) parent.append(part.slice(from, hit.index));
      if (hit[2]) {
        parent.append(tok("quote", hit[2]));
        from = hit.index + hit[0].length;
      } else {
        // A full stop, comma or bracket after the address is the sentence's
        const url = hit[1].replace(/[.,:;!?)]+$/, "");
        parent.append(address(url, newTab));
        from = hit.index + url.length;
      }
    }
    if (from < part.length) parent.append(part.slice(from));
  });
}

/**
 * The prompt as its own source, like a Markdown file open in an editor: every
 * character of the text is on screen, in order, with the marks of the syntax
 * in spans by role. One row per line of the text: a "#" or "##" line is an h3,
 * the lines between ``` fences are framed as a block, "- " and "1. " start a
 * list item. The row's cell holds the line and its line end; the number of the
 * line is drawn by CSS (a counter, hidden from assistive technology), so the
 * text of the region is the text of the file and nothing else.
 */
function layout(text, newTab) {
  const out = document.createDocumentFragment();
  const lines = text.split("\n");
  let fence = false;
  lines.forEach((raw, i) => {
    // A text that ends with a line end has no last, empty line to number
    if (i === lines.length - 1 && !raw) return;
    // The line end belongs to its line, so the cells add up to the text
    const eol = i < lines.length - 1 ? "\n" : "";
    const cell = document.createElement("span");
    cell.className = "site-prompt__cell";
    let row = document.createElement("div");
    const heading = fence ? null : /^(#{1,2} )(.*)$/.exec(raw);
    const item = fence ? null : /^( *)(-|\d+\.)( )(.*)$/.exec(raw);
    if (/^```/.test(raw)) {
      // The first fence line opens the block, the next one closes it
      cell.className += ` site-prompt__tok-fence site-prompt__tok-fence--${fence ? "close" : "open"}`;
      cell.append(tok("marker", raw + eol));
      fence = !fence;
    } else if (fence) {
      cell.className += " site-prompt__tok-fence";
      cell.append(raw + eol);
    } else if (heading) {
      // A real h3, so a screen reader's heading keys find it; its content is
      // the source line
      row = tok(`heading site-prompt__tok-heading--${heading[1].length - 1}`, "", "h3");
      cell.append(tok("marker", heading[1]));
      inline(cell, heading[2], newTab);
      cell.append(eol);
    } else {
      if (item) {
        cell.append(item[1], tok("marker", item[2] + item[3]));
        inline(cell, item[4], newTab);
      } else inline(cell, raw, newTab);
      cell.append(eol);
    }
    row.classList.add("site-prompt__line");
    row.append(cell);
    out.append(row);
  });
  return out;
}

/** The dialog of the page, made once from its template; null without one. */
function dialogOf() {
  const existing = document.querySelector("dialog.site-prompt");
  if (existing) return existing;
  const template = document.getElementById("site-prompt-dialog");
  if (!template) return null;
  const dialog = template.content.firstElementChild.cloneNode(true);
  // The template's strings, in the page's language
  for (const [key, value] of Object.entries(template.dataset)) dialog.dataset[key] = value;
  document.body.append(dialog);
  wire(dialog);
  return dialog;
}

function wire(dialog) {
  const region = dialog.querySelector(".site-prompt__text");
  const progress = dialog.querySelector(".site-prompt__progress");
  const read = dialog.querySelector(".site-prompt__read");
  const copy = dialog.querySelector("[data-prompt-copy]");
  const status = dialog.querySelector("[data-prompt-status]");
  const strings = dialog.dataset;
  let clear;
  const say = (message) => {
    status.textContent = message;
    clearTimeout(clear);
    clear = setTimeout(() => {
      status.textContent = "";
    }, 5000);
  };
  const isLocked = () => copy.getAttribute("aria-disabled") === "true";
  const setRead = (share) => {
    // Down, never up: 100 is shown only at the very end, where Copy turns on
    const n = Math.floor(Math.min(Math.max(share, 0), 1) * 100);
    progress.value = n;
    read.textContent = strings.read.replace("{n}", String(n));
  };
  const unlock = (announce) => {
    if (!isLocked()) return;
    setLocked(copy, false);
    unlocked.add(dialog.dataset.current);
    setRead(1);
    if (announce) say(strings.unlocked);
  };

  region.addEventListener("scroll", () => {
    if (!isLocked()) return;
    const max = region.scrollHeight - region.clientHeight;
    // Within a pixel of the end (zoom leaves fractions): read to 100 %
    if (max - region.scrollTop <= 1) unlock(true);
    else setRead(region.scrollTop / max);
  });
  // The end sentence wholly in view unlocks Copy too (a screen reader's
  // cursor brings it in without a scroll the page may see first). It is the
  // last thing in the region, its padding included (prompt-dialog.css), so
  // wholly in view means scrolled to the end: 100 %.
  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && unlock(true), { root: region, threshold: 1 })
      : null;
  dialog.observeEnd = (end) => {
    observer?.disconnect();
    if (observer) observer.observe(end);
    else unlock(false);
  };

  // After a copy, as core's copy button (clipboard.js): the label says
  // "Copied", with a check, for 1.2 s, then goes back. The button keeps its
  // width, so nothing beside it moves; the prompt it copied, with its bar,
  // wears a green ring for the same time.
  const label = copy.querySelector("[data-prompt-copy-label]");
  const reader = dialog.querySelector(".site-prompt__reader");
  const original = label.textContent;
  let restore;
  const done = () => {
    clearTimeout(restore);
    copy.style.minInlineSize = `${copy.offsetWidth}px`;
    label.textContent = strings.done;
    copy.classList.add("is-copied");
    reader.classList.add("is-copied");
    restore = setTimeout(() => {
      label.textContent = original;
      copy.classList.remove("is-copied");
      reader.classList.remove("is-copied");
      copy.style.minInlineSize = "";
    }, 1200);
  };

  copy.addEventListener("click", () => {
    if (isLocked()) {
      // Nothing to read after a failed load: say that again, not "read to the end"
      if (dialog.failed) return say(strings.failed);
      say(strings.locked);
      region.focus();
      return;
    }
    const text = dialog.text;
    if (typeof text !== "string" || !navigator.clipboard) return say(strings.notCopied);
    navigator.clipboard.writeText(text).then(
      () => {
        say(strings.copied);
        done();
      },
      () => say(strings.notCopied),
    );
  });
  dialog.querySelector("[data-prompt-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    observer?.disconnect();
    dialog.opener?.focus();
  });
}

/** Show the prompt of `opener` (its href, its title) in the dialog. */
function open(dialog, opener, href) {
  const region = dialog.querySelector(".site-prompt__text");
  const copy = dialog.querySelector("[data-prompt-copy]");
  dialog.opener = opener;
  dialog.dataset.current = href;
  dialog.text = null;
  dialog.failed = false;
  dialog.querySelector(".site-prompt__title, #site-prompt-title").textContent = opener.dataset.promptTitle || opener.textContent;
  dialog.querySelector("[data-prompt-file]").href = href;
  setLocked(copy, !unlocked.has(href));
  region.replaceChildren();
  region.scrollTop = 0;
  const wait = document.createElement("p");
  wait.textContent = dialog.dataset.loading;
  region.append(wait);
  const read = dialog.querySelector(".site-prompt__read");
  const progress = dialog.querySelector(".site-prompt__progress");
  progress.value = unlocked.has(href) ? 100 : 0;
  read.textContent = dialog.dataset.read.replace("{n}", String(progress.value));
  if (!dialog.open) dialog.showModal();
  load(href).then(
    (text) => {
      if (dialog.dataset.current !== href) return;
      dialog.text = text;
      const end = document.createElement("p");
      end.className = "site-prompt__end";
      end.textContent = dialog.dataset.end;
      // The prompt is English (WCAG 3.1.2); the region's name and the end
      // sentence are in the language of the page
      const prompt = document.createElement("div");
      prompt.lang = "en";
      prompt.dir = "ltr";
      prompt.className = "site-prompt__source";
      prompt.append(layout(text, dialog.dataset.newTab));
      region.replaceChildren(prompt, end);
      if (unlocked.has(href)) return;
      // A prompt that fits needs no scroll: Copy is on from the start
      if (region.scrollHeight <= region.clientHeight + 1) {
        setLocked(copy, false);
        unlocked.add(href);
        progress.value = 100;
        read.textContent = dialog.dataset.read.replace("{n}", "100");
      } else dialog.observeEnd(end);
    },
    () => {
      if (dialog.dataset.current !== href) return;
      const failed = document.createElement("p");
      failed.textContent = dialog.dataset.failed;
      dialog.failed = true;
      region.replaceChildren(failed);
    },
  );
}

/** Turn every link marked data-prompt-open into the button that opens its dialog. */
export function initPromptDialogs(root = document) {
  if (typeof HTMLDialogElement !== "function" || !document.getElementById("site-prompt-dialog")) return;
  for (const link of root.querySelectorAll("a[data-prompt-open]")) {
    const href = link.getAttribute("href");
    const button = document.createElement("button");
    button.type = "button";
    button.className = link.className;
    button.textContent = link.textContent;
    if (link.dataset.promptTitle) button.dataset.promptTitle = link.dataset.promptTitle;
    // A page with several openers names each one by its words and its
    // context (aria-labelledby the opener and a heading): the button keeps it
    for (const name of ["id", "aria-labelledby"]) if (link.hasAttribute(name)) button.setAttribute(name, link.getAttribute(name));
    link.replaceWith(button);
    const warm = () => load(href).catch(() => {});
    button.addEventListener("pointerenter", warm, { once: true });
    button.addEventListener("focus", warm, { once: true });
    button.addEventListener("click", () => {
      const dialog = dialogOf();
      if (dialog) open(dialog, button, href);
    });
  }
}
