#!/usr/bin/env node
/*
 * PostToolUse on Edit|Write: lint the one file just written (ESLint for .js,
 * stylelint for .css, the same scopes as `pnpm lint:js` and `pnpm lint:css`).
 * Silent when it passes; on a failure it exits 2 with the first lines of the
 * linter's output, so the author fixes it now instead of at the next gate run.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const JS = /^(packages|apps|scripts|tests)\/.+\.js$|^[^/]+\.config\.js$/;
const CSS = /^(packages|apps)\/.+\.css$/;
const SKIP = /(^|\/)(dist|node_modules)\/|^docs\//;
const MAX_LINES = 30;

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const file = input.tool_input?.file_path;
  if (!file) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = path.relative(root, path.resolve(input.cwd || root, file)).split(path.sep).join('/');
  if (rel.startsWith('..') || SKIP.test(rel)) process.exit(0);

  const tool = JS.test(rel) ? 'eslint' : CSS.test(rel) ? 'stylelint' : null;
  if (!tool) process.exit(0);

  const bin = path.join(root, 'node_modules', '.bin', tool);
  const r = spawnSync(bin, [rel], { cwd: root, encoding: 'utf8', timeout: 60000 });
  // A missing binary or a timeout is not the author's error: stay silent.
  if (r.error || r.status === 0 || r.status === null) process.exit(0);
  const out = `${r.stdout}${r.stderr}`.trim().split('\n').slice(0, MAX_LINES).join('\n');
  process.stderr.write(`${tool} fails on ${rel}:\n${out}\n`);
  process.exit(2);
});
