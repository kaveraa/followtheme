import * as Dialog from '@radix-ui/react-dialog';
import { FollowTheme } from 'followtheme/react';
import { followtheme } from 'followtheme/vue';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Teleport, createApp, defineComponent, h, ref } from 'vue';

function ReactCard({ theme }: { theme: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card" data-theme={theme}>
      <h2>React, {theme}</h2>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>Open a Radix dialog</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content className="panel">
            <Dialog.Title>Still {theme}</Dialog.Title>
            <Dialog.Description>This dialog lives under body and kept the card's theme.</Dialog.Description>
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

createRoot(document.getElementById('react')!).render(
  <StrictMode>
    <FollowTheme>
      <ReactCard theme="ocean" />
      <ReactCard theme="sand" />
    </FollowTheme>
  </StrictMode>,
);

const VueCard = defineComponent({
  props: { theme: { type: String, required: true } },
  setup(props) {
    const open = ref(false);
    return () =>
      h('section', { class: 'card', 'data-theme': props.theme }, [
        h('h2', `Vue, ${props.theme}`),
        h('button', { onClick: () => (open.value = true) }, 'Open a teleported dialog'),
        h(Teleport, { to: 'body' }, [
          open.value
            ? h('div', { class: 'panel', role: 'dialog' }, [
                h('h2', `Still ${props.theme}`),
                h('p', 'This dialog was teleported to body and kept the card\'s theme.'),
                h('button', { onClick: () => (open.value = false) }, 'Close'),
              ])
            : null,
        ]),
      ]);
  },
});

createApp({ render: () => [h(VueCard, { theme: 'ocean' }), h(VueCard, { theme: 'sand' })] })
  .use(followtheme)
  .mount('#vue');
