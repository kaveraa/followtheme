# followtheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scoped theme (attribute, class or inline custom properties on a wrapper) follows the overlays that wrapper opens into `document.body`, in React and Vue, with any portal library.

**Architecture:** A framework-free DOM core (`src/core.ts`) finds the nearest theme scope of an origin element and mirrors its markers onto a portal root, kept in sync by a `MutationObserver` and released on removal; `start()` automates this for every new child of `body` using the active element or the last interaction as origin. Thin React and Vue adapters wrap `start`/`apply` in a provider, a hook, a plugin and a composable.

**Tech Stack:** TypeScript 5, ESM only, zero runtime dependencies, tsdown for the build, Vitest + happy-dom for tests, @testing-library/react and @vue/test-utils for the adapters, GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-10-02-followtheme-design.md`

## Global Constraints

- Package name `followtheme`, MIT, repository `kaveraa/followtheme`, everything in English.
- Zero runtime dependencies. `react` (>=18) and `vue` (>=3.3) are optional peer dependencies only.
- ESM only; three entry points `followtheme`, `followtheme/react`, `followtheme/vue`, each with types.
- Node 20+ for the toolchain; runtime needs `MutationObserver` and `Element.closest` only.
- Default markers: attributes `['data-theme']`, classes `['dark', /^theme-/]`, `inlineVars: true`.
- `html` and `body` are never theme scopes.
- Every export is a no-op when `typeof document === 'undefined'`.
- Commits: short subject, no AI mention, no co-author, no trailer. Plain text only: no emoji, no arrow symbol, no long dash, no curly quotes.
- Crewcut rules apply while building: grep then ranged reads, no test file beyond the ones this plan names, no optional prop or mode the spec did not name.

## Review Focus

Inputs the spec implies but no test in the spec's list exercises; each has a test added to its owning task below.

1. A root inserted nested, not as a direct child of `body` (a library with a persistent container): must be left alone by `start`, with no error (Task 4).
2. The source scope removed from the DOM while the overlay is open: the root keeps its last mirrored values and nothing throws (Task 3).
3. A theme attribute removed from the scope while mirrored: the attribute leaves the root too, instead of staying stale (Task 3).
4. Two overlays opened from two different scopes at the same time: each follows its own origin, no cross-talk (Task 4).
5. A portal root that already carries its own `data-theme` (a library stamping its own theme): the mirror does not overwrite it, and `stop` does not remove it (Task 3).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `LICENSE`, `.github/workflows/tests.yml`, `src/core.ts` (empty export), `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm test`, `npm run build`, `npm run typecheck` scripts that later tasks run.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "followtheme",
  "version": "0.0.0",
  "description": "A scoped theme follows the overlays it opens: dialogs, popovers and toasts portalled to body keep the theme of the section that opened them. React, Vue, any portal library.",
  "license": "MIT",
  "author": "Augustin Kavera",
  "repository": { "type": "git", "url": "git+https://github.com/kaveraa/followtheme.git" },
  "keywords": ["theme", "portal", "teleport", "css-variables", "dark-mode", "radix", "vaul", "react", "vue"],
  "type": "module",
  "sideEffects": false,
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/core.d.ts", "default": "./dist/core.js" },
    "./react": { "types": "./dist/react.d.ts", "default": "./dist/react.js" },
    "./vue": { "types": "./dist/vue.d.ts", "default": "./dist/vue.js" }
  },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run typecheck && npm test && npm run build"
  },
  "peerDependencies": { "react": ">=18", "vue": ">=3.3" },
  "peerDependenciesMeta": { "react": { "optional": true }, "vue": { "optional": true } },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^18.0.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "tsdown": "^0.14.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0",
    "vue": "^3.5.0"
  },
  "engines": { "node": ">=20" }
}
```

Run `npm view <name> version` for each dev dependency before installing and pin to the current major if a listed range no longer resolves.

- [ ] **Step 2: Write tsconfig.json, tsdown.config.ts, vitest.config.ts**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

`tsdown.config.ts`:
```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { core: 'src/core.ts', react: 'src/react.tsx', vue: 'src/vue.ts' },
  format: 'esm',
  dts: true,
  clean: true,
  external: ['react', 'react/jsx-runtime', 'vue'],
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'happy-dom', globals: true, include: ['tests/**/*.test.{ts,tsx}'] },
});
```

