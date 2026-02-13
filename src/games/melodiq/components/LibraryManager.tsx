import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, Divider, List, ListItem, ListItemText, IconButton, CircularProgress } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import db, { type Library } from '../db';
import { runLibraryImport, runLegacyImport } from '../importer';
import { useSongs } from '../hooks/useSongs';

export const LibraryManager: React.FC = () => {
    // ---- Settings Hook ----
    // const { settings } = useSettings(); // Might still need settings if we use other parts? Actually we don't use settings anymore here.
    const { refreshSongs } = useSongs();


    // ---- Section 2: Browser Libraries ----
    const [libraries, setLibraries] = useState<Library[]>([]);
    const legacyInputRef = useRef<HTMLInputElement>(null);

    const refreshLibraries = () => {
        db.libraries.toArray().then(setLibraries);
    };

    useEffect(() => {
        refreshLibraries();
    }, []);

    const [importing, setImporting] = useState(false);

    const handleAddBrowserLibrary = async () => {
        // Feature detection
        // @ts-ignore
        if (!window.showDirectoryPicker) {
            // Fallback for Firefox/Non-Chromium
            legacyInputRef.current?.click();
            return;
        }

        try {
            // @ts-ignore - File System Access API
            const handle = await window.showDirectoryPicker();

            const lib: Library = {
                id: crypto.randomUUID(),
                name: handle.name,
                handle: handle,
                lastScanned: Date.now()
            };

            await db.libraries.add(lib);

            // Trigger scan
            setImporting(true);
            await runLibraryImport(lib);
            setImporting(false);
            refreshLibraries();
            refreshSongs();

        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error("Browser import failed, falling back to legacy input", err);
                legacyInputRef.current?.click();
            }
            setImporting(false);
        }
    };

    const handleLegacyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = e.target.files;
        // Use directory name from first file as library name
        // webkitRelativePath is like "Folder/Sub/File.txt"
        // We want "Folder"
        const firstPath = files[0].webkitRelativePath;
        const rootName = firstPath.split('/')[0] || "Local Folder";

        const lib: Library = {
            id: crypto.randomUUID(),
            name: rootName,
            // No handle in legacy mode
            lastScanned: Date.now()
        };

        try {
            setImporting(true);
            await db.libraries.add(lib);
            await runLegacyImport(files, lib.id);
            setImporting(false);
            refreshLibraries();
            refreshSongs();

            // Clear input
            e.target.value = '';
        } catch (err) {
            console.error("Legacy import failed", err);
            alert("Import failed: " + (err as Error).message);
            setImporting(false);
        }
    };


    const handleRemoveBrowserLibrary = async (id: string) => {
        if (!confirm("Remove this folder from Browser Storage? Songs will be deleted from the database.")) return;

        // Find songs in this library
        const songIds = await db.songs.where('libraryId').equals(id).primaryKeys();
        await db.songsContent.bulkDelete(songIds);
        await db.songs.bulkDelete(songIds);
        await db.songsMeta.bulkDelete(songIds);
        await db.libraries.delete(id);

        refreshLibraries();
        refreshSongs();
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Local Song Libraries</Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Browser Storage Section */}
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderIcon fontSize="small" /> Browser Storage
                    </Typography>
                    {importing && <CircularProgress size={16} />}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Stores metadata in database. Files accessed directly from disk.
                    <br />
                    <small>Note: Firefox may have storage limits.</small>
                </Typography>

                <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
                    {libraries.map(lib => (
                        <ListItem key={lib.id}>
                            <ListItemText
                                primary={lib.name}
                                secondary={`${lib.stats?.processed || 0} songs`}
                            />
                            <IconButton edge="end" size="small" onClick={() => handleRemoveBrowserLibrary(lib.id)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </ListItem>
                    ))}
                    {libraries.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No local folders added." sx={{ fontStyle: 'italic', color: 'text.disabled' }} />
                        </ListItem>
                    )}
                </List>

                {/* Hidden input for Legacy (Firefox) support */}
                <input
                    type="file"
                    ref={legacyInputRef}
                    style={{ display: 'none' }}
                    // @ts-ignore - Non-standard attribute for directory selection
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleLegacyFileSelect}
                />

                <Button
                    variant="contained"
                    size="small"
                    startIcon={<FolderOpenIcon />}
                    onClick={handleAddBrowserLibrary}
                    disabled={importing}
                    sx={{
                        borderRadius: 50,
                        px: 3,
                        py: 1,
                        backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                        color: 'white'
                    }}
                >
                    Add Local Folder
                </Button>
            </Box>
        </Paper>
    );
};
