import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ListSkeleton } from './ListSkeleton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, def?: string) => def ?? _key }),
}));

describe('EmptyState', () => {
  it('renders message and the single action', () => {
    const html = renderToStaticMarkup(
      <EmptyState message="Nothing here" actionLabel="Add" onAction={() => {}} />,
    );
    expect(html).toContain('Nothing here');
    expect(html).toContain('Add');
  });

  it('shows no button without an action', () => {
    expect(renderToStaticMarkup(<EmptyState message="Nothing here" />)).not.toContain('<button');
  });
});

describe('ErrorState', () => {
  it('renders message and retry label', () => {
    const html = renderToStaticMarkup(
      <ErrorState message="Failed" onRetry={() => {}} retryLabel="Again" />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Failed');
    expect(html).toContain('Again');
  });

  it('falls back to the translated retry label', () => {
    expect(renderToStaticMarkup(<ErrorState message="Failed" onRetry={() => {}} />)).toContain(
      'Retry',
    );
  });

  it('shows no retry button without handler', () => {
    expect(renderToStaticMarkup(<ErrorState message="Failed" />)).not.toContain('<button');
  });
});

describe('ListSkeleton', () => {
  it('renders the requested number of rows', () => {
    const html = renderToStaticMarkup(<ListSkeleton rows={4} />);
    expect(html.match(/list-skeleton-row/g)).toHaveLength(4);
  });
});