- [ ] **Step 3: LICENSE (MIT, 2026, Augustin Kavera), CI workflow, placeholder source**

`.github/workflows/tests.yml`:
```yaml
name: tests
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

`src/core.ts`, `src/react.tsx` and `src/vue.ts`: each `export {};` for now, so the three-entry build passes from Task 1. Tasks 2, 5 and 6 replace them.

- [ ] **Step 4: Write the smoke test**

`tests/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('environment', () => {
  it('has a document and a MutationObserver', () => {
    expect(typeof document).toBe('object');
    expect(typeof MutationObserver).toBe('function');
  });
});
```

- [ ] **Step 5: Install and run everything**

Run: `npm install && npm run typecheck && npm test && npm run build`
Expected: install clean, typecheck clean, 1 test passing, `dist/core.js`, `dist/react.js`, `dist/vue.js` with `.d.ts` files.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold the package"
```

---

### Task 2: Options, configure and scopeOf

**Files:**
- Modify: `src/core.ts`
- Test: `tests/core.test.ts`

**Interfaces:**
- Produces:
  - `type Options = { attributes?: string[]; classes?: (string | RegExp)[]; inlineVars?: boolean; ignore?: (root: Element) => boolean; root?: HTMLElement }`
  - `configure(options: Options): void`
  - `scopeOf(el: Element | null, options?: Options): Element | null`
  - internal `resolve(options?: Options): Resolved`, `matchingClasses(el, o): string[]`, `inlineVars(el): [string, string][]` used by Task 3.

- [ ] **Step 1: Write the failing tests**

`tests/core.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';
import { configure, scopeOf } from '../src/core';

const html = (s: string) => { document.body.innerHTML = s; };

afterEach(() => { document.body.innerHTML = ''; configure({ attributes: ['data-theme'], classes: ['dark', /^theme-/], inlineVars: true }); });

describe('scopeOf', () => {
  it('finds the nearest data-theme ancestor', () => {
    html('<section data-theme="ocean"><div><button id="b">open</button></div></section>');
    const b = document.getElementById('b')!;
    expect(scopeOf(b)?.getAttribute('data-theme')).toBe('ocean');
  });
  it('matches theme classes but not other classes', () => {
    html('<div class="card"><div class="theme-sunset"><span id="s"></span></div></div>');
    expect(scopeOf(document.getElementById('s'))?.className).toBe('theme-sunset');
    html('<div class="card"><span id="s"></span></div>');
    expect(scopeOf(document.getElementById('s'))).toBeNull();
  });
  it('treats inline custom properties as a scope, unless inlineVars is off', () => {
    html('<div style="--brand: red"><span id="s"></span></div>');
    const s = document.getElementById('s');
    expect(scopeOf(s)).not.toBeNull();
    expect(scopeOf(s, { inlineVars: false })).toBeNull();
  });
  it('never returns html or body', () => {
    document.documentElement.setAttribute('data-theme', 'x');
    document.body.classList.add('dark');
    html('<span id="s"></span>');
    expect(scopeOf(document.getElementById('s'))).toBeNull();
    document.documentElement.removeAttribute('data-theme');
    document.body.classList.remove('dark');
  });
  it('returns null for null and uses configured attributes', () => {
    expect(scopeOf(null)).toBeNull();
    html('<div data-brand="acme"><span id="s"></span></div>');
    expect(scopeOf(document.getElementById('s'))).toBeNull();
    configure({ attributes: ['data-brand'] });
    expect(scopeOf(document.getElementById('s'))?.getAttribute('data-brand')).toBe('acme');
  });
  it('rejects invalid options with a message naming the option', () => {
    expect(() => configure({ attributes: ['bad name'] })).toThrow(/attributes/);
    expect(() => configure({ classes: [42 as unknown as string] })).toThrow(/classes/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/core.test.ts`
Expected: FAIL, `configure`/`scopeOf` not exported.

- [ ] **Step 3: Implement**

