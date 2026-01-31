import React, { useEffect, useState, useRef } from 'react';
import {
    Box, Button, Typography, IconButton, Card, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import ArticleIcon from '@mui/icons-material/Article';
import { MelodiqImporter, type ImportStats } from '../importer';
import { db, type Library } from '../db';

export const LibraryManager: React.FC = () => {
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [loadingLibraries, setLoadingLibraries] = useState(true);
    const [activeImportId, setActiveImportId] = useState<string | null>(null);
    const [importStats, setImportStats] = useState<ImportStats | null>(null);
    const [libraryLogs, setLibraryLogs] = useState<string[]>([]);
    const [viewingLogLibraryId, setViewingLogLibraryId] = useState<string | null>(null);
    const [showLogDialog, setShowLogDialog] = useState(false);

    // Fallback Import State (Firefox / Non-FSA)
    const fallbackInputRef = useRef<HTMLInputElement>(null);
    const [fallbackAction, setFallbackAction] = useState<{ type: 'add' | 'reload', libId?: string } | null>(null);

    // Load Libraries
    useEffect(() => {
        const fetchLibs = async () => {
            const libs = await db.libraries.toArray();
            setLibraries(libs);
            setLoadingLibraries(false);
        };
        fetchLibs();
    }, [activeImportId]);

    const runLibraryImport = async (lib: Library) => {
        setActiveImportId(lib.id);
        const importer = new MelodiqImporter();
        const logs: string[] = [];
        let finalStats: ImportStats | null = null;

        try {
            const hasManifest = await importer.checkManifest(lib.handle);

            const onProgress = (stats: ImportStats) => {
                finalStats = { ...stats };
                setImportStats({ ...stats });
            };

            const onLog = (msg: string) => {
                logs.push(msg);
                if (viewingLogLibraryId === lib.id) {
                    setLibraryLogs(prev => [...prev, msg]);
                }
            };

            if (hasManifest) {
                await importer.importFromManifest(lib.handle, onProgress, onLog, lib.id);
            } else {
                await importer.scanAndGenerateManifest(lib.handle, onProgress, onLog, lib.id);
            }

            await db.libraries.update(lib.id, {
                stats: finalStats || undefined,
                logs: logs,
                lastScanned: Date.now()
            });

        } catch (err) {
            console.error(`Import failed for ${lib.name}`, err);
            logs.push(`Critical Error: ${err}`);
            await db.libraries.update(lib.id, { logs: logs });
        } finally {
            setActiveImportId(null);
            setImportStats(null);
            const updatedLibs = await db.libraries.toArray();
            setLibraries(updatedLibs);
        }
    };

    const handleAddLibrary = async () => {
        try {
            // @ts-ignore
            if (window.showDirectoryPicker) {
                // @ts-ignore
                const dirHandle = await window.showDirectoryPicker();
                const libId = crypto.randomUUID();
                const newLib: Library = {
                    id: libId,
                    name: dirHandle.name,
                    handle: dirHandle,
                    logs: [],
                    stats: { totalFound: 0, processed: 0, cached: 0, removed: 0, errors: 0 }
                };

                await db.libraries.add(newLib);
                setLibraries(prev => [...prev, newLib]);
                await runLibraryImport(newLib);
            } else {
                setFallbackAction({ type: 'add' });
                fallbackInputRef.current?.click();
            }
        } catch (err) {
            console.error('Add library failed', err);
        }
    };

    const handleFallbackInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = e.target.files;

        const firstFile = files[0];
        const pathParts = firstFile.webkitRelativePath?.split('/');
        const rootName = pathParts && pathParts.length > 0 ? pathParts[0] : 'Imported Folder';

        let targetLibId = fallbackAction?.libId;
        const libName = rootName;

        if (fallbackAction?.type === 'add') {
            targetLibId = crypto.randomUUID();
            const newLib: Library = {
                id: targetLibId,
                name: libName,
                handle: null as any,
                logs: [],
                stats: { totalFound: 0, processed: 0, cached: 0, removed: 0, errors: 0 }
            };
            await db.libraries.add(newLib);
            setLibraries(prev => [...prev, newLib]);
        }

        if (!targetLibId) return;

        setActiveImportId(targetLibId);
        const importer = new MelodiqImporter();
        const logs: string[] = [];
        let finalStats: ImportStats | null = null;

        try {
            const onProgress = (stats: ImportStats) => {
                finalStats = { ...stats };
                setImportStats({ ...stats });
            };
            const onLog = (msg: string) => {
                logs.push(msg);
                if (viewingLogLibraryId === targetLibId) {
                    setLibraryLogs(prev => [...prev, msg]);
                }
            };

            onLog("Starting Fallback Import (No persistent file handle)...");
            onLog(`Selected ${files.length} files.`);

            await importer.importFromFileList(files, onProgress, onLog, targetLibId);

            await db.libraries.update(targetLibId, {
                stats: finalStats || undefined,
                logs: logs,
                lastScanned: Date.now()
            });

        } catch (err) {
            console.error("Fallback Import Failed", err);
            logs.push(`Critical Error: ${err}`);
            await db.libraries.update(targetLibId, { logs: logs });
        } finally {
            setActiveImportId(null);
            setImportStats(null);
            setFallbackAction(null);
            if (fallbackInputRef.current) fallbackInputRef.current.value = '';
            const updatedLibs = await db.libraries.toArray();
            setLibraries(updatedLibs);
        }
    };

    const handleReloadLibrary = async (lib: Library) => {
        if (!lib.handle) {
            alert(`For this folder, you must re-select it to reload because your browser does not support persistent access.`);
            setFallbackAction({ type: 'reload', libId: lib.id });
            fallbackInputRef.current?.click();
            return;
        }

        try {
            // @ts-ignore
            await lib.handle.queryPermission({ mode: 'read' });
            // @ts-ignore
            if ((await lib.handle.queryPermission({ mode: 'read' })) !== 'granted') {
                // @ts-ignore
                if ((await lib.handle.requestPermission({ mode: 'read' })) !== 'granted') {
                    throw new Error("Permission denied");
                }
            }

            setLibraryLogs([]);
            await runLibraryImport(lib);

        } catch (e) {
            alert(`Could not access folder "${lib.name}". You may need to re-add it or grant permissions.`);
            console.error(e);
        }
    };

    const handleDeleteLibrary = async (libId: string) => {
        if (confirm("Are you sure? This will remove the folder from the list and delete all its songs from the database.")) {
            const ids = await db.songs.where('libraryId').equals(libId).primaryKeys();
            await db.songsContent.bulkDelete(ids);
            await db.songs.bulkDelete(ids);
            await db.libraries.delete(libId);
            setLibraries(prev => prev.filter(l => l.id !== libId));
        }
    };

    const handleViewLogs = (lib: Library) => {
        setLibraryLogs(lib.logs || []);
        setViewingLogLibraryId(lib.id);
        setShowLogDialog(true);
    };

    const handleCloseLogs = () => {
        setShowLogDialog(false);
        setViewingLogLibraryId(null);
        setLibraryLogs([]);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Song Libraries</Typography>
                <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    style={{ display: 'none' }}
                    ref={fallbackInputRef}
                    onChange={handleFallbackInputChange}
                />
                <Button
                    variant="contained"
                    startIcon={<FolderOpenIcon />}
                    onClick={handleAddLibrary}
                    disabled={loadingLibraries || activeImportId !== null}
                >
                    Add Connection
                </Button>
            </Box>

            {loadingLibraries ? <Typography>Loading...</Typography> : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {libraries.length === 0 && (
                        <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 2 }}>
                            <Typography color="text.secondary">No song folders connected.</Typography>
                            <Typography variant="caption" display="block">Click "Add Connection" to link a folder containing your songs.</Typography>
                        </Box>
                    )}

                    {libraries.map(lib => (
                        <Card key={lib.id} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">{lib.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        ID: {lib.id.substring(0, 8)}... | Last Scan: {lib.lastScanned ? new Date(lib.lastScanned).toLocaleString() : 'Never'}
                                    </Typography>
                                    {lib.stats ? (
                                        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: lib.stats.errors > 0 ? 'warning.main' : 'text.secondary' }}>
                                            Imported: {(lib.stats.processed || 0) + (lib.stats.cached || 0)} | Failed: {lib.stats.errors || 0} | Total Found: {lib.stats.totalFound || 0}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            Pending Scan...
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleReloadLibrary(lib)}
                                        disabled={activeImportId !== null}
                                        color="primary"
                                        title="Reload / Rescan"
                                    >
                                        <Typography sx={{ fontSize: '1.2rem' }}>↻</Typography>
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleViewLogs(lib)}
                                        disabled={!lib.logs || lib.logs.length === 0}
                                        title="View Logs"
                                    >
                                        <ArticleIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDeleteLibrary(lib.id)}
                                        color="error"
                                        disabled={activeImportId !== null}
                                        title="Remove Library"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {activeImportId === lib.id && importStats && (
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={((importStats.processed + importStats.cached) / (importStats.totalFound || 1)) * 100}
                                    />
                                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                        {importStats.lastLog}
                                    </Typography>
                                </Box>
                            )}
                        </Card>
                    ))}
                </Box>
            )}

            {/* Log Dialog */}
            <Dialog open={showLogDialog} onClose={handleCloseLogs} maxWidth="md" fullWidth>
                <DialogTitle>Import Logs</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                        {libraryLogs.length > 0 ? libraryLogs.map((line, i) => (
                            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '2px 0' }}>{line}</div>
                        )) : (
                            <Typography color="text.secondary">No logs available.</Typography>
                        )}
                    </Box>
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLogs}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
