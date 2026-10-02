import { afterEach, describe, expect, it } from 'vitest';
import { configure, scopeOf } from '../src/core';

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