`src/core.ts`:
```ts
export type Options = {
  attributes?: string[];
  classes?: (string | RegExp)[];
  inlineVars?: boolean;
  ignore?: (root: Element) => boolean;
  root?: HTMLElement;
};

type Resolved = {
  attributes: string[];
  classes: (string | RegExp)[];
  inlineVars: boolean;
  ignore?: (root: Element) => boolean;
  root?: HTMLElement;
};

const hasDocument = () => typeof document !== 'undefined';
const ATTR = /^[a-zA-Z_:][-\w:.]*$/;

let current: Resolved = { attributes: ['data-theme'], classes: ['dark', /^theme-/], inlineVars: true };

function validate(o: Options): void {
  for (const a of o.attributes ?? []) {
    if (typeof a !== 'string' || !ATTR.test(a)) throw new TypeError(`followtheme: invalid entry in options.attributes: ${String(a)}`);
  }
  for (const c of o.classes ?? []) {
    if (typeof c !== 'string' && !(c instanceof RegExp)) throw new TypeError(`followtheme: options.classes takes strings or RegExps, got ${String(c)}`);
  }
}

export function configure(options: Options): void {
  validate(options);
  current = { ...current, ...options };
}

export function resolve(options?: Options): Resolved {
  if (!options) return current;
  validate(options);
  return { ...current, ...options };
}

export function matchingClasses(el: Element, o: Resolved): string[] {
  return [...el.classList].filter((c) => o.classes.some((m) => (typeof m === 'string' ? m === c : m.test(c))));
}

export function inlineVars(el: Element): [string, string][] {
  const style = el.getAttribute('style');
  if (!style) return [];
  return style.split(';').flatMap((decl) => {
    const i = decl.indexOf(':');
    if (i < 0) return [];
    const name = decl.slice(0, i).trim();
    return name.startsWith('--') ? [[name, decl.slice(i + 1).trim()]] : [];
  });
}

function isRoot(el: Element): boolean {
  return el === document.documentElement || el === document.body;
}

function isScope(el: Element, o: Resolved): boolean {
  if (isRoot(el)) return false;
  return o.attributes.some((a) => el.hasAttribute(a)) || matchingClasses(el, o).length > 0 || (o.inlineVars && inlineVars(el).length > 0);
}

export function scopeOf(el: Element | null, options?: Options): Element | null {
  if (!hasDocument() || !el) return null;
  const o = resolve(options);
  for (let n: Element | null = el; n && !isRoot(n); n = n.parentElement) if (isScope(n, o)) return n;
  return null;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/core.test.ts && npm run typecheck`
