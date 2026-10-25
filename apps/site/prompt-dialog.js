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
 *   page, Escape, the focus inside). The prompt is laid out with an h3 per
 *   section (# and ##), lists, paragraphs and code blocks, all with
 *   textContent: no HTML of the text is ever parsed (SEC-IDX-2). Its last
 *   element is the sentence "End of the prompt.".
 * - Copy stays aria-disabled (and in the tab order) until that sentence is
 *   in view in the scrolling region, or at once when the prompt fits. A
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

/** Append `text` to `parent`, with every `code` span as a <code>. */
function inline(parent, text) {
  text.split(/(`[^`]+`)/).forEach((part, i) => {
    if (!part) return;
    if (i % 2) {
      const code = document.createElement("code");
      code.textContent = part.slice(1, -1);
      parent.append(code);
    } else parent.append(part);
  });
}

/**
 * The prompt as elements: # and ## are h3, a fenced block a pre, lines that
 * start "- " or "1. " the items of a list (two spaces more: a nested list),
 * any other run of lines a paragraph.
 */
function layout(text) {
  const out = document.createDocumentFragment();
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let paragraph = null;
  let lists = [];
  const close = () => {
    paragraph = null;
    lists = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^```/.test(line)) {
      close();
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      const body = [];
      for (i += 1; i < lines.length && !/^```/.test(lines[i]); i += 1) body.push(lines[i]);
      code.textContent = body.join("\n");
      pre.append(code);
      out.append(pre);
      continue;
    }
    const heading = /^#{1,2} (.*)$/.exec(line);
    if (heading) {
      close();
      const h3 = document.createElement("h3");
      inline(h3, heading[1]);
      out.append(h3);
      continue;
    }
    const item = /^( *)(-|\d+\.) (.*)$/.exec(line);
    if (item) {
      paragraph = null;
      const depth = Math.min(Math.floor(item[1].length / 2), 1);
      const tag = item[2] === "-" ? "ul" : "ol";
      lists.length = Math.min(lists.length, depth + 1);
      if (!lists[depth] || lists[depth].localName !== tag) {
        const list = document.createElement(tag);
        if (depth && lists[depth - 1]?.lastElementChild) lists[depth - 1].lastElementChild.append(list);
        else out.append(list);
        lists[depth] = list;
        lists.length = depth + 1;
      }
      const li = document.createElement("li");
      inline(li, item[3]);
      lists[depth].append(li);
      continue;
    }
    if (!line.trim()) {
      close();
      continue;
    }
    // A line that goes on a list item or a paragraph
    if (lists.length && !paragraph) {
      inline(lists[lists.length - 1].lastElementChild, ` ${line.trim()}`);
      continue;
    }
    if (!paragraph) {
      paragraph = document.createElement("p");
      out.append(paragraph);
    } else paragraph.append(" ");
    inline(paragraph, line.trim());
  }
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
    const n = Math.round(Math.min(Math.max(share, 0), 1) * 100);
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
    const max = region.scrollHeight - region.clientHeight;
    if (isLocked()) setRead(max > 0 ? region.scrollTop / max : 1);
  });
  // The end sentence in view, inside the region, unlocks Copy
  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && unlock(true), { root: region, threshold: 1 })
      : null;
  dialog.observeEnd = (end) => {
    observer?.disconnect();
    if (observer) observer.observe(end);
    else unlock(false);
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
      () => say(strings.copied),
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
      prompt.append(layout(text));
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
