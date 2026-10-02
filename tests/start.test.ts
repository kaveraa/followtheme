import { afterEach, describe, expect, it, vi } from 'vitest';
import { start } from '../src/core';

const tick = () => new Promise((r) => setTimeout(r, 0));
const html = (s: string) => { document.body.innerHTML = s; };
let stop = () => {};
afterEach(() => {
  stop();
  stop = () => {};
  document.body.innerHTML = '';
});

const portal = (tag = 'div') => {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
};

describe('start', () => {
  it('themes a root appended after a click inside a scope', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const root = portal();
    await tick();
    expect(root.getAttribute('data-theme')).toBe('ocean');
  });

  it('uses the focused element as origin', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal();
    await tick();
    expect(root.getAttribute('data-theme')).toBe('ocean');
  });

  it('leaves roots alone when the origin has no scope', async () => {
    html('<button id="b">open</button>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal();
    await tick();
    expect(root.hasAttribute('data-followtheme')).toBe(false);
  });

  it('skips excluded tags, ignored roots and nested insertions', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section><div id="host"></div>');
    stop = start({ ignore: (el) => el.id === 'skip' });
    document.getElementById('b')!.focus();
    const style = portal('style');
    const skip = portal();
    skip.id = 'skip';
    const nested = document.createElement('div');
    document.getElementById('host')!.appendChild(nested);
    await tick();
    expect(style.hasAttribute('data-theme')).toBe(false);
    expect(skip.hasAttribute('data-theme')).toBe(false);
    expect(nested.hasAttribute('data-theme')).toBe(false);
  });

  it('keeps following the scope and releases on removal', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal();
    await tick();
    const scope = document.querySelector('section')!;
    scope.setAttribute('data-theme', 'sand');
    await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    root.remove();
    await tick();
    expect(root.hasAttribute('data-followtheme')).toBe(false);
    scope.setAttribute('data-theme', 'dusk');
    await tick();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('gives each overlay its own origin', async () => {
    html('<section data-theme="ocean"><button id="a">a</button></section><section data-theme="sand"><button id="b">b</button></section>');
    stop = start();
    document.getElementById('a')!.focus();
    const ra = portal();
    await tick();
    document.getElementById('b')!.focus();
    const rb = portal();
    await tick();
    expect(ra.getAttribute('data-theme')).toBe('ocean');
    expect(rb.getAttribute('data-theme')).toBe('sand');
  });

  it('stop removes every mirror', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal();
    await tick();
    stop();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('data-followtheme')).toBe(false);
    stop = () => {};
  });

  it('themes a root even when the library moved focus into it before the callback ran', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    stop = start();
    document.getElementById('b')!.focus();
    const root = portal();
    const inner = document.createElement('button');
    root.appendChild(inner);
    inner.focus();
    await tick();
    expect(root.getAttribute('data-theme')).toBe('ocean');
  });

  it('keeps going when ignore throws', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    const onError = vi.fn();
    window.addEventListener('error', onError);
    stop = start({ ignore: (el) => { if (el.id === 'boom') throw new Error('boom'); return false; } });
    document.getElementById('b')!.focus();
    const boom = portal();
    boom.id = 'boom';
    const other = portal();
    await tick();
    window.removeEventListener('error', onError);
    expect(onError).not.toHaveBeenCalled();
    expect(other.getAttribute('data-theme')).toBe('ocean');
  });

  it('tears down only when the last caller stops', async () => {
    html('<section data-theme="ocean"><button id="b">open</button></section>');
    const first = start();
    const second = start();
    expect(second).not.toBe(first);
    document.getElementById('b')!.focus();
    const root = portal();
    await tick();
    first();
    first();
    expect(root.getAttribute('data-theme')).toBe('ocean');
    second();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});

describe('without a document', () => {
  it('every export is a no-op', async () => {
    vi.stubGlobal('document', undefined);
    try {
      vi.resetModules();
      const mod = await import('../src/core');
      expect(mod.scopeOf(null)).toBeNull();
      expect(typeof mod.start()).toBe('function');
      expect(() => mod.apply({} as Element, null)()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
