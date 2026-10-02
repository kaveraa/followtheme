# followtheme: design

Date: 2026-10-02. Status: draft for review.

## Problem

A theme scoped to part of a page (`<section data-theme="ocean">`, a `dark`
class on a wrapper, inline custom properties on a card) does not reach the
overlays that part opens. Dialog, Popover, Select, Tooltip, Toast, Drawer and
Sheet mount on `document.body`, outside the scope, so they render in the
page's default theme. Custom-property inheritance follows the DOM tree, and
the portal left the tree.

Every design system patches this on its own (portal into the nearest scope,
stamp the theme attribute on each Portal, inject a style tag per
ThemeProvider). Vue's `<Teleport>` behaves the same way. No npm package
solves it across libraries.

## Goal

A theme scope follows the overlays it opens, in React and Vue, with any
portal-based library, with one line of setup and no change to the overlays
themselves. Explicit hooks remain for the cases the automatic path cannot
see.

## Non-goals

- Enumerating or freezing computed custom properties. Only theme selectors
  (attributes, classes) and inline custom properties are mirrored. A rule
  like `.sidebar .card { --x: ... }` is not followed; the limit is
  documented.
- Coordinating scroll lock, focus or `aria-hidden` between overlays.
- Shadow DOM. Portals inside shadow roots are out of scope for 1.0.
- Server rendering. The package is a no-op outside a browser.

## Package

- Name: `followtheme`. MIT. Repository `kaveraa/followtheme`. English
  throughout. Zero runtime dependencies.
- Entry points, each with types:
  - `followtheme`: the DOM core, framework-free.
  - `followtheme/react`: a provider component and a hook.
  - `followtheme/vue`: a plugin and a composable.
- ESM only, `exports` map per entry, built with tsdown, Node 20+ for the
  toolchain, evergreen browsers at runtime (`MutationObserver`,
  `Element.closest`).

## Core (`followtheme`)

### Vocabulary

- **Theme scope**: an element that carries at least one theme marker.
- **Theme marker**: a configured attribute (`data-theme` by default), a
  configured class (`dark` and any class matching `/^theme-/` by default),
  or an inline custom property (`style="--brand: ..."`).
- **Portal root**: an element appended as a direct child of `document.body`
  after `start()` ran, and not excluded.
- **Origin**: the element whose scope the portal root should follow.

### API

```ts
export type Options = {
  attributes?: string[];            // default ['data-theme']
  classes?: (string | RegExp)[];    // default ['dark', /^theme-/]
  inlineVars?: boolean;             // default true
  ignore?: (root: Element) => boolean; // extra exclusions
  root?: HTMLElement;               // default document.body
};

export function start(options?: Options): () => void;
export function scopeOf(el: Element | null, options?: Options): Element | null;
export function apply(portalRoot: Element, origin: Element | null, options?: Options): () => void;
export function configure(options: Options): void; // sets the defaults used by start/apply/scopeOf
```

- `start` installs the observers and returns `stop`. Several callers may
  `start` (a React provider and a Vue plugin on one page): the observers are
  shared, and torn down when the last caller stops.
- `scopeOf(el)` returns the nearest ancestor-or-self of `el` that is a theme
  scope, excluding `html` and `body`; `null` when there is none. Passing
  `null` returns `null`.
- `apply(root, origin)` mirrors `scopeOf(origin)` onto `root` and keeps it
  in sync until the returned release function is called; the automatic path
  calls it when the root leaves `body`, the adapters call it on unmount, a
  plain-DOM caller calls it. Idempotent: applying again to the same root
  replaces the previous mirror.
- `configure` lets a framework adapter or an app set defaults once;
  explicit `options` on a call still win.

### What is mirrored

For the scope found:

1. Every configured attribute present on the scope, with its value.
2. Every class of the scope that matches a configured class.
3. Every inline custom property of the scope (`style` entries starting with
   `--`), when `inlineVars` is on.

Mirrored values are written on the portal root. A `data-followtheme`
attribute marks the root so a later `apply` or `stop` can remove exactly
what was added and nothing else: the names of the attributes, classes and
properties written are kept in a `WeakMap<Element, Mirror>`.

If `scopeOf(origin)` is `null`, nothing is written. If the portal root is
itself inside a theme scope (a library that already portals into the
scope), nothing is written either.

### Automatic path

`start()`:

1. Listens on `document` in capture phase to `pointerdown`, `keydown` and
   `focusin`, remembering the last three targets with their time.
2. Observes `root` (default `document.body`) for added direct children.
   For each added element that is not excluded, the origin is the most
   recent remembered target that is not inside the new element and is less
   than one second old. `document.activeElement` is not used: libraries
   move focus into the overlay before the callback runs, and focus left on
   an old trigger must not theme a later overlay. Then `apply(root, origin)`.