Expected: 6 tests pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/core.ts tests/core.test.ts
git commit -m "Find the nearest theme scope"
```

---

### Task 3: apply and the mirror

**Files:**
- Modify: `src/core.ts`
- Test: `tests/core.test.ts` (append a `describe('apply')`)

**Interfaces:**
- Consumes: `resolve`, `scopeOf`, `matchingClasses`, `inlineVars` from Task 2.
- Produces: `apply(root: Element, origin: Element | null, options?: Options): () => void`, internal `release(root: Element): void`, `MARK = 'data-followtheme'`, `mirrors: WeakMap<Element, Mirror>`, `hasMirror(root): boolean` used by Task 4.

- [ ] **Step 1: Write the failing tests**

Append to `tests/core.test.ts` (add `apply` to the import):
```ts
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('apply', () => {
  it('mirrors attribute, theme classes and inline vars onto the root', () => {
    html('<section data-theme="ocean" class="card dark theme-x" style="--brand: red; color: blue"><button id="b"></button></section><div id="root"></div>');
    const root = document.getElementById('root')!;
    apply(root, document.getElementById('b'));
    expect(root.getAttribute('data-theme')).toBe('ocean');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('theme-x')).toBe(true);
    expect(root.classList.contains('card')).toBe(false);
    expect((root as HTMLElement).style.getPropertyValue('--brand')).toBe('red');
    expect((root as HTMLElement).style.color).toBe('');
    expect(root.hasAttribute('data-followtheme')).toBe(true);
  });
  it('writes nothing when the origin has no scope', () => {
    html('<button id="b"></button><div id="root"></div>');
    apply(document.getElementById('root')!, document.getElementById('b'));
    expect(document.getElementById('root')!.attributes.length).toBe(1); // id only
  });
  it('writes nothing when the root already sits inside a scope', () => {
    html('<section data-theme="ocean"><button id="b"></button></section><section data-theme="sand"><div id="root"></div></section>');
    apply(document.getElementById('root')!, document.getElementById('b'));
    expect(document.getElementById('root')!.hasAttribute('data-theme')).toBe(false);
  });
  it('follows attribute changes and removals on the scope', async () => {
    html('<section data-theme="ocean"><button id="b"></button></section><div id="root"></div>');
    const scope = document.querySelector('section')!, root = document.getElementById('root')!;
    apply(root, document.getElementById('b'));
    scope.setAttribute('data-theme', 'sand'); await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    scope.removeAttribute('data-theme'); scope.classList.add('dark'); await tick();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.classList.contains('dark')).toBe(true);
  });
  it('does not overwrite or remove a theme attribute the root already had', () => {
    html('<section data-theme="ocean"><button id="b"></button></section><div id="root" data-theme="own"></div>');
    const root = document.getElementById('root')!;
    const release = apply(root, document.getElementById('b'));
    expect(root.getAttribute('data-theme')).toBe('own');
    release();
    expect(root.getAttribute('data-theme')).toBe('own');
  });
  it('is idempotent and the release removes exactly what it added', () => {
    html('<section data-theme="ocean" class="dark"><button id="b"></button></section><div id="root" class="mine"></div>');
    const root = document.getElementById('root')!;
    apply(root, document.getElementById('b'));
    const release = apply(root, document.getElementById('b'));
    expect(root.className.split(' ').filter((c) => c === 'dark').length).toBe(1);
    release();
    expect(root.className).toBe('mine');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('data-followtheme')).toBe(false);
  });
  it('keeps the last values and stays silent when the scope leaves the DOM', async () => {
    html('<section data-theme="ocean"><button id="b"></button></section><div id="root"></div>');
    const scope = document.querySelector('section')!, root = document.getElementById('root')!;
    apply(root, document.getElementById('b'));
    scope.remove(); scope.setAttribute('data-theme', 'gone'); await tick();
    expect(root.getAttribute('data-theme')).toBe('gone');
  });
});
```

The last test documents the behaviour: a detached scope is still observed, which is harmless; the root is released when it is removed (Task 4) or when the caller releases it.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/core.test.ts`
Expected: FAIL on `apply` not exported.

- [ ] **Step 3: Implement**

Append to `src/core.ts`:
```ts
export const MARK = 'data-followtheme';

type Mirror = { scope: Element; attrs: string[]; classes: string[]; vars: string[]; observer: MutationObserver | null };
const mirrors = new WeakMap<Element, Mirror>();
const noop = () => {};

function clear(root: Element, m: Mirror): void {
  for (const a of m.attrs) root.removeAttribute(a);
  for (const c of m.classes) root.classList.remove(c);
  for (const v of m.vars) (root as HTMLElement).style?.removeProperty(v);
  m.attrs = []; m.classes = []; m.vars = [];
}

function write(root: Element, m: Mirror, o: Resolved): void {
  clear(root, m);
  for (const a of o.attributes) {
    const v = m.scope.getAttribute(a);
    if (v !== null && !root.hasAttribute(a)) { root.setAttribute(a, v); m.attrs.push(a); }
  }
  for (const c of matchingClasses(m.scope, o)) {
    if (!root.classList.contains(c)) { root.classList.add(c); m.classes.push(c); }
  }
  if (o.inlineVars) {
    const style = (root as HTMLElement).style;
    for (const [n, v] of inlineVars(m.scope)) {
      if (style && !style.getPropertyValue(n)) { style.setProperty(n, v); m.vars.push(n); }
    }
  }
  root.setAttribute(MARK, '');
}

export function release(root: Element): void {
  const m = mirrors.get(root);
  if (!m) return;
  m.observer?.disconnect();
  clear(root, m);
  root.removeAttribute(MARK);
  mirrors.delete(root);
}

export const hasMirror = (root: Element): boolean => mirrors.has(root);

export function apply(root: Element, origin: Element | null, options?: Options): () => void {
  if (!hasDocument()) return noop;
  const o = resolve(options);
  release(root);
  const scope = scopeOf(origin, o);
  if (!scope || scopeOf(root.parentElement, o)) return noop;
  const m: Mirror = { scope, attrs: [], classes: [], vars: [], observer: null };
  write(root, m, o);
  m.observer = new MutationObserver(() => { try { write(root, m, o); } catch { /* one root failing must not stop the others */ } });
  m.observer.observe(scope, { attributes: true, attributeFilter: [...o.attributes, 'class', 'style'] });
  mirrors.set(root, m);
  return () => release(root);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/core.test.ts && npm run typecheck`
