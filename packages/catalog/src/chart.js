/**
 * LUZ Catalog — chart (lazy chunk; draws the table the author already wrote)
 *
 * <luz-chart>, a light-DOM custom element around a native table, or around a
 * list of <data> elements. It draws no data of its own: every number is read
 * from the author's markup, the `value` of a <data> or a cell that holds
 * a plain number (12 or 12.5, never "1.200"; anything else is a gap).
 *
 *   <luz-chart type="line">
 *     <table class="luz-table">
 *       <caption>Visits by month</caption>
 *       <thead><tr><th scope="col">Month</th><th scope="col">2025</th><th scope="col">2026</th></tr></thead>
 *       <tbody>
 *         <tr><th scope="row">Jan</th><td><data value="1200">1,200</data></td><td><data value="1500">1,500</data></td></tr>
 *       </tbody>
 *     </table>
 *   </luz-chart>
 *
 *   <luz-chart type="spark">
 *     <span>Visits, last 7 days</span>
 *     <ul class="luz-chart__values" role="list">
 *       <li><data value="31">31</data></li> …
 *     </ul>
 *   </luz-chart>
 *
 * Without JavaScript, and until this module defines the element, the table
 * (or the list) is all there is, and it is complete. With it, `type="line"`
 * (the default) draws an SVG, marked aria-hidden, from the table: the first
 * column is the X axis and each following column is a series, up to six
 * (--luz-chart-1 to --luz-chart-6, which follow the mode with no repaint).
 * Each series ends in a marker of its own shape, and the legend repeats it, so
 * a series is told by more than its colour. `variant="area"` fills under the
 * lines. The table stays in the DOM, always readable by a screen reader: the
 * chart shows, and a button swaps it for the table, which a sighted reader
 * wants as much (WCAG 1.1.1). `type="spark"` draws one small line from the
 * <data value> elements inside, and shows the last of them as text; the others
 * stay in the list for a screen reader.
 *
 * The drawing is made again when the box changes size and when the table
 * changes. It does not move, so there is nothing to stop under reduced
 * motion, and it has no tooltip: the figures are in the table.
 *
 * The two words of the button are the page's, `data-luz-label-table` ("Show
 * table") and `data-luz-label-chart` ("Show chart"), on the element or an
 * ancestor, with no English fallback; a missing one leaves no button, and
 * the table shows under the chart.
 *
 * luz-exception: EX-014 — those two words are the page's, read from the
 * markup, as search's are (EX-005): this chunk imports nothing. The axis
 * figures are the author's numbers written with Intl, in the page's language.
 *
 * Importing this module defines the element (once).
 *
 * @element luz-chart - A line, area or spark chart drawn from the author's own table or list of numbers, which stays readable beside it.
 * @attr {"line" | "spark"} type - "line", the default, draws the table's columns; "spark" draws one small line from a list of data elements.
 * @attr {"area"} variant - Fills the area under each line.
 * @attr {string} data-luz-label-table - The text of the button that shows the table, on the element or an ancestor; with none there is no button.
 * @attr {string} data-luz-label-chart - The text of the button that shows the chart again, on the element or an ancestor; with none there is no button.
 */

// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const NS = "http://www.w3.org/2000/svg";
const SERIES = 6;

let count = 0;

/** A number from a cell or a <data>: its value, or the plain text; NaN for a gap. */
const num = (node) => {
  const raw = (node.querySelector?.("data[value]") ?? node).getAttribute?.("value") ?? node.textContent;
  return raw.trim() === "" ? NaN : Number(raw);
};

/** The text of the page's own label `key` on `el` or an ancestor; "" when it has none. */
const say = (key, el) => {
  const attr = `data-luz-label-${key}`;
  return (el.closest(`[${attr}]`)?.getAttribute(attr) ?? "").trim();
};

/** An element of the SVG namespace, with its attributes, appended to `parent`. */
function svg(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  parent?.append(node);
  return node;
}

/** A new HTML element with a class, appended to `parent`. */
function html(tag, className, parent) {
  const node = document.createElement(tag);
  node.className = className;
  parent?.append(node);
  return node;
}

/**
 * What the table says: the names of the rows (first column), then one series
 * per following column, { name, values } with NaN for a cell that is no number.
 * @param {Element} host a <luz-chart>
 * @returns {{ rows: string[], series: { name: string, values: number[] }[] } | null}
 */
export function readChart(host) {
  const table = host.querySelector("table");
  const head = table?.tHead?.rows[0] ?? table?.rows[0];
  const body = table ? [...table.rows].filter((row) => row.querySelector("td")) : [];
  if (!head || !body.length) return null;
  const names = [...head.cells].slice(1, SERIES + 1).map((cell) => cell.textContent.trim());
  return {
    rows: body.map((row) => row.cells[0].textContent.trim()),
    series: names.map((name, i) => ({ name, values: body.map((row) => (row.cells[i + 1] ? num(row.cells[i + 1]) : NaN)) })),
  };
}

