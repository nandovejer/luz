#!/usr/bin/env node
/*
 * PreToolUse on Bash: prompt-injection-auditor reads hostile text for a living,
 * so its shell is closed by code, not by its own good behaviour. It may run
 * read-only git and gh, optionally piped into grep, head, tail or wc, and
 * nothing else: no chaining, redirection, substitution, options before the git
 * subcommand, or flag that writes a file or starts another program.
 * Every other agent, and a call with no agent_type, is left alone.
 */
const AGENT = 'prompt-injection-auditor';

const GIT = new Set([
  'diff', 'log', 'show', 'status', 'ls-files', 'ls-tree', 'rev-parse', 'rev-list',
  'merge-base', 'cat-file', 'blame', 'grep', 'shortlog', 'diff-tree', 'show-ref', 'describe',
]);
const GIT_FLAGS_DENIED = /^(--output(=|$)|--ext-diff$|--textconv$|--no-index$|--open-files-in-pager(=|$)|-O|--exec|--upload-pack|--receive-pack|--git-dir|--work-tree|--contents$)/;
// git accepts clustered short options and abbreviated long options, so the anchored list above is not enough:
// -O in a cluster (-nOsh) and any prefix of --output or, for grep, of --open-files-in-pager (--o is also --or).
const GIT_CLUSTER_DENIED = /^-[A-Za-z]*O/;
const GIT_ABBREV_DENIED = /^--ou/;
const GIT_GREP_ABBREV_DENIED = /^--o(?!r$)/;
const GH = {
  pr: new Set(['view', 'diff', 'list', 'status', 'checks']),
  issue: new Set(['view', 'list', 'status']),
};
const GH_FLAGS_DENIED = /^(-w|--web|--editor|-e)$/;
const FILTERS = new Set(['grep', 'head', 'tail', 'wc']);
const FILTER_FLAGS_DENIED = /^(-f|-F|--follow|--output(=|$)|--exec)/;

// Split the command into stages on unquoted pipes, and each stage into words.
// Returns null when the command uses anything outside the plain subset.
function parse(command) {
  const stages = [[]];
  let word = '';
  let has = false;
  let quote = null;
  const push = () => {
    if (has) stages[stages.length - 1].push(word);
    word = '';
    has = false;
  };
  for (const ch of command) {
    if (quote === "'") {
      if (ch === "'") quote = null;
      else word += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === '$' || ch === '`' || ch === '\\') return null;
      else word += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (ch === '\n' || ch === '\r') return null;
      push();
    } else if (ch === '|') {
      push();
      stages.push([]);
    } else if (/[;&<>()`$\\{}]/.test(ch)) {
      return null;
    } else {
      word += ch;
      has = true;
    }
  }
  if (quote) return null;
  push();
  return stages.every((s) => s.length > 0) ? stages : null;
}

function allowed(words, first) {
  const [cmd, sub, verb] = words;
  if (first && cmd === 'git') {
    if (!sub || !GIT.has(sub)) return false;
    return !words.slice(2).some(
      (w) =>
        GIT_FLAGS_DENIED.test(w) ||
        GIT_CLUSTER_DENIED.test(w) ||
        GIT_ABBREV_DENIED.test(w) ||
        (sub === 'grep' && GIT_GREP_ABBREV_DENIED.test(w)),
    );
  }
  if (first && cmd === 'gh') {
    if (!GH[sub]?.has(verb)) return false;
    return !words.slice(3).some((w) => GH_FLAGS_DENIED.test(w));
  }
  if (!first && FILTERS.has(cmd)) {
    return !words.slice(1).some((w) => FILTER_FLAGS_DENIED.test(w));
  }
  return false;
}

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  if (input.agent_type !== AGENT) process.exit(0);
  const command = input.tool_input?.command;
  const stages = typeof command === 'string' ? parse(command) : null;
  if (stages && stages.every((words, i) => allowed(words, i === 0))) process.exit(0);
  process.stderr.write(
    `Blocked: ${AGENT} runs read-only git and gh only (git diff, log, show, status, ls-files, grep…; gh pr view or diff, gh issue view or list), optionally piped into grep, head, tail or wc. No chaining, redirects, substitution or flags that write files or run programs. Use Read, Grep and Glob for files.\n`,
  );
  process.exit(2);
});
