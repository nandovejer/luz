const S={transparent:[0,0,0,0],white:[255,255,255,1],black:[0,0,0,1]},v=(e,t,r)=>Math.min(r,Math.max(t,e));function I(e,t,r){const n=i=>(i+e/30)%12,s=t*Math.min(r,1-r),a=i=>r-s*Math.max(-1,Math.min(n(i)-3,Math.min(9-n(i),1)));return[a(0)*255,a(8)*255,a(4)*255]}function B(e){var s;const t=String(e).trim().toLowerCase();if(t in S){const[a,i,l,d]=S[t];return{r:a,g:i,b:l,a:d}}const r=(s=t.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))==null?void 0:s[1];if(r){const a=r.length<=4?[...r].map(l=>l+l).join(""):r,i=l=>parseInt(a.slice(l,l+2),16);return{r:i(0),g:i(2),b:i(4),a:a.length===8?i(6)/255:1}}const n=t.match(/^(rgba?|hsla?)\(([^)]+)\)$/);if(n){const a=n[2].split(/[\s,/]+/).filter(Boolean),i=(l,d=1)=>l.endsWith("%")?parseFloat(l)/100*d:parseFloat(l);if(a.length>=3&&a.length<=4&&a.every(l=>!Number.isNaN(parseFloat(l)))){const l=a[3]===void 0?1:v(i(a[3],1),0,1);if(n[1].startsWith("rgb")){const[f,u,z]=a.slice(0,3).map(m=>v(i(m,255),0,255));return{r:f,g:u,b:z,a:l}}const[d,c,o]=I((parseFloat(a[0])%360+360)%360,v(i(a[1],1),0,1),v(i(a[2],1),0,1));return{r:d,g:c,b:o,a:l}}}throw new Error(`cannot read the colour "${e}": write it as #rrggbb, rgb(), rgba(), hsl() or hsla()`)}const C=(e,t)=>({r:e.r*e.a+t.r*(1-e.a),g:e.g*e.a+t.g*(1-e.a),b:e.b*e.a+t.b*(1-e.a),a:1}),T=({r:e,g:t,b:r})=>{const n=s=>(s/=255)<=.03928?s/12.92:((s+.055)/1.055)**2.4;return .2126*n(e)+.7152*n(t)+.0722*n(r)},N=(e,t)=>{const[r,n]=[T(e),T(t)];return(Math.max(r,n)+.05)/(Math.min(r,n)+.05)},$=e=>`${(Math.floor(e*10+1e-9)/10).toFixed(1)}:1`,x=["surface-page","surface","surface-hover","surface-muted","input-bg"],y=["success","danger","warning","info","teal","purple"],R=["comment","keyword","name","property","string","literal"].map(e=>`code-${e}`),M=[{fg:["text-primary","text-secondary","brand-primary","brand-hover"],bg:x,min:4.5,kind:"text"},{fg:["text-primary","text-secondary"],bg:["surface-strong","surface-pressed"],min:4.5,kind:"text"},{fg:["text-muted"],bg:["input-bg","surface-page","surface"],min:4.5,kind:"text"},{fg:["text-disabled"],bg:["surface-page","surface","input-bg","surface-muted","surface-strong"],min:3,kind:"disabled-text"},{fg:["text-on-fill"],bg:["brand-fill","brand-fill-hover","brand-fill-active","color-danger-fill"],min:4.5,kind:"text"},{fg:["sidebar-text","sidebar-label","sidebar-text-hover"],bg:["sidebar-bg"],min:4.5,kind:"text"},{fg:["sidebar-text-hover"],bg:["sidebar-hover"],min:4.5,kind:"text"},{fg:["sidebar-active-text"],bg:["sidebar-active-bg"],min:4.5,kind:"text"},...y.map(e=>({fg:[`color-${e}`],bg:[`color-${e}-bg > surface-page`,`color-${e}-bg > surface`,`color-${e}-bg > surface-hover`],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-page","surface","surface-muted"],min:4.5,kind:"text"},{fg:["focus-ring"],bg:[...x,"surface-strong"],min:3,kind:"ui"},{fg:["input-border"],bg:["input-bg"],min:3,kind:"ui"},{fg:["outline"],bg:["surface-page","surface"],min:3,kind:"ui"},{fg:["brand-primary"],bg:["surface-muted","surface-pressed"],min:3,kind:"ui"},...y.map(e=>({fg:[`color-${e}`],bg:[`color-${e}-bg > surface-strong`,"surface-page","surface","surface-hover","surface-muted","surface-strong"],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-strong"],min:4.5,kind:"text"},{fg:R,bg:["surface-muted"],min:4.5,kind:"text"},{fg:["input-border"],bg:[...x,"surface-strong"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["outline"],min:4.5,kind:"text"},{fg:["color-danger"],bg:["input-bg"],min:3,kind:"ui"},{fg:["text-primary","text-secondary"],bg:y.map(e=>`color-${e}-bg > surface-page`),min:4.5,kind:"text"},{fg:["text-primary","text-secondary","brand-primary"],bg:["brand-subtle > surface-page"],min:4.5,kind:"text"},{fg:["brand-fill","focus-ring"],bg:["brand-subtle > surface-page"],min:3,kind:"ui"},{fg:["brand-fill"],bg:["surface-page","surface"],min:3,kind:"ui",advisory:!0},{fg:["brand-primary"],bg:["surface-strong"],min:3,kind:"ui"},{fg:["sidebar-active-bg"],bg:["sidebar-bg"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["surface-media"],min:4.5,kind:"text"},{fg:["brand-primary"],bg:["color-warning-bg > surface-page"],min:4.5,kind:"text"},{fg:["focus-ring"],bg:["color-warning-bg > surface-page"],min:3,kind:"ui"},{fg:["brand-fill"],bg:["surface-muted"],min:3,kind:"ui"},{fg:["outline"],bg:["input-bg"],min:3,kind:"ui"}],q=[{fg:R,bg:["surface-muted"],min:7,kind:"text"}],W=e=>e==="high-contrast"?[...M,...q]:M;function D(e){const t=[];for(const{fg:r,bg:n,min:s,kind:a,advisory:i=!1}of e)for(const l of r)for(const d of n)t.push({fg:l,bg:d,min:s,kind:a,advisory:i});return t}const F=/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;function U(e){function t(r,n=[]){if(n.includes(r))throw new Error(`${r} refers to itself`);const s=e[r];if(s===void 0)throw new Error(`${r} is not defined`);const a=s.match(F);return a?e[a[1]]===void 0&&a[2]?{value:a[2].trim(),chain:[...n,r]}:t(a[1],[...n,r]):{value:s,chain:[...n,r]}}return t}function j(e,t){const r=[],n=[],s=i=>{const{value:l,chain:d}=e(`--luz-${i}`);try{return{colour:B(l),chain:d}}catch(c){throw c.tokens=d,c}},a=i=>{const l=i.split(">").map(o=>o.trim());let d=s("surface-page").colour;const c=[];for(const o of l.reverse()){const f=s(o);c.push(...f.chain),d=C(f.colour,d)}return{colour:d,chain:c}};for(const{fg:i,bg:l,min:d,kind:c,advisory:o}of D(t))try{const f=a(l),u=s(i),z=N(C(u.colour,f.colour),f.colour);r.push({foreground:`--luz-${i}`,background:l,ratio:z,minimum:d,kind:c,advisory:o,ok:z+1e-9>=d,tokens:[...u.chain,...f.chain]})}catch(f){n.push({foreground:`--luz-${i}`,background:l,reason:f.message,tokens:f.tokens??[]})}return{results:r,unreadable:n}}const k=["light","dark","high-contrast"],H=e=>e.replace(/\/\*[\s\S]*?\*\//g,t=>t.replace(/[^\n]/g," "));function E(e){const t=H(e),r=[];let n=0,s=1;function a(){let d=0,c="",o=n,f=s;for(;n<t.length&&/\s/.test(t[n]);)t[n]===`
`&&s++,n++;for(o=n,f=s;n<t.length;n++){const u=t[n];if(u===`
`&&s++,c){u==="\\"?n++:u===c&&(c="");continue}if(u==='"'||u==="'")c=u;else if(u==="("||u==="[")d++;else if(u===")"||u==="]")d--;else if(d<=0&&(u==="{"||u===";"||u==="}"))break}return{prelude:t.slice(o,n).trim(),stop:t[n],line:f}}function i(d,c,o){const f=[];for(;n<t.length;){const{prelude:u,stop:z,line:m}=a();if(z==="{")n++,u.startsWith("@")?l(u,d,c):i(d,u.split(",").map(b=>b.trim()).filter(Boolean),m);else{const b=u.indexOf(":");if(u&&!u.startsWith("@")&&b>0){const g=u.slice(0,b).trim();g.startsWith("--luz-")&&f.push({name:g,value:u.slice(b+1).trim(),line:m})}if(z==="}"){n++;break}if(z===";")n++;else break}}return c&&f.length&&r.push({selectors:c,conditions:d,declarations:f,line:o}),f}function l(d,c,o){i([...c,d],o??null,s)}return i([],null,1),r}function L(e){let r=e.trim().replace(/\s+/g,""),n=null,s=null,a=0,i=0;for(/^html/i.test(r)?(r=r.slice(4),i=1):r.startsWith("*")&&(r=r.slice(1));;){if(r.startsWith(":root")){r=r.slice(5),a++;continue}const l=r.match(/^\[(data-theme|data-mode)=(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\]/);if(l){const d=l[2]??l[3]??l[4];l[1]==="data-theme"?n=d:s=d,r=r.slice(l[0].length),a++;continue}break}return r!==""?null:{theme:n,mode:s,specificity:a*100+i}}const P=e=>{var t;return((t=e.match(/^@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/i))==null?void 0:t[1].toLowerCase())??null},G=e=>/^@(layer|supports)\b/i.test(e),Z=(e,t)=>/^@media\s*\(\s*prefers-reduced-motion\s*:/i.test(e)&&t.declarations.length>0&&t.declarations.every(({name:r})=>r.startsWith("--luz-duration-"));function _(e){const t=new Set;for(const{selectors:n}of e)for(const s of n){const a=L(s);a!=null&&a.theme&&!k.includes(a.theme)&&t.add(a.theme)}const r=k.map(n=>({name:n,theme:n,mode:null,scheme:n==="high-contrast"?null:n}));for(const n of[...t].sort()){r.push({name:n,theme:n,mode:null,scheme:"light",custom:!0});for(const s of k)r.push({name:`${n}/${s}`,theme:n,mode:s,scheme:s==="high-contrast"?null:s,custom:!0})}return r}function Y(e,t){const r={},n={},s={},a=[];let i=0;for(const{file:l,rules:d}of t)for(const c of d){i++;let o="any",f=null;for(const u of c.conditions){const z=P(u);z?o=z:G(u)||(f=u)}if(f){if(Z(f,c))continue;a.push({file:l,line:c.line,selector:c.selectors.join(", "),reason:`${f} is not evaluated`});continue}if(!(o!=="any"&&o!==e.scheme))for(const u of c.selectors){const z=L(u);if(!z){l!=="tokens"&&a.push({file:l,line:c.line,selector:u,reason:"only html, :root, [data-theme] and [data-mode] selectors are read"});continue}const m=z.theme===null||z.theme===e.theme,b=z.mode===null?!0:z.mode===e.mode;if(!(!m||!b))for(const{name:g,value:A,line:O}of c.declarations){const w=z.specificity*1e6+i;s[g]!==void 0&&s[g]>w||(s[g]=w,r[g]=A,n[g]={file:l,line:O})}}}return{values:r,origin:n,ignored:a}}function V(e,{strict:t=!1}={}){const r=e.slice(1),n=_(r.flatMap(o=>o.rules)),s=[],a=[],i=new Map,l=new Map;let d=0;const c=(o,f,u)=>[...new Set(o)].filter(z=>u[z]&&u[z].file!=="tokens").map(z=>({token:z,value:f[z],file:u[z].file,line:u[z].line}));for(const o of n){const{values:f,origin:u,ignored:z}=Y(o,e);for(const g of z)l.set(`${g.file}:${g.line} ${g.selector}`,g);const{results:m,unreadable:b}=j(U(f),W(o.name));for(const g of m)d++,!g.ok&&(g.advisory&&!t?a:s).push({mode:o.name,foreground:g.foreground,background:g.background,ratio:Math.floor(g.ratio*100)/100,minimum:g.minimum,kind:g.kind,overrides:c(g.tokens,f,u)});for(const g of b)i.set(g.reason,{mode:o.name,foreground:g.foreground,background:g.background,reason:g.reason,overrides:c(g.tokens,f,u)})}return{ok:s.length===0&&i.size===0,modes:n.map(o=>o.name),checked:d,failures:s,warnings:a,unreadable:[...i.values()],ignored:[...l.values()]}}const J=`/* ==========================================================================
   LUZ Design System — Tokens (no web fonts)
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

@layer luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.site, luz.landing, luz.cms, luz.app, luz.docs, luz.print;
@layer luz.tokens {
/* -------------------------------------------------------------------------
   LAYER 1: PRIMITIVOS
   Los valores base. Nunca cambian entre temas.
   Regla: los componentes NUNCA usan estas variables directamente.
   -------------------------------------------------------------------------- */
:root {
  /* Blue */
  --luz-blue-10: #f6fbff;
  --luz-blue-20: #dff0ff;
  --luz-blue-30: #b3d9ff;
  --luz-blue-40: #77b9ff;
  --luz-blue-50: #208fff;
  --luz-blue-60: #0066cf;
  --luz-blue-70: #004299;
  --luz-blue-80: #00256c;
  --luz-blue-90: #000d4e;
  --luz-blue-100: #020831;

  /* Gray */
  --luz-gray-10: #f9fafc;
  --luz-gray-20: #e9eef4;
  --luz-gray-30: #ced5dd;
  --luz-gray-40: #adb5bd;
  --luz-gray-50: #889099;
  --luz-gray-60: #646b73;
  --luz-gray-70: #434951;
  --luz-gray-80: #282d34;
  --luz-gray-90: #16191e;
  --luz-gray-100: #0d0e11;

  /* Green */
  --luz-green-10: #eefff5;
  --luz-green-20: #beffda;
  --luz-green-30: #89edb8;
  --luz-green-40: #52cf92;
  --luz-green-50: #08aa6b;
  --luz-green-60: #007f4d;
  --luz-green-70: #005733;

  /* Red */
  --luz-red-10: #fff8f8;
  --luz-red-20: #ffe7e6;
  --luz-red-30: #ffc3c1;
  --luz-red-40: #ff8f8c;
  --luz-red-50: #ef4f51;
  --luz-red-60: #c31a26;
  --luz-red-70: #8c000c;

  /* Yellow */
  --luz-yellow-10: #fffae8;
  --luz-yellow-20: #ffedb7;
  --luz-yellow-30: #ffcd51;
  --luz-yellow-40: #e2a928;
  --luz-yellow-50: #bc8200;
  --luz-yellow-60: #7c4d00;
  --luz-yellow-70: #553000;

  /* Teal */
  --luz-teal-10: #effefa;
  --luz-teal-20: #c3fbec;
  --luz-teal-40: #62c9b5;
  --luz-teal-50: #30a491;
  --luz-teal-60: #007c6d;
  --luz-teal-70: #00554b;

  /* Purple */
  --luz-purple-10: #fcf9ff;
  --luz-purple-20: #f3e8ff;
  --luz-purple-40: #ca9aff;
  --luz-purple-50: #ab67f0;
  --luz-purple-60: #853bca;
  --luz-purple-70: #610ca0;

  /* Spacing: --luz-space-unit (0.25rem, the 4px grid) times a step; set the unit on :root */
  --luz-space-unit: 0.25rem;
  --luz-space-3xs: calc(var(--luz-space-unit) / 2);
  --luz-space-2xs: var(--luz-space-unit);
  --luz-space-xs: calc(var(--luz-space-unit) * 2);
  --luz-space-sm: calc(var(--luz-space-unit) * 3);
  --luz-space-md: calc(var(--luz-space-unit) * 4);
  --luz-space-lg: calc(var(--luz-space-unit) * 6);
  --luz-space-xl: calc(var(--luz-space-unit) * 8);
  --luz-space-2xl: calc(var(--luz-space-unit) * 12);
  --luz-space-3xl: calc(var(--luz-space-unit) * 16);
  --luz-space-4xl: calc(var(--luz-space-unit) * 24);

  /* Control heights */
  --luz-control-sm: 28px;
  --luz-control-md: 36px;
  --luz-control-lg: 44px;
  --luz-control-xl: 56px;

  /* Typography: --luz-type-base and --luz-type-ratio size the --luz-text-* steps; set them on :root */
  --luz-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --luz-font-serif: "ET Book", charter, "Bitstream Charter", "Sitka Text", cambria, georgia, serif;
  --luz-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --luz-type-base: 1rem;
  --luz-type-ratio: 1.25;
  --luz-text-xs: max(0.75rem, calc(var(--luz-text-sm) / var(--luz-type-ratio)));
  --luz-text-sm: max(0.875rem, calc(var(--luz-text-base) / var(--luz-type-ratio)));
  --luz-text-md: calc((var(--luz-text-sm) + var(--luz-text-base)) / 2);
  --luz-text-base: var(--luz-type-base);
  --luz-text-lg: calc(var(--luz-text-base) * var(--luz-type-ratio));
  --luz-text-xl: calc(var(--luz-text-lg) * var(--luz-type-ratio));
  --luz-text-2xl: calc(var(--luz-text-xl) * var(--luz-type-ratio));
  --luz-text-3xl: calc(var(--luz-text-2xl) * var(--luz-type-ratio));
  --luz-text-4xl: calc(var(--luz-text-3xl) * var(--luz-type-ratio));

  /* Radius */
  --luz-radius-none: 0px;
  --luz-radius-sm: 2px;
  --luz-radius-md: 4px;
  --luz-radius-full: 9999px;

  /* Shadows */
  --luz-shadow-sm: 0 1px 2px rgba(35,28,22,.08), 0 0 1px rgba(35,28,22,.1);
  --luz-shadow-md: 0 4px 10px rgba(35,28,22,.1), 0 2px 4px rgba(35,28,22,.06);
  --luz-shadow-lg: 0 14px 28px rgba(35,28,22,.14), 0 6px 12px rgba(35,28,22,.08);
  --luz-shadow-icon: 0 2px 8px rgba(0,0,0,.5);

  /* Typography roles: headings and running text (serif headings and body, sans for UI, mono for code) */
  --luz-font-heading: var(--luz-font-serif); /* Headings: the serif. */
  --luz-font-body: var(--luz-font-serif); /* Running text: what <body> and everything that inherits from it uses. The serif; controls, labels, tables and navigation keep --luz-font-sans. A theme of your own can set it to the sans. */
  --luz-text-body: calc(var(--luz-text-base) * 1.0625); /* Running text: a step above --luz-text-base, because ET Book's x-height is small (17px at the default 16px base). It follows the base knob. A theme that sets the sans can set it to var(--luz-text-base). */

  /* Breakpoints: @media (max-width: var()) does not work in native CSS; a canonical reference for JS and preprocessors */
  --luz-mq-sm: 640px; /* mobile */
  --luz-mq-md: 768px; /* tablet / sidebar collapse */
  --luz-mq-lg: 1024px; /* narrow desktop */
  --luz-mq-xl: 1280px; /* standard desktop */
  --luz-mq-xxl: 1536px; /* wide screen */
  --luz-mq-xxxl: 1920px; /* full HD */

  /* Motion: durations */
  --luz-duration-instant: 0.05s;
  --luz-duration-fast: 0.1s;
  --luz-duration-base: 0.2s;
  --luz-duration-slow: 0.3s;
  --luz-duration-slower: 0.5s;
  --luz-duration-lazy: 0.8s;

  /* Motion: easing. LUZ's own curves: movement starts promptly and spends
     most of its time settling, so it reads as calm rather than snappy. */
  --luz-easing-standard: cubic-bezier(0.3, 0, 0.1, 1); /* moves within the page */
  --luz-easing-enter: cubic-bezier(0.15, 0.6, 0.3, 1); /* arrives quickly, settles slowly */
  --luz-easing-exit: cubic-bezier(0.5, 0, 0.85, 0.4); /* leaves without a long tail */
  --luz-easing-spring: cubic-bezier(0.3, 1.35, 0.55, 1); /* a small overshoot */
  --luz-easing-linear: linear;
}

/* Whole 1/16 rem steps, where round() exists (the plain chain above is the fallback) */
@supports (width: round(1px, 1px)) {
  :root {
    --luz-text-xs: max(0.75rem, round(calc(var(--luz-text-sm) / var(--luz-type-ratio)), 0.0625rem));
    --luz-text-sm: max(0.875rem, round(calc(var(--luz-text-base) / var(--luz-type-ratio)), 0.0625rem));
    --luz-text-md: round(calc((var(--luz-text-sm) + var(--luz-text-base)) / 2), 0.0625rem);
    --luz-text-lg: round(calc(var(--luz-text-base) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-xl: round(calc(var(--luz-text-lg) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-2xl: round(calc(var(--luz-text-xl) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-3xl: round(calc(var(--luz-text-2xl) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-4xl: round(calc(var(--luz-text-3xl) * var(--luz-type-ratio)), 0.0625rem);
  }
}

/* Arabic: ET Book has no Arabic letters, so running text and headings take
   the system sans, which has them on every platform (no bundled font, red
   line 13). Zero specificity: your own rule, outside LUZ's layers, still wins. */
:where(:lang(ar)) {
  --luz-font-heading: var(--luz-font-sans);
  --luz-font-body: var(--luz-font-sans);
}

/* Reduced motion: one switch. Every transition and animation in LUZ takes
   its duration from these tokens, so zeroing them removes the motion
   everywhere without !important. Never hard-code a duration in a component. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --luz-duration-instant: 0s;
    --luz-duration-fast: 0s;
    --luz-duration-base: 0s;
    --luz-duration-slow: 0s;
    --luz-duration-slower: 0s;
    --luz-duration-lazy: 0s;
  }
}

/* -------------------------------------------------------------------------
   LAYER 2: SEMANTIC
   Theme-aware tokens. Components ONLY consume these (never Layer 1 primitives).
   Base color modes are activated via data-theme on <html>:
     <html>                            → default (light)
     <html data-theme="light">         → light (explicit)
     <html data-theme="dark">          → dark
     <html data-theme="high-contrast"> → high contrast
   The values here are the Vejer look. A theme of your own overrides them
   under its own [data-theme="<name>"] scope and uses data-mode for the dark
   and high-contrast variants; start from packages/core/src/themes/_template.css.

   Surfaces, the same model in every mode: the page and the surfaces on it
   (cards, dialogs, fields) are one flat face. Two tones step away from it:
   --luz-surface-muted (code, wells) one step, --luz-surface-strong (table
   headers, tags, tooltips, toasts) two. Hover takes the muted step and
   pressed the strong one. Light steps darker from white; dark steps
   lighter from gray-90, and keeps gray-100 for the sidebar.
   -------------------------------------------------------------------------- */

:root,
[data-theme="light"] {
  /* Surfaces */
  --luz-surface-page: #fbf8f2; /* the walls: a warm, creamy white */
  --luz-surface: #fffdf9; /* fresh whitewash, raised surfaces */
  --luz-surface-hover: #f4ede0; /* sun on sandstone: hover */
  --luz-surface-pressed: #ebe0cc; /* sandstone in shade: pressed */
  --luz-surface-muted: #fbf8f2; /* the walls: a warm, creamy white */
  --luz-surface-strong: #efe6d6; /* cut sandstone: the deepest layer */
  --luz-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --luz-surface-media: #000;

  /* Text (icons use the same tokens) */
  --luz-text-primary: #231c16; /* wrought iron: text, 13.6:1 on the stone */
  --luz-text-secondary: #6b5a48; /* old door wood: secondary text, 5:1 or more */
  --luz-text-muted: #7a6a58; /* 5.1:1 on the input */
  --luz-text-disabled: #8f8172; /* 3:1 on surface-strong, the worst surface */
  --luz-text-on-fill: #fff;

  /* Lines */
  --luz-divider: #e3d4b8; /* sandstone joints: hairlines */
  --luz-outline: #807366; /* 4.6:1 under the white text of .luz-badge--gray; 3:1 or more as a border */
  --luz-focus-ring: #2365a6; /* the sky, deepened to 4.6:1: links and actions */

  /* Brand */
  --luz-brand-primary: #2365a6; /* the sky, deepened to 4.6:1: links and actions */
  --luz-brand-hover: #1b5089;
  --luz-brand-active: #143d69;
  --luz-brand-subtle: #e3eef9;
  /* Solid brand surfaces that carry --luz-text-on-fill (primary button,
     badge). Same as the brand in light; darker than it in dark mode, where
     the brand is light enough to be read as text on dark surfaces. */
  --luz-brand-fill: #2365a6; /* white text 6:1 */
  --luz-brand-fill-hover: #1b5089;
  --luz-brand-fill-active: #143d69;

  /* Sidebar */
  --luz-sidebar-bg: #2a211a;
  --luz-sidebar-text: #e3d5bf; /* 10.9:1 */
  --luz-sidebar-text-hover: #fff;
  --luz-sidebar-hover: #3a2f25;
  --luz-sidebar-active-bg: #9cc8ee; /* light sky */
  --luz-sidebar-active-text: #1a140f; /* 10.4:1 */
  --luz-sidebar-border: #3d3127;
  --luz-sidebar-label: #b9a78f; /* 6.8:1 */
  --luz-sidebar-logo-bg: #9cc8ee; /* shares the active link's text colour */

  /* Status */
  --luz-color-success: #177734;
  --luz-color-success-bg: var(--luz-green-10);
  --luz-color-danger: #ca1c25;
  --luz-color-danger-bg: var(--luz-red-10);
  --luz-color-danger-fill: var(--luz-color-danger);
  --luz-color-warning: var(--luz-yellow-60);
  --luz-color-warning-accent: var(--luz-yellow-30);
  --luz-color-warning-bg: var(--luz-yellow-10);
  --luz-color-info: var(--luz-blue-70);
  --luz-color-info-bg: var(--luz-blue-10);

  /* Inputs */
  --luz-input-bg: #fffdf9; /* fresh whitewash, raised surfaces */
  --luz-input-border: #8b7d6f; /* field and strong borders, 3:1 on every surface */

  /* Extended */
  --luz-color-teal: #00736f;
  --luz-color-teal-bg: var(--luz-teal-10);
  --luz-color-purple: #803ae9;
  --luz-color-purple-bg: var(--luz-purple-10);
  --luz-color-code: #803ae9;

  /* Code syntax (pre.luz-code-block, on --luz-surface-muted). Keywords stay
     ink and bold; colour goes to what the author wrote: names, properties,
     values. Comments are muted and italic. No red: red means error. */
  --luz-code-comment: var(--luz-gray-60); /* 5.2:1 */
  --luz-code-keyword: var(--luz-text-primary);
  --luz-code-name: var(--luz-blue-70); /* 9.0:1 */
  --luz-code-property: var(--luz-purple-60); /* 5.8:1 */
  --luz-code-string: var(--luz-green-60); /* 4.9:1 */
  --luz-code-literal: var(--luz-yellow-60); /* 6.9:1 */
}

/* -------------------------------------------------------------------------
   COLOR MODE: DARK — <html data-theme="dark">
   -------------------------------------------------------------------------- */

/* The :root:has() selectors are the no-JavaScript path: a checked radio of the
   color-mode switcher (.luz-mode-switcher) re-scopes the tokens for the
   session. theme.js adds persistence and the OS preference on top. They are
   wrapped in :is() so a browser without :has() drops them instead of
   invalidating the whole rule. */
[data-theme="dark"],
:is(:root:has(input[name="luz-theme"][value="dark"]:checked)) {
  /* Surfaces */
  --luz-surface-page: #1c1712;
  --luz-surface: #241e18;
  --luz-surface-hover: #2e261f;
  --luz-surface-pressed: #3a3028;
  --luz-surface-muted: #1c1712;
  --luz-surface-strong: #3a3028;
  --luz-scrim: rgba(0, 0, 0, 0.7);
  --luz-surface-media: #000;

  /* Shadows: the same offsets on a darker ground, so a heavier black */
  --luz-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --luz-shadow-md: 0 4px 10px rgba(0, 0, 0, 0.5);
  --luz-shadow-lg: 0 14px 28px rgba(0, 0, 0, 0.6);

  /* Text (icons use the same tokens) */
  --luz-text-primary: #f3ece1; /* whitewash by night: 11:1 on the stone */
  --luz-text-secondary: #b8a690; /* 5.5:1 on the stone */
  --luz-text-muted: #a08f7a; /* 5.3:1 on the input */
  --luz-text-disabled: #877a69; /* 3:1 on surface-strong */
  --luz-text-on-fill: #fff;

  /* Lines */
  --luz-divider: #43382d;
  --luz-outline: #7d7062; /* white badge text 4.8:1; 3:1 or more on page, surface and hover */
  --luz-focus-ring: #6fb1ec; /* 5:1 on the stone and on the brand tint */

  /* Brand */
  /* blue-40: 4.5:1 or more as text on every dark surface */
  --luz-brand-primary: #6fb1ec; /* 5:1 on the stone and on the brand tint */
  --luz-brand-hover: #9ccaf2;
  --luz-brand-active: #c8e1f8;
  --luz-brand-subtle: rgba(32, 143, 255, 0.14); /* blue-50 */
  --luz-brand-fill: #2172c1; /* white text 4.9:1; 3:1 or more on page and surfaces: the light sky is for text */
  --luz-brand-fill-hover: #18548f;
  --luz-brand-fill-active: #134577;

  /* Sidebar */
  --luz-sidebar-bg: #14100c;
  --luz-sidebar-text: #cbbba5; /* 10.1:1 */
  --luz-sidebar-text-hover: #fff;
  --luz-sidebar-hover: #241e18;
  --luz-sidebar-active-bg: #8cc4f5;
  --luz-sidebar-active-text: #14100c;
  --luz-sidebar-border: #2e261f;
  --luz-sidebar-label: #a8977f; /* 6.7:1 */
  --luz-sidebar-logo-bg: #8cc4f5;

  /* Status */
  --luz-color-success: var(--luz-green-30);
  --luz-color-success-bg: rgba(82, 207, 146, 0.12);
  --luz-color-danger: var(--luz-red-30);
  --luz-color-danger-bg: rgba(239, 79, 81, 0.12);
  --luz-color-danger-fill: var(--luz-red-60); /* white text 4.8:1 */
  --luz-color-warning: var(--luz-yellow-30);
  --luz-color-warning-accent: var(--luz-yellow-20);
  --luz-color-warning-bg: rgba(255, 205, 81, 0.12);
  --luz-color-info: var(--luz-blue-30);
  --luz-color-info-bg: rgba(119, 185, 255, 0.12);

  /* Inputs */
  --luz-input-bg: #241e18;
  --luz-input-border: #877a69; /* 3:1 on every surface */

  /* Extended */
  --luz-color-teal: var(--luz-teal-40);
  --luz-color-teal-bg: rgba(98, 201, 181, 0.12);
  --luz-color-purple: var(--luz-purple-20);
  --luz-color-purple-bg: rgba(202, 154, 255, 0.12);
  --luz-color-code: var(--luz-purple-40); /* 5.5:1 on surface-strong */

  /* Code syntax, on --luz-surface-muted (gray-80) */
  --luz-code-comment: var(--luz-gray-40);
  --luz-code-keyword: var(--luz-text-primary);
  --luz-code-name: var(--luz-blue-30);
  --luz-code-property: var(--luz-purple-40);
  --luz-code-string: var(--luz-green-40);
  --luz-code-literal: var(--luz-yellow-40);
}

/* -------------------------------------------------------------------------
   COLOR MODE: HIGH CONTRAST — <html data-theme="high-contrast">
   Pure white page, pure black text, strong borders. Maximum WCAG contrast.
   -------------------------------------------------------------------------- */

[data-theme="high-contrast"],
:is(:root:has(input[name="luz-theme"][value="high-contrast"]:checked)) {
  /* Surfaces */
  --luz-surface-page: #fff;
  --luz-surface: #fff;
  --luz-surface-hover: var(--luz-gray-10);
  --luz-surface-pressed: var(--luz-gray-20);
  --luz-surface-muted: var(--luz-gray-10);
  --luz-surface-strong: var(--luz-gray-20);
  --luz-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --luz-surface-media: #000;

  /* Shadows: an edge instead of a blur, which a low-vision reader cannot see */
  --luz-shadow-sm: none;
  --luz-shadow-md: 0 0 0 1px #000;
  --luz-shadow-lg: 0 0 0 2px #000;

  /* Text (icons use the same tokens) */
  --luz-text-primary: #000;
  --luz-text-secondary: var(--luz-gray-100);
  --luz-text-muted: var(--luz-gray-70);
  --luz-text-disabled: var(--luz-gray-60); /* 3.8:1 on surface-strong */
  --luz-text-on-fill: #fff;

  /* Lines */
  --luz-divider: var(--luz-gray-70);
  --luz-outline: #000;
  --luz-focus-ring: #000;

  /* Brand */
  --luz-brand-primary: var(--luz-blue-80);
  --luz-brand-hover: var(--luz-blue-90);
  --luz-brand-active: var(--luz-blue-100);
  --luz-brand-subtle: var(--luz-blue-10);
  --luz-brand-fill: var(--luz-blue-80); /* white text 6:1 */
  --luz-brand-fill-hover: var(--luz-blue-90);
  --luz-brand-fill-active: var(--luz-blue-100);

  /* Sidebar */
  --luz-sidebar-bg: #000;
  --luz-sidebar-text: var(--luz-gray-30);
  --luz-sidebar-text-hover: #fff;
  --luz-sidebar-hover: var(--luz-gray-90);
  --luz-sidebar-active-bg: #fff;
  --luz-sidebar-active-text: #000;
  --luz-sidebar-border: var(--luz-gray-80);
  --luz-sidebar-label: var(--luz-gray-50);
  --luz-sidebar-logo-bg: #fff;

  /* Status */
  --luz-color-success: #105224;
  --luz-color-success-bg: var(--luz-green-10);
  --luz-color-danger: #8d131a;
  --luz-color-danger-bg: var(--luz-red-10);
  --luz-color-danger-fill: var(--luz-color-danger);
  --luz-color-warning: #5a4300;
  --luz-color-warning-accent: var(--luz-yellow-40);
  --luz-color-warning-bg: var(--luz-yellow-10);
  --luz-color-info: var(--luz-blue-80);
  --luz-color-info-bg: var(--luz-blue-10);

  /* Inputs */
  --luz-input-bg: #fff;
  --luz-input-border: #000;

  /* Extended */
  --luz-color-teal: #00504d;
  --luz-color-teal-bg: var(--luz-teal-10);
  --luz-color-purple: #5828a1;
  --luz-color-purple-bg: var(--luz-purple-10);
  --luz-color-code: #5828a1;

  /* Code syntax, on --luz-surface-muted: 7:1 or more, darker steps of the
     same hues as light */
  --luz-code-comment: var(--luz-gray-70); /* 8.7:1 */
  --luz-code-keyword: var(--luz-text-primary);
  --luz-code-name: var(--luz-blue-80); /* 13.6:1 */
  --luz-code-property: var(--luz-purple-70); /* 9.7:1 */
  --luz-code-string: var(--luz-green-70); /* 8.3:1 */
  --luz-code-literal: var(--luz-yellow-70); /* 11.1:1 */
}

}
`,p=(e,t)=>e.replace(/\{(\w+)\}/g,(r,n)=>String(t[n]??""));function h(e,t,r="li"){const n=document.createElement(r);return n.textContent=t,e.append(n),n}function K(e=document){const t=e.querySelector("[data-contrast-tool]");if(!t||t.dataset.ready)return;const r=t.querySelector("textarea"),n=t.querySelector("button"),s=t.querySelector("[data-contrast-result]");if(!r||!n||!s)return;const a=s.dataset,i={file:"tokens",rules:E(J)};n.addEventListener("click",()=>{let l;try{l=V([i,{file:a.file,rules:E(r.value)}])}catch(o){s.replaceChildren(),h(s,`${a.error} ${o.message}`,"p");return}s.replaceChildren();const d=l.modes.join(", ");h(s,p(l.ok?a.pass:a.fail,{checked:l.checked,modes:d,failures:l.failures.length+l.unreadable.length}),"p");const c=document.createElement("ul");for(const o of l.failures){const f=h(c,p(a.item,{modes:o.mode,foreground:o.foreground,background:o.background,ratio:$(o.ratio),minimum:o.minimum}));for(const u of o.overrides)h(f,p(a.set,{token:u.token,value:u.value,line:u.line}),"small").before(document.createElement("br"))}for(const o of l.unreadable)h(c,p(a.unreadable,{foreground:o.foreground,background:o.background,reason:o.reason}));for(const o of l.warnings)h(c,p(a.warning,{modes:o.mode,foreground:o.foreground,background:o.background,ratio:$(o.ratio),minimum:o.minimum}));for(const o of l.ignored)h(c,p(a.ignored,{selector:o.selector,line:o.line}));c.children.length&&s.append(c)}),t.dataset.ready=""}export{K as initContrastTool};
