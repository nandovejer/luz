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
 * `type="column" interactive` (2026-11-04) around a table with a row per
 * category and a column per series, and no class: this script gives it
 * luz-column-chart (column-chart.css draws it) and adds a toggle button per
 * series with its total, which turns its columns off and on, and a readout of
 * the row under the pointer or the focus; the rows take the focus, one Tab
 * stop, and the arrow keys, Home and End move it. The names, the totals and the
 * readout are the author's own text and numbers (the totals written with Intl):
 * no word of the script's own.
 *
 * @element luz-chart - A line, area, column or spark chart drawn from the author's own table or list of numbers, which stays readable beside it.
 * @attr {"line" | "column" | "spark"} type - "line", the default, draws the table's columns; "column" adds the interactive parts to a column chart table; "spark" draws one small line from a list of data elements.
 * @attr {"area"} variant - Fills the area under each line.
 * @attr {boolean} interactive - With type="line" or "column": a button per series, with its total, that turns it off and on, and a readout of the row under the pointer or the focus.
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
  if (className) node.className = className;
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
    series: names.map((name, i) => ({
      name,
      n: i + 1,
      values: body.map((row) => (row.cells[i + 1] ? num(row.cells[i + 1]) : NaN)),
      texts: body.map((row) => row.cells[i + 1]?.textContent.trim() ?? ""),
    })),
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

/** A number formatter in the page's language (compact for an axis), or the plain figure for a lang that is not a language tag. */
function formatter(host, options) {
  try {
    return new Intl.NumberFormat(host.closest("[lang]")?.lang || undefined, options).format;
  } catch {
    return String;
  }
}

/**
 * Draws the lines of `data` in `box` (an SVG) at its own size in pixels, but
 * for the series in `off` (on the same scale), and returns where the rows are.
 */
function drawLine(host, box, data, width, height, off) {
  const font = parseFloat(getComputedStyle(box).fontSize) || 16;
  const format = formatter(host, { notation: "compact", maximumFractionDigits: 2 });
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
  // The band of the row under the pointer or the focus, behind the lines (drawn by mark())
  const band = svg("g", { class: "luz-chart__mark" }, box);
  data.series.forEach((s, i) => {
    if (off.has(i + 1)) return;
    const group = svg("g", { class: "luz-chart__series", "data-n": i + 1 }, box);
    if (area) svg("path", { class: "luz-chart__area", d: areas(s.values, x, y, y(Math.max(lo, 0))) }, group);
    svg("path", { class: "luz-chart__line", d: runs(s.values, x, y) }, group);
    const last = s.values.findLastIndex(Number.isFinite);
    if (last >= 0) svg("path", { class: "luz-chart__marker", d: marker(i + 1, x(last), y(s.values[last]), font * 0.3) }, group);
  });
  return { x, top, bottom: height - bottom, step: n > 1 ? inner / (n - 1) : inner, band };
}