Expected: 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core.ts tests/core.test.ts
git commit -m "Mirror a theme scope onto a portal root and keep it in sync"
```

---

### Task 4: start and stop, the automatic path

**Files:**
- Modify: `src/core.ts`
- Test: `tests/start.test.ts`

**Interfaces:**
- Consumes: `apply`, `release`, `hasMirror`, `MARK`, `resolve` from Tasks 2 and 3.
- Produces: `start(options?: Options): () => void`.

- [ ] **Step 1: Write the failing tests**

`tests/start.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';
import { start } from '../src/core';

const tick = () => new Promise((r) => setTimeout(r, 0));
const html = (s: string) => { document.body.innerHTML = s; };
let stop = () => {};
afterEach(() => { stop(); document.body.innerHTML = ''; });

const portal = (tag = 'div') => { const el = document.createElement(tag); document.body.appendChild(el); return el; };

describe('start', () => {
  it('themes a root appended after a click inside a scope', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const root = portal(); await tick();
    expect(root.getAttribute('data-theme')).toBe('ocean');
  });
  it('uses the focused element as origin', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal(); await tick();
    expect(root.getAttribute('data-theme')).toBe('ocean');
  });
  it('leaves roots alone when the origin has no scope', async () => {
    html('<button id="b">open</button>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal(); await tick();
    expect(root.hasAttribute('data-followtheme')).toBe(false);
  });
  it('skips excluded tags, ignored roots and nested insertions', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section><div id="host"></div>');
    stop = start({ ignore: (el) => el.id === 'skip' });
    document.getElementById('b')!.focus();
    const style = portal('style'), skip = portal(); skip.id = 'skip';
    const nested = document.createElement('div'); document.getElementById('host')!.appendChild(nested);
    await tick();
    expect(style.hasAttribute('data-theme')).toBe(false);
    expect(skip.hasAttribute('data-theme')).toBe(false);
    expect(nested.hasAttribute('data-theme')).toBe(false);
  });
  it('keeps following the scope and releases on removal', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal(); await tick();
    const scope = document.querySelector('section')!;
    scope.setAttribute('data-theme', 'sand'); await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    root.remove(); await tick();
    scope.setAttribute('data-theme', 'dusk'); await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
  });
  it('gives each overlay its own origin', async () => {
    html('<section data-theme="ocean"><button id="a">a</button></section><section data-theme="sand"><button id="b">b</button></section>');
    stop = start();
    document.getElementById('a')!.focus(); const ra = portal(); await tick();
    document.getElementById('b')!.focus(); const rb = portal(); await tick();
    expect(ra.getAttribute('data-theme')).toBe('ocean');
    expect(rb.getAttribute('data-theme')).toBe('sand');
  });
  it('stop removes every mirror and start twice returns the same stop', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    expect(start()).toBe(stop);
    document.getElementById('b')!.focus();
    const root = portal(); await tick();
    stop();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('data-followtheme')).toBe(false);
    stop = () => {};
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/start.test.ts`
Expected: FAIL, `start` not exported.

- [ ] **Step 3: Implement**

Append to `src/core.ts`:
```ts
const EXCLUDED = /^(script|style|link|template)$/i;
let active: (() => void) | null = null;