3. Excluded by default: `script`, `style`, `link`, `template`, elements
   already marked `data-followtheme`, and anything the `ignore` option
   returns true for.
4. For each mirrored root, a second observer on the source scope watches
   `attributes` (attribute list = configured attributes, `class`, `style`)
   and re-mirrors on change, so a dark toggle while a dialog is open is
   followed.
5. A third observer on `root` watches removed children; a removed mirrored
   root releases its observers and its `WeakMap` entry.

`stop()` disconnects everything and removes every mirror it wrote.

### Timing

Portal roots are often appended empty and filled later; mirroring the root
at insertion is enough because inheritance flows down from it. Libraries
that append the root before the opening interaction (persistent portal
containers) are handled by the explicit API, not the heuristic.

## React (`followtheme/react`)

```tsx
export function FollowTheme(props: Options & { children?: ReactNode }): JSX.Element;
export function useFollowTheme<T extends Element>(ref: RefObject<T>): {
  container: HTMLElement | null;      // a body-level div already mirrored from ref's scope
  getContainer: () => HTMLElement;    // same, for libraries that take a function
};
```

- `FollowTheme` calls `start` in an effect and `stop` on unmount; renders
  its children unchanged. Mount it once near the app root.
- `useFollowTheme(ref)` creates lazily a `div` appended to `document.body`,
  calls `apply(div, ref.current)`, keeps it in sync, and removes it on
  unmount. The returned `container` is `null` on the first render and set
  after mount, which matches how Radix, vaul and Headless UI accept a
  container. This is the explicit path for overlays opened by code.
- React 18 and 19 as peer dependency ranges, optional.

## Vue (`followtheme/vue`)

```ts
export const followtheme: Plugin;            // app.use(followtheme, options?)
export function useFollowTheme(target: Ref<Element | null>): {
  to: Ref<HTMLElement | null>;               // for <Teleport :to> and reka-ui portals
};
```

- The plugin calls `start` on install and `stop` on `app.unmount`.
- The composable mirrors the React hook: a lazily created `div`, mirrored
  from the target's scope, removed on unmount. Vue 3.3+ as optional peer.

## Error handling

- Outside a browser (`typeof document === 'undefined'`), `start` returns a
  no-op `stop`, `apply` returns a no-op, `scopeOf` returns `null`.
- An invalid class pattern or attribute name throws at `configure` or
  `start` time with a message naming the option, never later.
- No exception can escape an observer callback: each callback is wrapped,
  and a failure on one root does not stop the others.

## Testing

Vitest with happy-dom. Cases, each a test:

1. A root appended to body after a click inside `[data-theme=ocean]` gets
   `data-theme="ocean"`.
2. The same through keyboard: focus inside the scope, then append.
3. Inline `--brand` on the scope lands on the root; `inlineVars: false`
   does not copy it.
4. Classes: `dark` and `theme-sunset` are copied, `card` is not.
5. Scope on `html` or `body` only: nothing written, no marker.
6. Theme attribute changes on the scope while the root lives: the root
   follows.
7. Root removed from body: observers released (the scope change no longer
   writes anywhere, no leak in the `WeakMap` observable through a spy).
8. `apply` twice on one root: one mirror, previous values replaced.
9. `stop()` removes every attribute, class and property it added and leaves
   the root's own attributes alone.
10. Excluded tags and `ignore` are never touched.
11. React: `useFollowTheme` returns a mirrored container after mount; a
    Radix-style component receiving it renders inside a themed div.
12. Vue: the composable's `to` points to a mirrored div; `<Teleport>` into
    it renders themed content.
13. No document: every export is a no-op.

A Vite demo (`demo/`) shows two cards with different `data-theme` values
each opening a Radix dialog and a Vue Teleport dialog; it is a manual check,
not part of CI.

## Repository and delivery

- Files: `src/core.ts`, `src/react.tsx`, `src/vue.ts`, `tests/*.test.ts`,
  `demo/`, `README.md`, `CHANGELOG.md`, `LICENSE`.
- CI: tests and typecheck on Node 20 and 22. Main protected by the same
  ruleset as crewcut: pull request required, checks green, no force push.
- README: the problem in three lines, one-line setup for React and Vue,
  the explicit API, a table of libraries (Radix, vaul, Headless UI, reka-ui,
  Teleport, Base UI) with the prop to pass when the automatic path is not
  enough, the documented limit on arbitrary selectors.
- Versioning: 0.1.0 first publish, releases on GitHub in the same style as
  crewcut.
