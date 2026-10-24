import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { type SongMeta } from '../db';
import { type DownloadJob } from './useDownloads';
import { type UsdbSongItem } from '../types';
import { melodiqFetch } from '../api/melodiqFetch';
import { isUsdbLoginRequiredError, navigateToUsdbSettings } from '../utils/usdbNavigation';

export type SortOption =
  'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc' | 'year-desc' | 'year-asc';

export interface ActiveFilters {
  year: string[];
  genre: string[];
  language: string[];
  edition: string[];
}

interface FilterableSong {
  title?: string;
  artist?: string;
  year?: string | number;
  genre?: string;
  language?: string;
  edition?: string;
}

function applyFacetFilters<T extends FilterableSong>(songs: T[], filters: ActiveFilters): T[] {
  const matches = (selected: string[], value: string | undefined) =>
    selected.length === 0 || (!!value && selected.includes(value));
  return songs.filter(
    (song) =>
      matches(filters.year, song.year ? String(song.year) : undefined) &&
      matches(filters.genre, song.genre) &&
      matches(filters.language, song.language) &&
      matches(filters.edition, song.edition),
  );
}

function sortSongs<T extends FilterableSong>(songs: T[], sortOption: SortOption): T[] {
  const yearOf = (song: T, fallback: number) => parseInt(String(song.year || fallback)) || fallback;
  const sorted = [...songs];
  sorted.sort((a, b) => {
    switch (sortOption) {
      case 'title-asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'title-desc':
        return (b.title || '').localeCompare(a.title || '');
      case 'artist-asc':
        return (a.artist || '').localeCompare(b.artist || '');
      case 'artist-desc':
        return (b.artist || '').localeCompare(a.artist || '');
      case 'year-desc':
        return yearOf(b, 0) - yearOf(a, 0);
      case 'year-asc':
        return yearOf(a, 9999) - yearOf(b, 9999);
      default:
        return 0;
    }
  });
  return sorted;
}

export function useSearchFilters(songs: SongMeta[], jobs?: DownloadJob[]) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnlineSearch, setIsOnlineSearch] = useState(false);
  const [onlineSongs, setOnlineSongs] = useState<UsdbSongItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('title-asc');

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    year: [],
    genre: [],
    language: [],
    edition: [],
  });

  // Handle online search
  useEffect(() => {
    if (!isOnlineSearch || !searchQuery) {
      setOnlineSongs([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const data = await melodiqFetch(`/api/usdb/search?q=${encodeURIComponent(searchQuery)}`);
        if (data.songs) {
          setOnlineSongs(data.songs);
        } else if (Array.isArray(data)) {
          setOnlineSongs(data);
        } else {
          setOnlineSongs([]);
        }
      } catch (err: unknown) {
        console.error(err);
        if (isUsdbLoginRequiredError(err)) {
          navigateToUsdbSettings(navigate, location);
        }
      } finally {
        setIsSearchingOnline(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isOnlineSearch, navigate, location]);

  const filteredSongs = useMemo(() => {
    let result = songs;

    if (jobs) {
      const activeJobs = jobs.filter(
        (j) => (j.status === 'pending' || j.status === 'running') && j.title,
      );
      const dummySongs: SongMeta[] = activeJobs.map((j) => ({
        id: `job-${j.jobId}`,
        title: j.title || 'Unknown',
        artist: j.artist || 'Unknown',
        isDownloading: true,
        jobId: j.jobId,
        usdbId: j.usdbId ? Number(j.usdbId) : undefined,
        hasCover: false,
        hasVideo: false,
        bpm: 0,
        year: '',
        language: '',
        genre: '',
        start: 0,
        end: 0,
        duration: 0,
        edition: '',
      }));

      const uniqueDummies = dummySongs.filter(
        (d) =>
          !result.some(
            (s) =>
              s.title?.toLowerCase() === d.title.toLowerCase() &&
              s.artist?.toLowerCase() === d.artist.toLowerCase(),
          ),
      );

      result = [...uniqueDummies, ...result];
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (song) =>
          (song.title || '').toLowerCase().includes(lowerQuery) ||
          (song.artist || '').toLowerCase().includes(lowerQuery),
      );
    }

    return sortSongs(applyFacetFilters(result, activeFilters), sortOption);
  }, [songs, jobs, searchQuery, activeFilters, sortOption]);

  const filteredOnlineSongs = useMemo(() => {
    return sortSongs(applyFacetFilters(onlineSongs, activeFilters), sortOption);
  }, [onlineSongs, activeFilters, sortOption]);

  const availableYears = useMemo(
    () =>
      Array.from(new Set(songs.map((s) => s.year).filter(Boolean)))
        .sort()
        .reverse() as string[],
    [songs],
  );

  const availableGenres = useMemo(
    () => Array.from(new Set(songs.map((s) => s.genre).filter(Boolean))).sort() as string[],
    [songs],
  );

  const availableLanguages = useMemo(
    () => Array.from(new Set(songs.map((s) => s.language).filter(Boolean))).sort() as string[],
    [songs],
  );

  const availableEditions = useMemo(
    () => Array.from(new Set(songs.map((s) => s.edition).filter(Boolean))).sort() as string[],
    [songs],
  );

  const clearFilters = () => {
    setActiveFilters({ year: [], genre: [], language: [], edition: [] });
  };

  return {
    searchQuery,
    setSearchQuery,
    isOnlineSearch,
    setIsOnlineSearch,
    onlineSongs,
    isSearchingOnline,
    showFilters,
    setShowFilters,
    sortOption,
    setSortOption,
    activeFilters,
    setActiveFilters,
    filteredSongs,
    filteredOnlineSongs,
    availableYears,
    availableGenres,
    availableLanguages,
    availableEditions,
    clearFilters,
  };
}
