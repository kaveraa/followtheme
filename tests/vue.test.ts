import { mount } from '@vue/test-utils';
import { Teleport, defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { followtheme, useFollowTheme } from '../src/vue';

afterEach(() => {
  document.body.innerHTML = '';
});
const tick = () => new Promise((r) => setTimeout(r, 0));

const Card = defineComponent({
  setup() {
    const button = ref<HTMLElement | null>(null);
    const { to } = useFollowTheme(button);
    return () =>
      h('section', { 'data-theme': 'ocean' }, [
        h('button', { ref: button }, 'open'),
        to.value ? h(Teleport, { to: to.value }, [h('p', { id: 'content' }, 'hello')]) : null,
      ]);
  },
});

describe('useFollowTheme', () => {
  it('gives a body-level target that carries the scope', async () => {
    const w = mount(Card, { attachTo: document.body });
    await nextTick();
    await tick();
    const p = document.getElementById('content')!;
    expect(p.parentElement?.parentElement).toBe(document.body);
    expect(p.parentElement?.getAttribute('data-theme')).toBe('ocean');
    w.unmount();
    expect(document.querySelector('[data-followtheme]')).toBeNull();
  });
});

describe('plugin', () => {
  it('starts on install and stops on unmount', async () => {
    const App = defineComponent({
      render: () => h('section', { 'data-theme': 'sand' }, [h('button', { id: 'b' }, 'open')]),
    });
    const w = mount(App, { attachTo: document.body, global: { plugins: [followtheme] } });
    document.getElementById('b')!.focus();
    const root = document.createElement('div');
    document.body.appendChild(root);
    await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    w.unmount();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
