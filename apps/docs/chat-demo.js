/**
 * The provider of the examples of the Chat page: no model and no network. It
 * walks through what a provider can ask of the chat (a step to take, a
 * download, ready), answers from a few canned texts, and fails when asked
 * to, so the examples show every state. A real provider is an
 * object of your own with ask(): the Chat page says how.
 */

const ANSWERS = [
  [/install|instal/i, "Link the stylesheet and the script from the CDN, **no build step**:\n\n1. `luz.min.css` from `@luz-ds/core`\n2. `catalog.min.js` when you use the catalog\n\n> Each level needs the ones below it and nothing above.\n\nThe page *Install LUZ* has the lines to copy.", [{ title: "Install LUZ", url: "/docs/get-started/" }]],
  [/colou?r|color/i, "Colours are tokens named by their job, not by their colour:\n\n- `--luz-text-primary` for words\n- `--luz-brand-fill` for the main action\n- `--luz-divider` for lines\n\n~~Hard-coded values~~ never appear in a component.", [{ title: "Color", url: "/docs/tokens/color/" }]],
  [/long/i, "A long answer shows how the bubble, the scroll and the typing behave. ".repeat(14), []],
];

/** A provider that follows the contract of <luz-chat>, with a start, a fake download and canned answers. */
export function demoProvider() {
  const target = new window.EventTarget();
  let state;
  let timer = 0;
  const say = (next) => {
    state = next;
    target.dispatchEvent(new Event("change"));
  };
  const start = () => {
    // The click that gets here is the gesture a real download would need
    let loaded = 0;
    say({ status: "busy", message: "Downloading the demo… 0%", progress: 0, action: { label: "Cancel", run: cancel } });
    timer = setInterval(() => {
      loaded += 0.1;
      if (loaded >= 1) {
        clearInterval(timer);
        say({ status: "ready" });
      } else say({ status: "busy", message: `Downloading the demo… ${Math.round(loaded * 100)}%`, progress: loaded, action: { label: "Cancel", run: cancel } });
    }, 250);
  };
  const cancel = () => {
    clearInterval(timer);
    say(first());
  };
  const first = () => ({ status: "action", message: "This is a demo with no model.", body: "It answers from a few canned texts. Ask how to install it, about colours, or for a long answer; write “error” to see a failure.", action: { label: "Start the demo", run: start } });
  state = first();
  return {
    addEventListener: (...args) => target.addEventListener(...args),
    removeEventListener: (...args) => target.removeEventListener(...args),
    get state() {
      return state;
    },
    settings: [{ label: "Back to the start", run: cancel }],
    info: [{ label: "Provider", text: "A demo, in this page's script." }],
    note: "A demo: the answers are canned.",
    persona: { name: "Demo" },
    reset() {},
    async *ask(messages, { signal }) {
      const question = messages.at(-1).content;
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (/error/i.test(question)) throw Object.assign(new Error("The demo was asked to fail"), { name: "DemoError" });
      const [, text, sources] = ANSWERS.find(([pattern]) => pattern.test(question)) ?? [null, "I only know a few things. Ask how to install it or about colours.", []];
      if (sources.length) yield { sources };
      for (let i = 0; i < text.length; i += 12) {
        yield text.slice(i, i + 12);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    },
  };
}

/** Gives each chat of the page that asks for it its own demo provider. */
export function attachDemos() {
  for (const chat of document.querySelectorAll("luz-chat[data-docs-demo]")) chat.provider = demoProvider();
}
