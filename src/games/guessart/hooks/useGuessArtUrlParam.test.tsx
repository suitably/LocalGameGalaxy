import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGuessArtUrlParam } from './useGuessArtUrlParam';

const render = (search: string, hash = '') => {
  vi.stubGlobal('window', { location: { search, hash, href: `http://x/${search}${hash}` } });
  const Probe = () => <i data-id={String(useGuessArtUrlParam().activeGameId)} />;
  return renderToString(<Probe />);
};

describe('useGuessArtUrlParam', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts without a game when the URL has no gameId', () => {
    expect(render('')).toContain('data-id="null"');
  });

  it('reads gameId from the query string on the first render', () => {
    expect(render('?gameId=abc')).toContain('data-id="abc"');
  });

  it('reads gameId from the hash query', () => {
    expect(render('', '#/guessart?gameId=xyz')).toContain('data-id="xyz"');
  });

  it('ignores links that carry a game snapshot', () => {
    expect(render('?gameId=abc&data=zzz')).toContain('data-id="null"');
  });
});