export function start(options?: Options): () => void {
  if (!hasDocument()) return noop;
  if (active) return active;
  const o = resolve(options);
  const container = o.root ?? document.body;
  const roots = new Set<Element>();
  let last: Element | null = null;
  const remember = (e: Event) => { if (e.target instanceof Element) last = e.target; };
  const events = ['pointerdown', 'keydown', 'focusin'] as const;
  for (const t of events) document.addEventListener(t, remember, true);

  const origin = (): Element | null => {
    const a = document.activeElement;
    return a && a !== document.body && a !== document.documentElement ? a : last;
  };
  const excluded = (el: Element) => EXCLUDED.test(el.tagName) || el.hasAttribute(MARK) || (o.ignore?.(el) ?? false);

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (!(n instanceof Element) || excluded(n)) continue;
        try { apply(n, origin(), o); } catch { /* keep going for the other roots */ }
        if (hasMirror(n)) roots.add(n);
      }
      for (const n of r.removedNodes) if (n instanceof Element && roots.delete(n)) release(n);
    }
  });
  observer.observe(container, { childList: true });

  const stop = () => {
    observer.disconnect();
    for (const t of events) document.removeEventListener(t, remember, true);
    for (const r of roots) release(r);
    roots.clear();
    active = null;
  };
  active = stop;
  return stop;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test && npm run typecheck`
Expected: all tests pass.

- [ ] **Step 5: Add the no-document test**

Append to `tests/start.test.ts`:
```ts
describe('without a document', () => {
  it('every export is a no-op', async () => {
    const saved = globalThis.document;
    // @ts-expect-error simulate a server
    delete globalThis.document;
    try {
      const mod = await import('../src/core');
      expect(mod.scopeOf(null)).toBeNull();
      expect(typeof mod.start()).toBe('function');
      expect(() => mod.apply({} as Element, null)()).not.toThrow();
    } finally {
      globalThis.document = saved;
    }
  });
});
```

Run: `npx vitest run tests/start.test.ts`
Expected: PASS. If happy-dom makes `document` non-configurable, replace the delete with `vi.stubGlobal('document', undefined)` and `vi.unstubAllGlobals()` in `finally`.

- [ ] **Step 6: Commit**

```bash
git add src/core.ts tests/start.test.ts
git commit -m "Follow the theme of whatever opens a portal"
```

---

### Task 5: React adapter

**Files:**
- Create: `src/react.tsx`
- Test: `tests/react.test.tsx`

**Interfaces:**
- Consumes: `start`, `apply`, `Options` from the core.
- Produces: `FollowTheme(props: Options & { children?: ReactNode })`, `useFollowTheme<T extends Element>(ref: RefObject<T | null>): { container: HTMLElement | null; getContainer: () => HTMLElement }`.

- [ ] **Step 1: Write the failing test**

`tests/react.test.tsx`:
```tsx
import { act, render } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { FollowTheme, useFollowTheme } from '../src/react';

afterEach(() => { document.body.innerHTML = ''; });
const tick = () => act(() => new Promise((r) => setTimeout(r, 0)));

function Card() {
  const ref = useRef<HTMLButtonElement>(null);
  const { container } = useFollowTheme(ref);
  return (
    <section data-theme="ocean">
      <button ref={ref}>open</button>
      {container && createPortal(<p id="content">hello</p>, container)}
    </section>
  );
}

describe('useFollowTheme', () => {
  it('gives a body-level container that carries the scope', async () => {
    const { unmount } = render(<Card />);
    await tick();
    const p = document.getElementById('content')!;
    expect(p.parentElement?.parentElement).toBe(document.body);
    expect(p.parentElement?.getAttribute('data-theme')).toBe('ocean');
    unmount();
    expect(document.querySelector('[data-followtheme]')).toBeNull();
  });
});

