import re

with open('src/games/melodiq/MelodiqGame.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
new_imports = """
import { useSearchFilters } from './hooks/useSearchFilters';
import { MelodiqSearchBar } from './components/MelodiqSearchBar';
import { LibraryEmptyState } from './components/LibraryEmptyState';
import { OnlineSongsView } from './components/OnlineSongsView';
import { LocalSongsView } from './components/LocalSongsView';
"""
content = content.replace("import { PlaybackManager } from './components/PlaybackManager';", new_imports + "\nimport { PlaybackManager } from './components/PlaybackManager';")

# 2. State
state_to_replace = """    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnlineSearch, setIsOnlineSearch] = useState(false);
    const [onlineSongs, setOnlineSongs] = useState<any[]>([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);"""

use_search_filters_str = """    // Search & Filter State from Hook
    const searchFilterState = useSearchFilters(songs);
    const { 
        searchQuery, isOnlineSearch, isSearchingOnline, onlineSongs,
        showFilters, setShowFilters, clearFilters,
        filteredSongs, filteredOnlineSongs
    } = searchFilterState;"""

content = content.replace(state_to_replace, use_search_filters_str)

# 3. Old active filters and online search effect
old_filters_start = "    const [activeFilters, setActiveFilters] = useState<{\n        year: string[];"
old_filters_end = "        return () => clearTimeout(delayDebounceFn);\n    }, [searchQuery, isOnlineSearch]);"
start_idx = content.find(old_filters_start)
end_idx = content.find(old_filters_end) + len(old_filters_end)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# 4. showFilters state
show_filters_decl = "    // Filter Visibility State\n    const [showFilters, setShowFilters] = useState(false);"
content = content.replace(show_filters_decl, "")

# 5. Local filtering logic
filtered_start = "    const filteredSongs = React.useMemo(() => {"
filtered_end = "        setActiveFilters({ year: [], genre: [], language: [], edition: [] });\n    };"
f_start_idx = content.find(filtered_start)
f_end_idx = content.find(filtered_end) + len(filtered_end)
if f_start_idx != -1 and f_end_idx != -1:
    content = content[:f_start_idx] + content[f_end_idx:]

# 6. Render Block
render_start = "                {/* Header removed, now using GlobalHeader */}"
render_end = "            </Box >\n        );\n    };"
r_start_idx = content.find(render_start)
r_end_idx = content.find(render_end)
if r_start_idx != -1 and r_end_idx != -1:
    new_render_block = """                {/* Search Bar - ALWAYS AT THE TOP */}
                {!hasConnectionError && (
                    <MelodiqSearchBar 
                        {...searchFilterState} 
                        filteredSongsLength={filteredSongs.length} 
                        totalSongsLength={songs.length} 
                    />
                )}

                {/* Loading Progress */}
                {
                    loadingProgress && isLoading && (
                        <Box sx={{ mb: 2, flexShrink: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {loadingProgress.total > 0 ? t('melodiq.loading_library', { loaded: loadingProgress.loaded, total: loadingProgress.total }) : t('melodiq.scanning')}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={loadingProgress.total > 0 ? (loadingProgress.loaded / loadingProgress.total) * 100 : 0}
                            />
                        </Box>
                    )
                }

                <LibraryEmptyState 
                    hasConnectionError={!!hasConnectionError}
                    isLoading={isLoading}
                    songsLength={songs?.length || 0}
                    isOnlineSearch={isOnlineSearch}
                    refreshSongs={refreshSongs}
                />

                {isOnlineSearch && (
                    <OnlineSongsView 
                        isSearchingOnline={isSearchingOnline}
                        viewMode={viewMode}
                        filteredOnlineSongs={filteredOnlineSongs}
                        songs={songs}
                        jobs={jobs}
                        handleSelectSong={handleSelectSong}
                        handleDownloadAndQueue={handleDownloadAndQueue}
                        handleSongLongPress={handleSongLongPress}
                        handleDownloadOnly={handleDownloadOnly}
                    />
                )}

                {!isOnlineSearch && (
                    <LocalSongsView 
                        viewMode={viewMode}
                        filteredSongs={filteredSongs as any}
                        handleSelectSong={handleSelectSong}
                        handleSongLongPress={handleSongLongPress}
                    />
                )}
"""
    content = content[:r_start_idx] + new_render_block + content[r_end_idx:]

with open('src/games/melodiq/MelodiqGame.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

