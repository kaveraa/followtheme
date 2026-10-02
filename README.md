# followtheme

<p align="center"><img src="https://raw.githubusercontent.com/kaveraa/followtheme/main/art/banner.svg" alt="followtheme" width="100%"></p>

[![Tests](https://github.com/kaveraa/followtheme/actions/workflows/tests.yml/badge.svg)](https://github.com/kaveraa/followtheme/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/v/followtheme.svg)](https://www.npmjs.com/package/followtheme)
[![Downloads](https://img.shields.io/npm/dm/followtheme.svg)](https://www.npmjs.com/package/followtheme)
[![License](https://img.shields.io/github/license/kaveraa/followtheme.svg)](https://github.com/kaveraa/followtheme/blob/main/LICENSE)

**English** - [Français](https://github.com/kaveraa/followtheme/blob/main/README.fr.md)

A scoped theme follows the overlays it opens.

You theme a section of the page: `<section data-theme="ocean">`, a `dark`
class on a wrapper, `style="--brand: ..."` on a card. The dialog, popover,
select, tooltip or toast that section opens mounts on `document.body`,
outside the section, and renders in the page's default theme. Custom
properties inherit through the DOM tree, and the portal left the tree.
Vue's `<Teleport>` does the same.

followtheme watches `body`, finds the theme scope of whatever opened the
overlay, and mirrors that scope onto the portal root: the configured
attributes, the theme classes, the inline custom properties. It keeps them
in sync while the overlay lives and removes them when it goes. One line of
setup, no change to the overlays, any portal library.

## Install

```
npm i followtheme
```

Zero dependencies. React 18+ and Vue 3.3+ are optional peers.

## React

```tsx
import { FollowTheme } from 'followtheme/react';

<FollowTheme>
  <App />
</FollowTheme>
```

That is the automatic path: every overlay opened from inside a themed scope
follows it. For an overlay opened by code, or a library whose portal root
appears before the click, use the hook and hand the container to the
library:

```tsx
import { useFollowTheme } from 'followtheme/react';
import * as Dialog from '@radix-ui/react-dialog';

function Card() {
  const ref = useRef<HTMLButtonElement>(null);
  const { container } = useFollowTheme(ref);
  return (
    <section data-theme="ocean">
      <Dialog.Root>
        <Dialog.Trigger ref={ref}>Open</Dialog.Trigger>
        <Dialog.Portal container={container}>
          <Dialog.Content>...</Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
```

`container` is `null` on the first render and a themed `div` under `body`
after mount. `getContainer()` returns the same element for libraries that
take a function.

## Vue

```ts
import { followtheme } from 'followtheme/vue';

createApp(App).use(followtheme).mount('#app');
```

Explicit path, with `<Teleport>` or a reka-ui portal:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFollowTheme } from 'followtheme/vue';

const button = ref<HTMLElement | null>(null);
const { to } = useFollowTheme(button);
</script>

<template>
  <section data-theme="ocean">
    <button ref="button" @click="open = true">Open</button>
    <Teleport v-if="to" :to="to">
      <div v-if="open" class="dialog">...</div>
    </Teleport>
  </section>
</template>
```

## Plain DOM

```ts
import { start, apply, scopeOf, configure } from 'followtheme';

const stop = start();                 // watch body, theme every new portal root
apply(portalRoot, originElement);     // do it by hand for one root; returns release()
scopeOf(element);                     // the nearest theme scope, or null

configure({
  attributes: ['data-theme'],         // default
  classes: ['dark', /^theme-/],       // default
  inlineVars: true,                   // default: copy style="--x: ..." too
  ignore: (root) => root.id === 'tooltips', // leave some roots alone
});
```

`start` returns `stop`, which removes everything it wrote. Several callers
may `start` on one page (a React provider and a Vue plugin, for example):
the watcher is shared and torn down when the last one stops. `apply` keeps
its root in sync until you call the function it returns.

## When the automatic path is not enough

The heuristic takes the last `pointerdown`, `keydown` or `focusin` target
outside the new portal root, if it is less than a second old, as the
origin. An overlay opened by a timer, or a library that creates its portal
container at mount time rather than on open, needs the explicit path: give
the library a container from the hook or the composable.

| Library | Prop to pass |
|---|---|
| Radix Primitives | `<Portal container={container}>` on Dialog, Popover, Select, Tooltip, DropdownMenu |
| vaul | `<Drawer.Portal container={container}>` |
| Base UI | `<Portal container={container}>` |
| Headless UI v2 | no container prop: render the dialog through `createPortal(..., container)` |
| reka-ui | `<DialogPortal :to="to">` |
| Vue | `<Teleport :to="to">` |

## What is mirrored, and the limit

From the nearest scope of the origin: every configured attribute with its
value, every class matching the configured patterns, every custom property
set inline on the scope. Nothing the root already carried is overwritten,
and only what followtheme added is removed.

Rules bound to arbitrary selectors are not followed: `.sidebar .card { --x:
... }` has no marker to mirror. Put the theme on an attribute, a class or an
inline property, which is what theme systems do.

A root that already sits inside a scope, and a scope on `html` or `body`,
are left alone: there is nothing to fix.

## License

MIT