/** Marks row `i` of a drawn line chart (-1: none) with a band behind the lines, as wide as the step between two rows. */
function mark(at, i) {
  at.band.replaceChildren();
  if (i >= 0) svg("rect", { class: "luz-chart__band", x: (at.x(i) - at.step / 2).toFixed(1), y: at.top.toFixed(1), width: at.step.toFixed(1), height: (at.bottom - at.top).toFixed(1) }, at.band);
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

/** The title of a chart from the caption of its table, and the host a group labelled by it. */
function frame(host, table) {
  const caption = table.caption;
  const bar = html("div", "luz-chart__bar");
  const title = html("p", "luz-chart__title", bar);
  title.setAttribute("aria-hidden", "true");
  // A labelled group: an aria-label on an element with no role names nothing
  if (caption && !host.hasAttribute("role") && !host.hasAttribute("aria-label") && !host.hasAttribute("aria-labelledby")) {
    caption.id ||= `luz-chart-${++count}`;
    host.setAttribute("role", "group");
    host.setAttribute("aria-labelledby", caption.id);
  }
  return { caption, bar, title };
}

/**
 * The parts of an `interactive` chart:
 * a header with a toggle button per series (its name and its total, from the
 * table) that turns its picture off and on, and a readout of a row (its name and
 * the figure of each series shown, copied from its cells) while the pointer is
 * on it or the row has the focus. The rows of the table take the focus, one Tab
 * stop, and the arrow keys, Home and End move it; each row is named by its own
 * cells ("Apr 1, Desktop 252, Mobile 148": the author's text, every series,
 * turned off or not), so a screen reader says what the picture shows. Escape
 * puts the readout away while the pointer and the focus stay where they are
 * (WCAG 1.4.13); it comes back on another row. The readout is aria-hidden,
 * because the focused row is read as it is. The roles of the table are written
 * out: the rows of a chart are laid out with display: flex, which some browsers
 * take for the end of a table. The last series shown stays shown.
 * Left and Right follow the drawing: the direction of the page for columns,
 * left to right for the plot of a line.
 * @param {Element} host
 * @param {HTMLTableElement} table
 * @param {{ area: Element, at: (e: PointerEvent) => number, anchor: (row: number) => { x: number, y: number, w: number }, mark?: (row: number, off: Set<number>) => void }} o
 *   the part that follows the pointer, the row under a pointer event (-1 for none), a row's box in the host, and what draws the row's mark (with the series turned off)
 * @returns {HTMLElement} the header, for the caller to place
 */
function interact(host, table, o) {
  const data = readChart(host);
  const off = new Set();
  const rows = [...table.tBodies].flatMap((body) => [...body.rows]);
  const picker = html("div", "luz-chart__picker");
  // The roles a table has by its elements, said out loud: display: flex on a row can drop them (Safari)
  table.setAttribute("role", "table");
  for (const part of table.children) if (/^t(head|body|foot)$/.test(part.localName)) part.setAttribute("role", "rowgroup");
  for (const r of table.rows) {
    r.setAttribute("role", "row");
    for (const cell of r.cells) cell.setAttribute("role", cell.localName === "td" ? "cell" : cell.scope === "row" ? "rowheader" : "columnheader");
  }
  const readout = html("div", "luz-chart__readout", host);
  readout.setAttribute("aria-hidden", "true");
  readout.hidden = true;
  const total = formatter(host, {});
  let row = -1;
  let focused = -1;
  // The row whose readout Escape put away: it stays away until another row has the pointer or the focus
  let dismissed = -2;
  // Read when it is used: the page may set its direction after the chart is drawn
  const rtl = () => getComputedStyle(host).direction === "rtl";
  // The keys follow the drawing: the columns follow the page, the plot of a line is always left to right
  const backwards = () => getComputedStyle(o.area).direction === "rtl";

  const esc = (e) => {
    // eslint-disable-next-line no-restricted-syntax -- RL-3: a readout is no dialog or popover and has no native Escape (WCAG 1.4.13); it only puts it away, with no preventDefault, so an Escape that closes a dialog around the chart still does
    if (e.key === "Escape") {
      dismissed = row;
      show(-1);
    }
  };
  const show = (i) => {
    i = Math.min(i, rows.length - 1);
    row = i;
    o.mark?.(i, off);
    rows.forEach((r, k) => r.toggleAttribute("data-luz-active", k === i));
    const shown = data?.series.filter((s) => !off.has(s.n)) ?? [];
    readout.hidden = i < 0;
    // Escape is heard while the readout shows, wherever the focus is
    document[readout.hidden ? "removeEventListener" : "addEventListener"]("keydown", esc);
    if (readout.hidden) return;
    readout.replaceChildren();
    html("p", "", readout).textContent = data.rows[i];
    const list = html("ul", "", readout);
    for (const s of shown) {
      const item = html("li", "luz-chart__key", list);
      item.setAttribute("data-n", s.n);
      html("span", "", item).textContent = s.name;
      html("span", "", item).textContent = s.texts[i];
    }
    // Beside the anchor (a row's box), at its top, on the side with room; inside the host
    const a = o.anchor(i);
    const w = host.clientWidth;
    const { width: rw } = readout.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(readout).fontSize);
    const after = a.x + a.w + gap;
    const left = Math.max(after + rw <= w ? after : a.x - gap - rw, 0);
    readout.style.translate = `${Math.round(left - (rtl() ? w - rw : 0))}px ${Math.round(a.y)}px`;
  };

  data?.series.forEach((s) => {
    const button = html("button", "luz-chart__pick", picker);
    button.type = "button";
    button.setAttribute("data-n", s.n);
    button.setAttribute("aria-pressed", "true");
    html("span", "", button).textContent = s.name;
    const figures = s.values.filter(Number.isFinite);
    if (figures.length) html("span", "luz-chart__total", button).textContent = total(figures.reduce((a, v) => a + v, 0));
    button.addEventListener("click", () => {
      const on = off.has(s.n);
      // The last series shown stays: a chart with none shown says nothing
      if (!on && off.size + 1 === data.series.length) return;
      off[on ? "delete" : "add"](s.n);
      button.setAttribute("aria-pressed", String(on));
      table.querySelectorAll(`tr > :nth-child(${s.n + 1})`).forEach((cell) => cell.toggleAttribute("data-luz-off", !on));
      show(row);
    });
  });

  // One Tab stop for the rows: the active one
  rows.forEach((r, k) => {
    r.tabIndex = k ? -1 : 0;
    if (data) r.setAttribute("aria-label", [data.rows[k], ...data.series.map((s) => `${s.name} ${s.texts[k]}`)].join(", "));
    r.addEventListener("focus", () => {
      rows.forEach((other) => (other.tabIndex = other === r ? 0 : -1));
      dismissed = -2;
      show((focused = k));
    });
    r.addEventListener("blur", () => {
      focused = -1;
      Promise.resolve().then(() => focused < 0 && show(-1));
    });
  });
  table.addEventListener("keydown", (e) => {
    const k = rows.indexOf(e.target);
    if (k < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    // Down and Up go to the next and the previous row, as in a table; Right and Left follow the drawing
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key] * (backwards() && /Left|Right/.test(e.key) ? -1 : 1);
    const to = e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : Number.isFinite(step) ? Math.min(Math.max(k + step, 0), rows.length - 1) : -1;
    if (to < 0) return;
    // eslint-disable-next-line no-restricted-syntax -- RL-3: a table has no native arrow keys for a row that has the focus; the arrows, Home and End move between the rows of an interactive chart (roving focus) instead of scrolling the page
    e.preventDefault();
    rows[to].focus();
  });
  o.area.addEventListener("pointermove", (e) => {
    const i = o.at(e);
    if (i === dismissed) return;
    dismissed = -2;
    show(i);
  });
  o.area.addEventListener("pointerleave", () => show(focused === dismissed ? -1 : focused));
  return picker;
}

