import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { FollowTheme, useFollowTheme } from '../src/react';

afterEach(() => {
  document.body.innerHTML = '';
});
const tick = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

function Card() {
  const ref = useRef<HTMLButtonElement>(null);
  const { container } = useFollowTheme(ref);
  return (
    <section data-theme="ocean">
      <button ref={ref}>open</button>
      {container && createPortal(<p id="content">hello</p>, container)}
    </section>
  );
}

describe('useFollowTheme', () => {
  it('gives a body-level container that carries the scope', async () => {
    const { unmount } = render(<Card />);
    await tick();
    const p = document.getElementById('content')!;
    expect(p.parentElement?.parentElement).toBe(document.body);
    expect(p.parentElement?.getAttribute('data-theme')).toBe('ocean');
    unmount();
    expect(document.querySelector('[data-followtheme]')).toBeNull();
  });
});

describe('FollowTheme', () => {
  it('starts the automatic path for its lifetime', async () => {
    const { unmount } = render(
      <FollowTheme>
        <section data-theme="sand">
          <button id="b">open</button>
        </section>
      </FollowTheme>,
    );
    document.getElementById('b')!.focus();
    const root = document.createElement('div');
    document.body.appendChild(root);
    await tick();
    expect(root.getAttribute('data-theme')).toBe('sand');
    unmount();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
