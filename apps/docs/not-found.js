/**
 * The not-found page in the reader's language. English is the page; a section
 * of a docs language ([data-not-found-lang], hidden) holds that language's
 * lead and its button. When the first of the browser's languages that the page
 * knows is that language, the lead takes the English one's place in the
 * reading order (with the section's lang and dir) and the section is shown.
 * It reads only navigator.languages (the browser's settings: no permission, no
 * location), never the address of the page, and it sends and stores nothing.
 */
const sections = [...document.querySelectorAll("[data-not-found-lang]")];
const english = document.querySelector("[data-not-found-default]");
const wanted = navigator.languages?.length ? navigator.languages : [navigator.language];

for (const tag of wanted) {
  const code = String(tag).toLowerCase().split("-")[0];
  if (code === "en") break;
  const section = sections.find((s) => s.dataset.notFoundLang === code);
  if (!section) continue;
  const lead = section.querySelector(".docs-lead");
  if (lead && english) {
    lead.lang = section.lang;
    lead.dir = section.dir;
    english.before(lead);
    english.hidden = true;
  }
  section.hidden = false;
  break;
}
