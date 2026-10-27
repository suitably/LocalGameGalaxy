import { useCallback, useState } from 'react';
import { NO_CATALOG_FILTERS, type CatalogFilters } from './logic/catalogSearch';

const PAGE = 40;

/** Search state of the song picker's library; it outlives the dialog, so a reopen keeps it. */
export function useCatalogSearch() {
  const [filters, setFilters] = useState<CatalogFilters>(NO_CATALOG_FILTERS);
  const [limit, setLimit] = useState(PAGE);
  const update = useCallback((patch: Partial<CatalogFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  }, []);
  /** Clears the facets; the query and the sort order stay. */
  const reset = useCallback(
    () => update({ formats: [], instruments: [], languages: [], genres: [] }),
    [update],
  );
  const showMore = useCallback(() => setLimit((l) => l + PAGE), []);
  return { filters, update, reset, limit, showMore };
}

export type CatalogSearchState = ReturnType<typeof useCatalogSearch>;
