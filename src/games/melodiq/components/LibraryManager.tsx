import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, Divider, Alert, List, ListItem, ListItemText, IconButton, CircularProgress, TextField, FormControlLabel, Switch } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import db, { type Library } from '../db';
import { runLibraryImport, runLegacyImport } from '../importer';
import { useSettings } from '../hooks/useSettings';

export const LibraryManager: React.FC = () => {
    // ---- Settings Hook ----
    const { settings, updateSetting } = useSettings();
    const [tempUrl, setTempUrl] = useState(settings.helperUrl);

    // Sync tempUrl with settings if settings change externally
    useEffect(() => {
        setTempUrl(settings.helperUrl);
    }, [settings.helperUrl]);

    // ---- Section 1: Helper App Status ----
    const [helperStatus, setHelperStatus] = useState<'loading' | 'online' | 'offline' | 'disabled'>('disabled');

    // Check helper status whenever URL changes or enabled status changes
    useEffect(() => {
        if (!settings.enableHelper) {
            setHelperStatus('disabled');
            return;
        }

        const checkHelper = async () => {
            setHelperStatus('loading');
            try {
                // Remove trailing slash if present for cleaner URL construction
                const baseUrl = settings.helperUrl.replace(/\/$/, "");
                const res = await fetch(`${baseUrl}/api/config/directories`);
                if (res.ok) setHelperStatus('online');
                else setHelperStatus('offline');
            } catch (e) {
                setHelperStatus('offline');
            }
        };
        checkHelper();
    }, [settings.helperUrl, settings.enableHelper]);

    const handleSaveUrl = () => {
        let cleanUrl = tempUrl.trim();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        if (!cleanUrl.startsWith('http')) cleanUrl = `http://${cleanUrl}`;

        updateSetting('helperUrl', cleanUrl);
        // updateSetting now persists instantly, no need for manual save
    };

    const handleToggleHelper = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('enableHelper', e.target.checked);
        // updateSetting now persists instantly, no need for manual save
    };

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

        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error("Browser import failed", err);
                alert("Browser import failed: " + (err as Error).message);
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
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Song Libraries</Typography>

            {/* Helper App Section */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudQueueIcon fontSize="small" color="primary" /> Melodiq Helper (Remote/Local)
                    </Typography>

                    <FormControlLabel
                        control={<Switch size="small" checked={settings.enableHelper} onChange={handleToggleHelper} />}
                        label={settings.enableHelper ? "Enabled" : "Disabled"}
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Connect to a Helper App running locally or on another computer.
                </Typography>

                {settings.enableHelper && (
                    <Box sx={{ ml: 2, pl: 2, borderLeft: '2px solid #eee' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                                <TextField
                                    size="small"
                                    fullWidth
                                    label="Helper URL"
                                    value={tempUrl}
                                    onChange={(e) => setTempUrl(e.target.value)}
                                    placeholder="http://localhost:3000"
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleSaveUrl}
                                    disabled={tempUrl === settings.helperUrl}
                                >
                                    Save
                                </Button>
                            </Box>
                            {helperStatus === 'online' ?
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Connected</Typography> :
                                helperStatus === 'loading' ? <CircularProgress size={16} /> :
                                    helperStatus === 'disabled' ? <Typography variant="caption" color="text.disabled">Disabled</Typography> :
                                        <Typography variant="caption" color="error" sx={{ whiteSpace: 'nowrap' }}>Disconnected</Typography>
                            }
                        </Box>

                        {helperStatus === 'online' ? (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<OpenInNewIcon />}
                                href={settings.helperUrl}
                                target="_blank"
                            >
                                Open Dashboard
                            </Button>
                        ) : (
                            <Alert severity="info" sx={{ py: 0 }}>
                                Helper not reachable at this URL.
                            </Alert>
                        )}
                    </Box>
                )}
            </Box>

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
                >
                    Add Local Folder
                </Button>
            </Box>
        </Paper>
    );
};
