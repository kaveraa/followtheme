import { onBeforeUnmount, onMounted, ref, type Plugin, type Ref } from 'vue';
import { apply, start, type Options } from './core';

export type { Options } from './core';

export const followtheme: Plugin<[Options?]> = {
  install(app, options) {
    const stop = start(options);
    const unmount = app.unmount;
    app.unmount = () => {
      stop();
      unmount();
    };
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
  onBeforeUnmount(() => {
    release();
    to.value?.remove();
    to.value = null;
  });
  return { to };
}
