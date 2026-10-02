import { describe, expect, it } from 'vitest';

describe('environment', () => {
  it('has a document and a MutationObserver', () => {
    expect(typeof document).toBe('object');
    expect(typeof MutationObserver).toBe('function');
  });
});
