import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPrefersReducedMotion, usePrefersReducedMotion } from './usePrefersReducedMotion';

const stubMedia = (matches: boolean) =>
  vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches })) });

describe('usePrefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false without matchMedia', () => {
    vi.stubGlobal('window', {});
    expect(getPrefersReducedMotion()).toBe(false);
  });

  it('reads the reduce query', () => {
    stubMedia(true);
    expect(getPrefersReducedMotion()).toBe(true);
    stubMedia(false);
    expect(getPrefersReducedMotion()).toBe(false);
  });

  it('exposes the initial value through the hook', () => {
    stubMedia(true);
    const Probe = () => <i data-reduced={String(usePrefersReducedMotion())} />;
    expect(renderToString(<Probe />)).toContain('data-reduced="true"');
  });
});
