import { afterEach, describe, expect, it } from 'vitest';
import { apply, configure, scopeOf } from '../src/core';

const html = (s: string) => { document.body.innerHTML = s; };

afterEach(() => {
  document.body.innerHTML = '';
  configure({ attributes: ['data-theme'], classes: ['dark', /^theme-/], inlineVars: true });
});

describe('scopeOf', () => {
  it('finds the nearest data-theme ancestor', () => {
    html('<section data-theme="ocean"><div><button id="b">open</button></div></section>');
    expect(scopeOf(document.getElementById('b'))?.getAttribute('data-theme')).toBe('ocean');
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
    expect(root.style.getPropertyValue('--brand')).toBe('red');
    expect(root.style.color).toBe('');
    expect(root.hasAttribute('data-followtheme')).toBe(true);
  });

  it('writes nothing when the origin has no scope', () => {
    html('<button id="b"></button><div id="root"></div>');
    apply(document.getElementById('root')!, document.getElementById('b'));
    expect(document.getElementById('root')!.attributes.length).toBe(1);
  });

  it('writes nothing when the root already sits inside a scope', () => {
    html('<section data-theme="ocean"><button id="b"></button></section><section data-theme="sand"><div id="root"></div></section>');
    apply(document.getElementById('root')!, document.getElementById('b'));
    expect(document.getElementById('root')!.hasAttribute('data-theme')).toBe(false);
  });

  it('follows attribute changes and removals on the scope', async () => {
    html('<section data-theme="ocean"><button id="b"></button></section><div id="root"></div>');
    const scope = document.querySelector('section')!;
    const root = document.getElementById('root')!;
    apply(root, document.getElementById('b'));
    scope.setAttribute('data-theme', 'sand');
    await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    scope.removeAttribute('data-theme');
    scope.classList.add('dark');
    await tick();
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
    const scope = document.querySelector('section')!;
    const root = document.getElementById('root')!;
    apply(root, document.getElementById('b'));
    scope.remove();
    scope.setAttribute('data-theme', 'gone');
    await tick();
    expect(root.getAttribute('data-theme')).toBe('gone');
  });
});