/** The mark of series `n` (1 to 6) at x, y: a circle, a square, a triangle, a diamond, a plus, a cross. */
function marker(n, x, y, r) {
  const p = (v) => +v.toFixed(1);
  return [
    `M${p(x - r)} ${p(y)}a${p(r)} ${p(r)} 0 1 0 ${p(2 * r)} 0a${p(r)} ${p(r)} 0 1 0 ${p(-2 * r)} 0`,
    `M${p(x - r)} ${p(y - r)}h${p(2 * r)}v${p(2 * r)}h${p(-2 * r)}z`,
    `M${p(x)} ${p(y - r * 1.2)}L${p(x + r * 1.2)} ${p(y + r)}H${p(x - r * 1.2)}z`,
    `M${p(x)} ${p(y - r * 1.3)}L${p(x + r * 1.3)} ${p(y)}L${p(x)} ${p(y + r * 1.3)}L${p(x - r * 1.3)} ${p(y)}z`,
    `M${p(x - r)} ${p(y)}H${p(x + r)}M${p(x)} ${p(y - r)}V${p(y + r)}`,
    `M${p(x - r)} ${p(y - r)}L${p(x + r)} ${p(y + r)}M${p(x + r)} ${p(y - r)}L${p(x - r)} ${p(y + r)}`,
  ][n - 1];
}