/** A line chart: builds its parts once, then draws them on every size or table change. */
function line(host) {
  const table = host.querySelector("table");
  if (!table) return () => () => {};
  const { caption, bar, title } = frame(host, table);
  const figure = html("div", "luz-chart__figure");
  figure.setAttribute("aria-hidden", "true");
  const box = svg("svg", { class: "luz-chart__plot" }, figure);
  const legend = html("ul", "luz-chart__legend", figure);
  host.prepend(bar, figure);

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
  let at;
  let row = -1;
  // The series the header turned off
  let off = new Set();
  const paint = () => {
    const { width, height } = box.getBoundingClientRect();
    if (data && width && height) at = drawLine(host, box, data, Math.round(width), Math.round(height), off);
    if (at) mark(at, row);
  };
  const read = () => {
    data = readChart(host);
    title.textContent = caption?.textContent.trim() ?? "";
    if (data) drawLegend(legend, data);
    paint();
  };
  if (host.hasAttribute("interactive")) {
    // The rows of the table, read or not, take the focus; the plot follows the pointer and is drawn left to right
    const picker = interact(host, table, {
      area: box,
      at: (e) => (at ? Math.round((e.clientX - box.getBoundingClientRect().left - at.x(0)) / at.step) : -1),
      anchor: (i) => {
        const b = box.getBoundingClientRect();
        const h = host.getBoundingClientRect();
        return { x: b.left - h.left + at.x(i) - at.step / 2, y: b.top - h.top + at.top, w: at.step };
      },
      mark: (i, shown) => {
        row = i;
        if ([...shown].join() !== [...off].join()) {
          off = new Set(shown);
          paint();
        } else if (at) mark(at, i);
      },
    });
    bar.after(picker);
  }
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

/**
 * A column chart: the table is the drawing (column-chart.css draws it, once the
 * table has the class luz-column-chart, which this adds: with no script it stays a
 * table, as many days as it has fit any width); with `interactive`, the header,
 * the readout and the keys, and only the names of the rows that fit side by side
 * are shown.
 */
function column(host) {
  const table = host.querySelector("table");
  if (!table || !host.hasAttribute("interactive")) return () => () => {};
  // Without this script the table is a table, which fits any width: drawn as columns only from here on
  table.classList.add("luz-column-chart");
  const { caption, bar, title } = frame(host, table);
  title.textContent = caption?.textContent.trim() ?? "";
  const body = table.tBodies[0];
  const rows = [...body.rows];
  const picker = interact(host, table, {
    area: body,
    at: (e) => rows.indexOf(e.target.closest?.("tr")),
    anchor: (i) => {
      const r = rows[i].getBoundingClientRect();
      const h = host.getBoundingClientRect();
      return { x: r.left - h.left, y: r.top - h.top, w: r.width };
    },
  });
  // The frame of the table no longer scrolls (the rows share its width) and the rows take the focus: it is no Tab stop
  const wrap = table.closest(".luz-table-wrap");
  if (wrap?.hasAttribute("tabindex")) wrap.setAttribute("tabindex", "-1");
  (wrap ?? table).before(bar, picker);
  // The names that fit side by side, every nth, from the first (at the start edge): one is left out when it would touch the last shown or run past the end
  const ticks = () => {
    const names = rows.map((r) => r.cells[0]);
    const room = body.clientWidth / Math.max(rows.length, 1);
    const font = parseFloat(getComputedStyle(body).fontSize) || 16;
    const widths = names.map((th) => th.scrollWidth);
    const every = Math.max(Math.ceil((Math.max(...widths) + font) / room), 1);
    let end = -Infinity;
    names.forEach((th, i) => {
      const from = i ? (i + 0.5) * room - widths[i] / 2 : 0;
      const tick = !(i % every) && from >= end + font && from + widths[i] <= body.clientWidth;
      if (tick) end = from + widths[i];
      th.toggleAttribute("data-luz-tick", tick);
    });
  };
  const resize = new ResizeObserver(ticks);
  host.setAttribute("data-luz-ready", "");
  ticks();
  return () => {
    resize.observe(body);
    return () => resize.disconnect();
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
      this.#wire = type === "spark" ? spark(this) : type === "line" ? line(this) : type === "column" ? column(this) : () => () => {};
    }
    this.#unwire = this.#wire();
  }

  disconnectedCallback() {
    this.#unwire?.();
  }
}

if (typeof customElements < "u" && !customElements.get("luz-chart")) customElements.define("luz-chart", LuzChart);
