# followtheme

<p align="center"><img src="https://raw.githubusercontent.com/kaveraa/followtheme/main/art/banner.svg" alt="followtheme" width="100%"></p>

[![Tests](https://github.com/kaveraa/followtheme/actions/workflows/tests.yml/badge.svg)](https://github.com/kaveraa/followtheme/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/v/@kaveraa/followtheme.svg)](https://www.npmjs.com/package/@kaveraa/followtheme)
[![Téléchargements](https://img.shields.io/npm/dm/@kaveraa/followtheme.svg)](https://www.npmjs.com/package/@kaveraa/followtheme)
[![Licence](https://img.shields.io/github/license/kaveraa/followtheme.svg)](https://github.com/kaveraa/followtheme/blob/main/LICENSE)

[English](https://github.com/kaveraa/followtheme/blob/main/README.md) - **Français**

Un thème scopé suit les overlays qu'il ouvre.

Vous thémez une section de la page : `<section data-theme="ocean">`, une
classe `dark` sur un conteneur, `style="--brand: ..."` sur une carte. Le
dialog, le popover, le select, le tooltip ou le toast ouvert depuis cette
section se monte sur `document.body`, hors de la section, et s'affiche dans
le thème par défaut de la page. Les custom properties s'héritent le long de
l'arbre DOM, et le portail a quitté l'arbre. Le `<Teleport>` de Vue fait
pareil.

followtheme surveille `body`, retrouve le scope de thème de ce qui a ouvert
l'overlay et le recopie sur la racine du portail : les attributs configurés,
les classes de thème, les custom properties inline. Il les maintient à jour
tant que l'overlay vit et les retire quand il disparaît. Une ligne de mise en
place, aucun changement dans les overlays, n'importe quelle bibliothèque de
portail.

## Installation

```
npm i @kaveraa/followtheme
```

Zéro dépendance. React 18+ et Vue 3.3+ sont des peers optionnels.

## React

```tsx
import { FollowTheme } from '@kaveraa/followtheme/react';

<FollowTheme>
  <App />
</FollowTheme>
```

C'est la voie automatique : chaque overlay ouvert depuis un scope thémé le
suit. Pour un overlay ouvert par programme, ou une bibliothèque dont la
racine de portail apparaît avant le clic, utilisez le hook et passez le
conteneur à la bibliothèque :

```tsx
import { useFollowTheme } from '@kaveraa/followtheme/react';
import * as Dialog from '@radix-ui/react-dialog';

function Card() {
  const ref = useRef<HTMLButtonElement>(null);
  const { container } = useFollowTheme(ref);
  return (
    <section data-theme="ocean">
      <Dialog.Root>
        <Dialog.Trigger ref={ref}>Ouvrir</Dialog.Trigger>
        <Dialog.Portal container={container}>
          <Dialog.Content>...</Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
```

`container` vaut `null` au premier rendu, puis une `div` thémée sous `body`
après le montage. `getContainer()` renvoie le même élément pour les
bibliothèques qui attendent une fonction.

## Vue

```ts
import { followtheme } from '@kaveraa/followtheme/vue';

createApp(App).use(followtheme).mount('#app');
```

Voie explicite, avec `<Teleport>` ou un portail reka-ui :

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFollowTheme } from '@kaveraa/followtheme/vue';

const button = ref<HTMLElement | null>(null);
const { to } = useFollowTheme(button);
</script>

<template>
  <section data-theme="ocean">
    <button ref="button" @click="open = true">Ouvrir</button>
    <Teleport v-if="to" :to="to">
      <div v-if="open" class="dialog">...</div>
    </Teleport>
  </section>
</template>
```

## DOM pur

```ts
import { start, apply, scopeOf, configure } from '@kaveraa/followtheme';

const stop = start();                 // surveille body, thème chaque nouvelle racine de portail
apply(portalRoot, originElement);     // à la main pour une racine ; renvoie release()
scopeOf(element);                     // le scope de thème le plus proche, ou null

configure({
  attributes: ['data-theme'],         // défaut
  classes: ['dark', /^theme-/],       // défaut
  inlineVars: true,                   // défaut : recopie aussi style="--x: ..."
  ignore: (root) => root.id === 'tooltips', // laisser certaines racines tranquilles
});
```

`start` renvoie `stop`, qui retire tout ce qui a été écrit. Plusieurs
appelants peuvent faire `start` sur une page (un provider React et un plugin
Vue, par exemple) : la surveillance est partagée et démontée quand le
dernier s'arrête. `apply` maintient sa racine à jour jusqu'à l'appel de la
fonction qu'il renvoie.

## Quand la voie automatique ne suffit pas

L'heuristique prend pour origine la dernière cible de `pointerdown`,
`keydown` ou `focusin` hors de la nouvelle racine de portail, si elle date
de moins d'une seconde. Un overlay ouvert par un minuteur, ou une
bibliothèque qui crée son conteneur de portail au montage plutôt qu'à
l'ouverture, demande la voie explicite : donnez à la bibliothèque un
conteneur venu du hook ou du composable.

| Bibliothèque | Prop à passer |
|---|---|
| Radix Primitives | `<Portal container={container}>` sur Dialog, Popover, Select, Tooltip, DropdownMenu |
| vaul | `<Drawer.Portal container={container}>` |
| Base UI | `<Portal container={container}>` |
| Headless UI v2 | pas de prop container : rendre le dialog via `createPortal(..., container)` |
| reka-ui | `<DialogPortal :to="to">` |
| Vue | `<Teleport :to="to">` |

## Ce qui est recopié, et la limite

Depuis le scope le plus proche de l'origine : chaque attribut configuré avec
sa valeur, chaque classe correspondant aux motifs configurés, chaque custom
property posée inline sur le scope. Rien de ce que la racine portait déjà
n'est écrasé, et seul ce que followtheme a ajouté est retiré.

Les règles liées à des sélecteurs arbitraires ne sont pas suivies :
`.sidebar .card { --x: ... }` n'a aucun marqueur à recopier. Portez le thème
par un attribut, une classe ou une propriété inline, ce que font les
systèmes de thème.

Une racine déjà située dans un scope, et un scope posé sur `html` ou `body`,
sont laissés tels quels : il n'y a rien à corriger.

## Licence

MIT