/** A step of 1, 2 or 5 times a power of ten that puts about four intervals in `span`. */
function niceStep(span) {
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

/** The path of one series: a line per run of numbers, a gap where there is none. */
function runs(values, x, y) {
  let d = "";
  let open = false;
  values.forEach((v, i) => {
    if (Number.isFinite(v)) {
      d += `${open ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      open = true;
    } else open = false;
  });
  return d;
}

/** The area under a series: each run closed down to the baseline. */
function areas(values, x, y, base) {
  let d = "";
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) continue;
    let j = i;
    while (j + 1 < values.length && Number.isFinite(values[j + 1])) j++;
    if (j > i) {
      d += `M${x(i).toFixed(1)} ${base.toFixed(1)}`;
      for (let k = i; k <= j; k++) d += `L${x(k).toFixed(1)} ${y(values[k]).toFixed(1)}`;
      d += `L${x(j).toFixed(1)} ${base.toFixed(1)}z`;
    }
    i = j;
  }
  return d;
}

/** Draws the lines of `data` in `box` (an SVG) at its own size in pixels. */
function drawLine(host, box, data, width, height) {
  const font = parseFloat(getComputedStyle(box).fontSize) || 16;
  const lang = host.closest("[lang]")?.lang || undefined;
  let format = String;
  try {
    format = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 2 }).format;
  } catch {
    // A lang that is not a language tag: the plain figure
  }
  const all = data.series.flatMap((s) => s.values).filter(Number.isFinite);
  let lo = Math.min(0, ...all);
  let hi = Math.max(0, ...all);
  if (lo === hi) hi = lo + 1;
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));

  const wide = (text) => text.length * font * 0.62;
  const rowsWide = Math.max(...data.rows.map((r) => wide(r)));
  const left = Math.max(...ticks.map((t) => wide(format(t)))) + font * 0.75;
  const edge = Math.max(left, rowsWide / 2);
  const right = rowsWide / 2 + font * 0.25;
  const top = font * 0.75;
  const bottom = font * 2;
  const inner = Math.max(width - edge - right, 1);
  const n = data.rows.length;
  const x = (i) => edge + (n > 1 ? (i * inner) / (n - 1) : inner / 2);
  const y = (v) => top + ((hi - v) / (hi - lo)) * (height - top - bottom);

  box.replaceChildren();
  box.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const grid = ticks.map((t) => `M${edge.toFixed(1)} ${y(t).toFixed(1)}H${(width - right).toFixed(1)}`).join("");
  svg("path", { class: "luz-chart__grid", d: grid }, box);
  for (const t of ticks) {
    svg("text", { class: "luz-chart__tick", x: (edge - font * 0.5).toFixed(1), y: y(t).toFixed(1), dy: "0.32em", "text-anchor": "end" }, box).textContent = format(t);
  }
  // Every row that fits: a label needs its own width and a gap
  const every = Math.ceil((rowsWide + font) / (n > 1 ? inner / (n - 1) : inner));
  data.rows.forEach((row, i) => {
    if (i % every) return;
    svg("text", { class: "luz-chart__tick", x: x(i).toFixed(1), y: (height - bottom + font * 1.25).toFixed(1), "text-anchor": "middle" }, box).textContent = row;
  });

  const area = host.getAttribute("variant") === "area";
  data.series.forEach((s, i) => {
    const group = svg("g", { class: "luz-chart__series", "data-n": i + 1 }, box);
    if (area) svg("path", { class: "luz-chart__area", d: areas(s.values, x, y, y(Math.max(lo, 0))) }, group);
    svg("path", { class: "luz-chart__line", d: runs(s.values, x, y) }, group);
    const last = s.values.findLastIndex(Number.isFinite);
    if (last >= 0) svg("path", { class: "luz-chart__marker", d: marker(i + 1, x(last), y(s.values[last]), font * 0.3) }, group);
  });
}

/** The legend: a mark and the name of each series, when there is more than one. */
function drawLegend(list, data) {
  list.replaceChildren();
  if (data.series.length < 2) return;
  data.series.forEach((s, i) => {
    const item = html("li", "luz-chart__key", list);
    item.setAttribute("data-n", i + 1);
    const swatch = svg("svg", { class: "luz-chart__swatch", viewBox: "-8 -8 16 16" }, item);
    svg("path", { class: "luz-chart__line", d: "M-8 0H8" }, swatch);
    svg("path", { class: "luz-chart__marker", d: marker(i + 1, 0, 0, 4) }, swatch);
    item.append(s.name);
  });
}

/** A line chart: builds its parts once, then draws them on every size or table change. */
function line(host) {
  const table = host.querySelector("table");
  if (!table) return () => () => {};
  const caption = table.caption;
  const bar = html("div", "luz-chart__bar");
  const title = html("p", "luz-chart__title", bar);
  title.setAttribute("aria-hidden", "true");
  const figure = html("div", "luz-chart__figure");
  figure.setAttribute("aria-hidden", "true");
  const box = svg("svg", { class: "luz-chart__plot" }, figure);
  const legend = html("ul", "luz-chart__legend", figure);
  host.prepend(bar, figure);

  // A labelled group: an aria-label on an element with no role names nothing
  if (caption && !host.hasAttribute("role") && !host.hasAttribute("aria-label") && !host.hasAttribute("aria-labelledby")) {
    caption.id ||= `luz-chart-${++count}`;
    host.setAttribute("role", "group");
    host.setAttribute("aria-labelledby", caption.id);
  }

  const toTable = say("table", host);
  const toChart = say("chart", host);
  // A scrolling wrapper of the table that the author made focusable (.luz-table-wrap): it takes no Tab stop while the chart hides it
  const wrap = table.closest(".luz-table-wrap");
  const tab = wrap?.getAttribute("tabindex");
  const view = (name) => {
    host.setAttribute("data-luz-view", name);
    if (wrap && tab !== null) wrap.setAttribute("tabindex", name === "chart" ? "-1" : tab);
  };
  let button;
  if (toTable && toChart) {
    button = html("button", "luz-chart__toggle luz-btn luz-btn--ghost", bar);
    button.type = "button";
    if (caption) button.setAttribute("aria-describedby", caption.id ||= `luz-chart-${++count}`);
    button.textContent = toTable;
    let showTable = false;
    button.addEventListener("click", () => {
      showTable = !showTable;
      view(showTable ? "table" : "chart");
      button.textContent = showTable ? toChart : toTable;
    });
  }
  view(button ? "chart" : "both");

  let data;
  const paint = () => {
    const { width, height } = box.getBoundingClientRect();
    if (data && width && height) drawLine(host, box, data, Math.round(width), Math.round(height));
  };
  const read = () => {
    data = readChart(host);
    title.textContent = caption?.textContent.trim() ?? "";
    if (data) drawLegend(legend, data);
    paint();
  };
  const resize = new ResizeObserver(paint);
  const edit = new MutationObserver(read);
  read();
  host.setAttribute("data-luz-ready", "");
  return () => {
    resize.observe(box);
    edit.observe(table, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["value"] });
    return () => {
      resize.disconnect();
      edit.disconnect();
    };
  };
}

/** A spark: one small line from the <data> elements inside, the last one shown as text. */
function spark(host) {
  const numbers = [...host.querySelectorAll("data[value]")].filter((node) => Number.isFinite(num(node)));
  const values = numbers.map(num);
  if (!values.length) return () => () => {};
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const box = svg("svg", { class: "luz-chart__spark", viewBox: "0 0 100 24", preserveAspectRatio: "none", "aria-hidden": "true" });
  const x = (i) => (values.length > 1 ? (i * 100) / (values.length - 1) : 50);
  const y = (v) => 2 + (hi === lo ? 0.5 : (hi - v) / (hi - lo)) * 20;
  svg("path", { class: "luz-chart__line", d: runs(values, x, y) }, box);
  host.prepend(box);
  numbers.at(-1).setAttribute("data-luz-end", "");
  host.setAttribute("data-luz-ready", "");
  return () => () => {};
}

class LuzChart extends HTMLElement {
  #wire;
  #unwire;

  connectedCallback() {
    // Built once the parser has given it its table, if it was defined first
    if (document.readyState === "loading" && !this.querySelector("table, data")) {
      document.addEventListener("DOMContentLoaded", () => this.isConnected && this.connectedCallback(), { once: true });
      return;
    }
    if (!this.#wire) {
      const type = this.getAttribute("type") ?? "line";
      this.#wire = type === "spark" ? spark(this) : type === "line" ? line(this) : () => () => {};
    }
    this.#unwire = this.#wire();
  }

  disconnectedCallback() {
    this.#unwire?.();
  }
}

if (typeof customElements < "u" && !customElements.get("luz-chart")) customElements.define("luz-chart", LuzChart);