describe('FollowTheme', () => {
  it('starts the automatic path for its lifetime', async () => {
    const { unmount } = render(<FollowTheme><section data-theme="sand"><button id="b">open</button></section></FollowTheme>);
    document.getElementById('b')!.focus();
    const root = document.createElement('div'); document.body.appendChild(root);
    await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    unmount();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/react.test.tsx`
Expected: FAIL, module exports missing.

- [ ] **Step 3: Implement**

`src/react.tsx`:
```tsx
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { apply, start, type Options } from './core';

export type { Options } from './core';

export function FollowTheme({ children, ...options }: Options & { children?: ReactNode }) {
  useEffect(() => start(options), []);
  return <>{children}</>;
}

export function useFollowTheme<T extends Element>(ref: RefObject<T | null>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const el = useRef<HTMLElement | null>(null);
  const getContainer = () => {
    if (!el.current) {
      el.current = document.createElement('div');
      document.body.appendChild(el.current);
    }
    return el.current;
  };
  useEffect(() => {
    const c = getContainer();
    const release = apply(c, ref.current);
    setContainer(c);
    return () => { release(); c.remove(); el.current = null; };
  }, [ref]);
  return { container, getContainer };
}
```

`useEffect(() => start(options), [])` on purpose: options are read once, as the spec says to mount the provider once.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/react.test.tsx && npm run typecheck`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/react.tsx tests/react.test.tsx
git commit -m "Add the React provider and hook"
```

---

### Task 6: Vue adapter

**Files:**
- Create: `src/vue.ts`
- Test: `tests/vue.test.ts`

**Interfaces:**
- Consumes: `start`, `apply`, `Options` from the core.
- Produces: `followtheme: Plugin` (installed with `app.use(followtheme, options?)`), `useFollowTheme(target: Ref<Element | null>): { to: Ref<HTMLElement | null> }`.

- [ ] **Step 1: Write the failing test**

`tests/vue.test.ts`:
```ts
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, Teleport } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { followtheme, useFollowTheme } from '../src/vue';

afterEach(() => { document.body.innerHTML = ''; });
const tick = () => new Promise((r) => setTimeout(r, 0));

const Card = defineComponent({
  setup() {
    const button = ref<HTMLElement | null>(null);
    const { to } = useFollowTheme(button);
    return () => h('section', { 'data-theme': 'ocean' }, [
      h('button', { ref: button }, 'open'),
      to.value ? h(Teleport, { to: to.value }, [h('p', { id: 'content' }, 'hello')]) : null,
    ]);
  },
});

describe('useFollowTheme', () => {
  it('gives a body-level target that carries the scope', async () => {
    const w = mount(Card, { attachTo: document.body });
    await nextTick(); await tick();
    const p = document.getElementById('content')!;
    expect(p.parentElement?.parentElement).toBe(document.body);
    expect(p.parentElement?.getAttribute('data-theme')).toBe('ocean');
    w.unmount();
    expect(document.querySelector('[data-followtheme]')).toBeNull();
  });
});

describe('plugin', () => {
  it('starts on install and stops on unmount', async () => {
    const App = defineComponent({ render: () => h('section', { 'data-theme': 'sand' }, [h('button', { id: 'b' }, 'open')]) });
    const w = mount(App, { attachTo: document.body, global: { plugins: [followtheme] } });
    document.getElementById('b')!.focus();
    const root = document.createElement('div'); document.body.appendChild(root);
    await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    w.unmount();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/vue.test.ts`
Expected: FAIL, module exports missing.

- [ ] **Step 3: Implement**

`src/vue.ts`:
```ts
import { onBeforeUnmount, onMounted, ref, type Plugin, type Ref } from 'vue';
import { apply, start, type Options } from './core';

export type { Options } from './core';

export const followtheme: Plugin<[Options?]> = {
  install(app, options) {
    const stop = start(options);
    const unmount = app.unmount;
    app.unmount = () => { stop(); unmount(); };
  },
};

export function useFollowTheme(target: Ref<Element | null>) {
  const to = ref<HTMLElement | null>(null);
  let release = () => {};
  onMounted(() => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    release = apply(div, target.value);
    to.value = div;
  });
  onBeforeUnmount(() => { release(); to.value?.remove(); to.value = null; });
  return { to };
}
```

If `@vue/test-utils`'s `unmount` does not go through `app.unmount`, the plugin test should instead call `w.vm.$.appContext.app.unmount()`; adjust the test, not the plugin.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/vue.test.ts && npm run typecheck && npm run build`
Expected: 2 tests pass, build emits the three entries.

- [ ] **Step 5: Commit**

```bash
git add src/vue.ts tests/vue.test.ts
git commit -m "Add the Vue plugin and composable"
```

---

### Task 7: README, changelog, demo

**Files:**
- Create: `README.md`, `CHANGELOG.md`, `demo/index.html`, `demo/main.tsx`, `demo/vite.config.ts`, `demo/package.json`

**Interfaces:**
- Consumes: the public API of Tasks 2 to 6, names exactly as exported.

- [ ] **Step 1: Write README.md**

Sections, in this order, each short:
1. Title and one line: "A scoped theme follows the overlays it opens."
2. The problem in three lines: scoped theme on a section, dialog portals to body, theme lost. Vue Teleport same.
3. Install: `npm i followtheme`.
4. React, one line of setup: `<FollowTheme>` at the root; then the explicit hook with Radix:
```tsx
const ref = useRef<HTMLButtonElement>(null);
const { container } = useFollowTheme(ref);
<Dialog.Portal container={container}>...</Dialog.Portal>
```
5. Vue, one line of setup: `app.use(followtheme)`; then the composable with `<Teleport :to="to">`.
6. Plain DOM: `start()`, `apply(root, origin)`, `scopeOf(el)`, `configure({...})` with the defaults listed.
7. Table "When the automatic path is not enough": Radix `container`, vaul `Drawer.Portal container`, Headless UI v2 `Dialog` renders to body with no container prop: use `useFollowTheme` and wrap with `createPortal`, reka-ui `DialogPortal to`, Vue `Teleport to`, Base UI `Portal container`.
8. What is mirrored and the limit: attributes, matching classes, inline custom properties; rules bound to arbitrary selectors are not followed.
9. How the origin is chosen (active element, else last pointerdown, keydown or focusin).
10. License.

- [ ] **Step 2: Write CHANGELOG.md**

```markdown
# Changelog

All notable changes to this project are documented in this file. The format
follows Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-10-02

### Added

- Core: `start`, `apply`, `scopeOf`, `configure`. A theme scope (attribute,
  theme class or inline custom properties) is mirrored onto every portal
  root opened from inside it, kept in sync, released on removal.
- React: `FollowTheme` provider and `useFollowTheme(ref)` hook.
- Vue: `followtheme` plugin and `useFollowTheme(target)` composable.
```

- [ ] **Step 3: Write the demo**

`demo/package.json` with `vite`, `react`, `react-dom`, `@radix-ui/react-dialog`, `vue`, `@vitejs/plugin-react`, `@vitejs/plugin-vue`, and `"followtheme": "file:.."`. `demo/index.html` with a `#react` and a `#vue` mount point and a `<style>` defining `[data-theme=ocean]` and `[data-theme=sand]` as `--bg` and `--fg`, applied by `.panel { background: var(--bg); color: var(--fg) }`. `demo/main.tsx` renders two React cards (ocean, sand), each with a Radix dialog whose content has class `panel`, inside `<FollowTheme>`; and mounts a Vue app with the same two cards using `<Teleport>`. The demo is a manual check: `cd demo && npm i && npm run dev`, open both dialogs, each keeps its card's colours.

- [ ] **Step 4: Run the demo once and the full suite**

Run: `cd demo && npm install && npm run build && cd .. && npm test && npm run typecheck && npm run build`
Expected: demo builds, all tests pass. Open the dev server and check both dialogs by eye.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md demo
git commit -m "Document the package and add the demo"
```

---

### Task 8: Repository, protection, first release

**Files:**
- Modify: `package.json` (version 0.1.0)

- [ ] **Step 1: Create the GitHub repository and push**

Run:
```bash
gh repo create kaveraa/followtheme --public --source=. --remote=origin --description "A scoped theme follows the overlays it opens. React, Vue, any portal library." --push
```

- [ ] **Step 2: Protect main**

Same ruleset as crewcut, created with `gh api -X POST repos/kaveraa/followtheme/rulesets --input ruleset.json`: pull request required with 0 approvals, required status checks `test (20)` and `test (22)` (check the exact names in the first Actions run), deletion and non fast-forward blocked, no bypass actors.

- [ ] **Step 3: Release 0.1.0**

Set `"version": "0.1.0"`, commit `Release 0.1.0` on a branch, open a pull request, merge when green, then:
```bash
git tag -a v0.1.0 -m "Release 0.1.0" && git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0: the theme follows the overlay" --notes-file notes.md
```
with notes in the same style as crewcut's releases: one paragraph, What's Changed, Full Changelog link.

- [ ] **Step 4: Publish to npm**

`npm publish --access public` requires the owner's npm login; stop and hand over if `npm whoami` fails. After publishing, check `npm view followtheme version` prints `0.1.0`.
