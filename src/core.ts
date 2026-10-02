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
  return style.split(';').flatMap((decl): [string, string][] => {
    const i = decl.indexOf(':');
    if (i < 0) return [];
    const name = decl.slice(0, i).trim();
    return name.startsWith('--') ? [[name, decl.slice(i + 1).trim()]] : [];
  });
}

const isRoot = (el: Element) => el === document.documentElement || el === document.body;

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

export const MARK = 'data-followtheme';

type Mirror = { scope: Element; attrs: string[]; classes: string[]; vars: string[]; observer: MutationObserver | null };
const mirrors = new WeakMap<Element, Mirror>();
const noop = () => {};

function clear(root: Element, m: Mirror): void {
  for (const a of m.attrs) root.removeAttribute(a);
  for (const c of m.classes) root.classList.remove(c);
  for (const v of m.vars) (root as HTMLElement).style?.removeProperty(v);
  m.attrs = [];
  m.classes = [];
  m.vars = [];
}

function write(root: Element, m: Mirror, o: Resolved): void {
  clear(root, m);
  for (const a of o.attributes) {
    const v = m.scope.getAttribute(a);
    if (v !== null && !root.hasAttribute(a)) {
      root.setAttribute(a, v);
      m.attrs.push(a);
    }
  }
  for (const c of matchingClasses(m.scope, o)) {
    if (!root.classList.contains(c)) {
      root.classList.add(c);
      m.classes.push(c);
    }
  }
  if (o.inlineVars) {
    const style = (root as HTMLElement).style;
    for (const [n, v] of inlineVars(m.scope)) {
      if (style && !style.getPropertyValue(n)) {
        style.setProperty(n, v);
        m.vars.push(n);
      }
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
  m.observer = new MutationObserver(() => {
    try {
      write(root, m, o);
    } catch {
      // one root failing must not stop the others
    }
  });
  m.observer.observe(scope, { attributes: true, attributeFilter: [...o.attributes, 'class', 'style'] });
  mirrors.set(root, m);
  return () => release(root);
}
