import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { apply, start, type Options } from './core';

export type { Options } from './core';

export function FollowTheme({ children, ...options }: Options & { children?: ReactNode }) {
  // options are read once: the provider is mounted once near the app root
  useEffect(() => start(options), []);
  return <>{children}</>;
}

export function useFollowTheme<T extends Element>(ref: RefObject<T | null>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const el = useRef<HTMLElement | null>(null);
  const getContainer = () => {
    if (!el.current) {
      el.current = document.createElement('div');
      document.body.appendChild(el.current);
    }
    return el.current;
  };
  useEffect(() => {
    const c = getContainer();
    const release = apply(c, ref.current);
    setContainer(c);
    return () => {
      release();
      c.remove();
      el.current = null;
    };
  }, [ref]);
  return { container, getContainer };
}
