import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useIsTvMode } from './useIsTvMode';
import { TvThemeProvider } from '../components/common/TvThemeProvider';

const Probe = () => <i data-tv={String(useIsTvMode())} />;

describe('useIsTvMode (#554)', () => {
  it('is false outside a TV view', () => {
    expect(renderToString(<Probe />)).toContain('data-tv="false"');
  });

  it('is true inside TvThemeProvider', () => {
    expect(
      renderToString(
        <TvThemeProvider>
          <Probe />
        </TvThemeProvider>,
      ),
    ).toContain('data-tv="true"');
  });
});
