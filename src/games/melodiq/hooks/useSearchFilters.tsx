import { useState, useMemo, useEffect } from 'react';
import { type Song } from '../db';

export interface ActiveFilters {
    year: string[];
    genre: string[];
    language: string[];
    edition: string[];
}

export function useSearchFilters(songs: Song[]) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnlineSearch, setIsOnlineSearch] = useState(false);
    const [onlineSongs, setOnlineSongs] = useState<any[]>([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
        year: [],
        genre: [],
        language: [],
        edition: []
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
                const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
                const token = localStorage.getItem('melodiq_helper_token') || '';
                const helperUrl = url.replace(/\/$/, "");

                const res = await fetch(`${helperUrl}/api/usdb/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.songs) {
                    setOnlineSongs(data.songs);
                } else if (Array.isArray(data)) {
                    setOnlineSongs(data);
                } else {
                    setOnlineSongs([]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearchingOnline(false);
            }
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, isOnlineSearch]);

    const filteredSongs = useMemo(() => {
        let result = songs;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(song =>
                song.title.toLowerCase().includes(lowerQuery) ||
                song.artist.toLowerCase().includes(lowerQuery)
            );
        }

        if (activeFilters.year.length > 0) {
            result = result.filter(song => song.year && activeFilters.year.includes(song.year));
        }

        if (activeFilters.genre.length > 0) {
            result = result.filter(song => song.genre && activeFilters.genre.includes(song.genre));
        }

        if (activeFilters.language.length > 0) {
            result = result.filter(song => song.language && activeFilters.language.includes(song.language));
        }

        if (activeFilters.edition.length > 0) {
            result = result.filter(song => song.edition && activeFilters.edition.includes(song.edition));
        }

        return result;
    }, [songs, searchQuery, activeFilters]);

    const filteredOnlineSongs = useMemo(() => {
        let result = onlineSongs;

        if (activeFilters.year.length > 0) {
            result = result.filter(song => song.year && activeFilters.year.includes(song.year));
        }

        if (activeFilters.genre.length > 0) {
            result = result.filter(song => song.genre && activeFilters.genre.includes(song.genre));
        }

        if (activeFilters.language.length > 0) {
            result = result.filter(song => song.language && activeFilters.language.includes(song.language));
        }

        if (activeFilters.edition.length > 0) {
            result = result.filter(song => song.edition && activeFilters.edition.includes(song.edition));
        }

        return result;
    }, [onlineSongs, activeFilters]);

    const availableYears = useMemo(() =>
        Array.from(new Set(songs.map(s => s.year).filter(Boolean))).sort().reverse() as string[],
        [songs]);

    const availableGenres = useMemo(() =>
        Array.from(new Set(songs.map(s => s.genre).filter(Boolean))).sort() as string[],
        [songs]);

    const availableLanguages = useMemo(() =>
        Array.from(new Set(songs.map(s => s.language).filter(Boolean))).sort() as string[],
        [songs]);

    const availableEditions = useMemo(() =>
        Array.from(new Set(songs.map(s => s.edition).filter(Boolean))).sort() as string[],
        [songs]);

    const clearFilters = () => {
        setActiveFilters({ year: [], genre: [], language: [], edition: [] });
    };

    return {
        searchQuery, setSearchQuery,
        isOnlineSearch, setIsOnlineSearch,
        onlineSongs, isSearchingOnline,
        showFilters, setShowFilters,
        activeFilters, setActiveFilters,
        filteredSongs, filteredOnlineSongs,
        availableYears, availableGenres, availableLanguages, availableEditions,
        clearFilters
    };
}
