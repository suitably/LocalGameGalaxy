import { Alert, Button, Link, Stack } from '@mui/material';
import BatchIcon from '@mui/icons-material/LibraryAddRounded';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { ListSkeleton } from '../../../../components/common/ListSkeleton';
import {
  isCompanionEnabled,
  scoreSearchUrl,
  songsterrSearchUrl,
  type CompanionSong,
} from '../../../../lib/companion/songScoresApi';
import { deleteLibrarySong } from '../../../../lib/companion/notesLibraryApi';
import {
  activeFilterCount,
  catalogFacets,
  searchCatalog,
  type CatalogMatch,
} from '../logic/catalogSearch';
import {
  loadScoreCatalog,
  type CatalogEntry,
  type CatalogItem,
  type CatalogScore,
} from '../logic/scoreCatalog';
import type { CatalogSearchState } from '../useCatalogSearch';
import { BatchImportDialog } from './BatchImportDialog';
import { CatalogEntryCard } from './CatalogEntryCard';
import { CatalogSearchBar } from './CatalogSearchBar';
import { SongFilesDialog } from './SongFilesDialog';

interface ScoreLibraryListProps {
  search: CatalogSearchState;
  onPlay: (item: CatalogScore) => void;
  /** Plays a Melodiq song's karaoke `.txt` as a vocal part (#566). */
  onPlayKaraoke: (song: CompanionSong) => void;
}

/**
 * The sheet-music library of Melodiq Notes on the server: one entry per song folder, the only
 * store (#568), searchable by text, format, instrument, language and genre.
 */
export function ScoreLibraryList({ search, onPlay, onPlayKaraoke }: ScoreLibraryListProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CatalogEntry | null>(null);
  const [managing, setManaging] = useState<CompanionSong | null>(null);
  const [importing, setImporting] = useState(false);
  const enabled = isCompanionEnabled();

  const reload = useCallback(() => {
    loadScoreCatalog()
      .then((next) => {
        setCatalog(next);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const facets = useMemo(() => catalogFacets(catalog ?? []), [catalog]);
  // translated instrument and format names are searchable too ("Gitarre", "midi")
  const terms = useCallback(
    (item: CatalogItem) =>
      [
        ...item.instruments.map((i) => t(`games.melodiq_notes.stage.instruments.${i}`)),
        t(`games.melodiq_notes.stage.formats.${item.format}`),
      ].join(' '),
    [t],
  );
  const matches: CatalogMatch[] = useMemo(
    () => searchCatalog(catalog ?? [], search.filters, terms),
    [catalog, search.filters, terms],
  );

  const remove = async (entry: CatalogEntry) => {
    setDeleting(null);
    if (entry.karaoke) return;
    try {
      await deleteLibrarySong(entry.song.id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!enabled) return <Alert severity="info">{k('server_off')}</Alert>;
  const hidden = matches.length - search.limit;
  return (
    <Stack spacing={1.5}>
      {error && <ErrorState dense message={k('server_error', { error })} onRetry={reload} />}
      <CatalogSearchBar search={search} facets={facets} resultCount={matches.length} />
      {!catalog && !error && <ListSkeleton rows={3} />}
      {catalog?.length === 0 && <EmptyState dense message={k('notes_empty')} />}
      {!!catalog?.length && matches.length === 0 && (
        <EmptyState
          dense
          message={k('no_results')}
          actionLabel={activeFilterCount(search.filters) > 0 ? k('filters_reset') : undefined}
          onAction={search.reset}
        />
      )}
      {matches.slice(0, search.limit).map((match) => (
        <CatalogEntryCard
          key={match.entry.key}
          match={match}
          onPlay={onPlay}
          onPlayKaraoke={onPlayKaraoke}
          onDelete={() => setDeleting(match.entry)}
          onManage={() => setManaging(match.entry.song)}
        />
      ))}
      {hidden > 0 && <Button onClick={search.showMore}>{k('show_more', { count: hidden })}</Button>}
      <Button
        variant="outlined"
        startIcon={<BatchIcon />}
        onClick={() => setImporting(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {k('batch_open')}
      </Button>
      <Link
        href={scoreSearchUrl('', search.filters.query)}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        title={k('find_scores_hint')}
      >
        {k('find_scores')}
      </Link>
      <Link
        href={songsterrSearchUrl('', search.filters.query)}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        title={k('find_tabs_hint')}
      >
        {k('find_tabs')}
      </Link>
      {managing && (
        <SongFilesDialog
          song={managing}
          onClose={(changed) => {
            setManaging(null);
            if (changed) reload();
          }}
        />
      )}
      {importing && (
        <BatchImportDialog
          onClose={(changed) => {
            setImporting(false);
            if (changed) reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={k('notes_delete')}
        message={k('notes_delete_confirm', { title: deleting?.title ?? '' })}
        confirmText={t('common.delete')}
        confirmColor="error"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Stack>
  );
}
