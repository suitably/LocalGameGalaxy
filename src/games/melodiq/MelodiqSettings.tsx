import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, FormControl, MenuItem, Select, Switch, FormControlLabel, Container, Paper, Divider, TextField, IconButton, Avatar, Popover, Slider, Chip, ToggleButton, ToggleButtonGroup, Card, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ArticleIcon from '@mui/icons-material/Article';
import { MelodiqImporter, type ImportStats } from './importer';
import { db } from './db';

import SettingsIcon from '@mui/icons-material/Settings';
import { MicrophoneManager } from './audio/MicrophoneManager';
import { LatencyCalibrator } from './components/LatencyCalibrator';
import { useWebRTC } from './audio/WebRTCContext';



// Presets: Hue values
const COLOR_PRESETS = [
    { name: 'Cyan', hue: 190, color: 'hsl(190, 100%, 50%)' },
    { name: 'Green', hue: 120, color: 'hsl(120, 100%, 50%)' },
    { name: 'Blue', hue: 240, color: 'hsl(240, 100%, 50%)' },
    { name: 'Purple', hue: 270, color: 'hsl(270, 100%, 50%)' },
    { name: 'Pink', hue: 330, color: 'hsl(330, 100%, 50%)' },
    { name: 'Red', hue: 0, color: 'hsl(0, 100%, 50%)' },
    { name: 'Orange', hue: 30, color: 'hsl(30, 100%, 50%)' },
];

export interface UserProfile {
    id: string;
    name: string;
    hue: number;
}

export interface ActivePlayer {
    profileId: string;
    deviceId: string;
    volume?: number;
    muted?: boolean;
    latency?: number;
    isRemote?: boolean;
}

interface MelodiqSettingsProps {
    onBack: () => void;
}

export const MelodiqSettings: React.FC<MelodiqSettingsProps> = ({ onBack }) => {

    const loadInitialData = (): { profiles: UserProfile[], activePlayers: ActivePlayer[] } => {
        const storedProfiles = localStorage.getItem('melodiq_profiles');
        const storedActive = localStorage.getItem('melodiq_active_session');

        if (storedProfiles) {
            return {
                profiles: JSON.parse(storedProfiles),
                activePlayers: storedActive ? JSON.parse(storedActive) : []
            };
        }

        // Data Migration: Check for legacy P1/P2
        const p1Name = localStorage.getItem('melodiq_p1_name');
        const p2Name = localStorage.getItem('melodiq_p2_name');

        if (p1Name || p2Name) {
            const newProfiles: UserProfile[] = [];
            const newActive: ActivePlayer[] = [];

            // Migrate P1
            const p1Id = crypto.randomUUID();
            const p1Hue = parseInt(localStorage.getItem('melodiq_p1_hue') || '190');
            const p1Dev = localStorage.getItem('melodiq_p1_device') || '';
            newProfiles.push({ id: p1Id, name: p1Name || 'Player 1', hue: p1Hue });
            newActive.push({ profileId: p1Id, deviceId: p1Dev, volume: 0.8, muted: true, latency: 0 });

            // Migrate P2
            if (p2Name) {
                const p2Id = crypto.randomUUID();
                const p2Hue = parseInt(localStorage.getItem('melodiq_p2_hue') || '120');
                const p2Dev = localStorage.getItem('melodiq_p2_device') || '';
                newProfiles.push({ id: p2Id, name: p2Name || 'Player 2', hue: p2Hue });
                newActive.push({ profileId: p2Id, deviceId: p2Dev, volume: 0.8, muted: true, latency: 0 });
            }

            return { profiles: newProfiles, activePlayers: newActive };
        }

        // Fresh Start: Create Default Profile
        const defaultId = crypto.randomUUID();
        return {
            profiles: [{ id: defaultId, name: 'Player 1', hue: 190 }],
            activePlayers: [{ profileId: defaultId, deviceId: '', volume: 0.8, muted: true, latency: 0 }]
        };
    };



    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // Dynamic State
    // Dynamic State
    // Lazy load initial data to prevent hydration mismatch/double render logic (though this is client-only)
    const [initialData] = useState(loadInitialData);
    const [profiles, setProfiles] = useState<UserProfile[]>(initialData.profiles);
    const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>(initialData.activePlayers);

    // Game Settings
    const [showDebugOverlay, setShowDebugOverlay] = useState(localStorage.getItem('melodiq_show_overlay') === 'true');
    const [showDevSlider, setShowDevSlider] = useState(localStorage.getItem('melodiq_show_slider') === 'true');
    const [showMicStatus, setShowMicStatus] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_mic_status');
        return stored === null ? true : stored === 'true';
    });
    const [showNoteLabels, setShowNoteLabels] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_note_labels');
        return stored === null ? true : stored === 'true';
    });
    const [showVideoErrors, setShowVideoErrors] = useState(localStorage.getItem('melodiq_show_video_errors') === 'true');
    const [layoutOverride, setLayoutOverride] = useState(localStorage.getItem('melodiq_layout_override') || '');
    const [cardSize, setCardSize] = useState(localStorage.getItem('melodiq_card_size') || 'small');
    const [customTarget, setCustomTarget] = useState(() => {
        const stored = localStorage.getItem('melodiq_custom_target_columns');
        return stored ? parseInt(stored) : 6;
    });

    // Volume Settings
    // Volume Settings
    const [songVolume, setSongVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_song_volume');
        return stored ? parseFloat(stored) : 0.7;
    });
    const [masterVolume, setMasterVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_master_volume');
        return stored ? parseFloat(stored) : 1.0;
    });

    // WebRTC Context
    const { peers: connectedPreviewPeers, activePeers, inactivePeers, togglePeerActive } = useWebRTC();

    // Color Picker State

    // Color Picker State
    const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    // --- Library Management ---
    const [libraries, setLibraries] = useState<Array<import('./db').Library>>([]);
    const [loadingLibraries, setLoadingLibraries] = useState(true);
    const [activeImportId, setActiveImportId] = useState<string | null>(null);
    const [importStats, setImportStats] = useState<ImportStats | null>(null);
    const [libraryLogs, setLibraryLogs] = useState<string[]>([]); // Current logs being viewed or generated
    const [viewingLogLibraryId, setViewingLogLibraryId] = useState<string | null>(null); // Library ID for the log dialog
    const [showLogDialog, setShowLogDialog] = useState(false);

    // Fallback Import State (Firefox / Non-FSA)
    const fallbackInputRef = React.useRef<HTMLInputElement>(null);
    const [fallbackAction, setFallbackAction] = useState<{ type: 'add' | 'reload', libId?: string } | null>(null);

    // Load Libraries
    useEffect(() => {
        const fetchLibs = async () => {
            const libs = await db.libraries.toArray();
            setLibraries(libs);
            setLoadingLibraries(false);
        };
        fetchLibs();
    }, [activeImportId]); // Reload when import status changes

    const handleAddLibrary = async () => {
        try {
            // @ts-ignore
            if (window.showDirectoryPicker) {
                // @ts-ignore
                const dirHandle = await window.showDirectoryPicker();
                const libId = crypto.randomUUID();
                const newLib: import('./db').Library = {
                    id: libId,
                    name: dirHandle.name,
                    handle: dirHandle,
                    logs: [],
                    stats: { totalFound: 0, processed: 0, cached: 0, removed: 0, errors: 0 }
                };

                // Save initial library entry
                await db.libraries.add(newLib);
                setLibraries(prev => [...prev, newLib]);

                // Start Import
                await runLibraryImport(newLib);
            } else {
                // Fallback for Firefox
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

        // Determine Library Name (root folder name of first file)
        const firstFile = files[0];
        const pathParts = firstFile.webkitRelativePath?.split('/');
        const rootName = pathParts && pathParts.length > 0 ? pathParts[0] : 'Imported Folder';

        let targetLibId = fallbackAction?.libId;
        let libName = rootName;

        if (fallbackAction?.type === 'add') {
            targetLibId = crypto.randomUUID();
            const newLib: import('./db').Library = {
                id: targetLibId,
                name: libName,
                handle: null as any, // No handle for fallback
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

            // Update Library in DB on completion
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
            // Clear input value so same dir can be selected again
            if (fallbackInputRef.current) fallbackInputRef.current.value = '';
            // Refresh libraries
            const updatedLibs = await db.libraries.toArray();
            setLibraries(updatedLibs);
        }
    };

    const runLibraryImport = async (lib: import('./db').Library) => {
        setActiveImportId(lib.id);
        const importer = new MelodiqImporter();
        const logs: string[] = [];
        let finalStats: ImportStats | null = null;

        try {
            // Check for manifest
            const hasManifest = await importer.checkManifest(lib.handle);

            const onProgress = (stats: ImportStats) => {
                finalStats = { ...stats };
                setImportStats({ ...stats });
                // Update DB periodically or at end? Doing at end to save writes, but live UI needs state
            };

            const onLog = (msg: string) => {
                logs.push(msg);
                // If we are viewing logs for THIS library, update UI
                if (viewingLogLibraryId === lib.id) {
                    setLibraryLogs(prev => [...prev, msg]);
                }
            };

            if (hasManifest) {
                await importer.importFromManifest(lib.handle, onProgress, onLog, lib.id);
            } else {
                await importer.scanAndGenerateManifest(lib.handle, onProgress, onLog, lib.id);
            }

            // Update Library in DB on completion
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
            // Refresh libraries to show updated stats/time
            const updatedLibs = await db.libraries.toArray();
            setLibraries(updatedLibs);
        }
    };

    const handleReloadLibrary = async (lib: import('./db').Library) => {
        if (!lib.handle) {
            // Fallback reload -> trigger file picker again
            alert(`For this folder, you must re-select it to reload because your browser does not support persistent access.`);
            setFallbackAction({ type: 'reload', libId: lib.id });
            fallbackInputRef.current?.click();
            return;
        }

        // Verify permission (browser requires user gesture sometimes, might need re-request)
        // Since we are clicking a button, we are in a trusted event.
        // However, persistent permissions might need verification.
        try {
            // Simple check: try to read access
            // @ts-ignore
            await lib.handle.queryPermission({ mode: 'read' });
            // If prompt needed, request it?
            // @ts-ignore
            if ((await lib.handle.queryPermission({ mode: 'read' })) !== 'granted') {
                // @ts-ignore
                if ((await lib.handle.requestPermission({ mode: 'read' })) !== 'granted') {
                    throw new Error("Permission denied");
                }
            }

            // Setup UI for logs if we want to see them live?
            // Set viewing logs to this lib so we can see progress if dialog is open?
            // Or just let it run in background with progress bar on the card?
            setLibraryLogs([]); // Clear previous local logs if we were viewing them
            await runLibraryImport(lib);

        } catch (e) {
            alert(`Could not access folder "${lib.name}". You may need to re-add it or grant permissions.`);
            console.error(e);
        }
    };

    const handleDeleteLibrary = async (libId: string) => {
        if (confirm("Are you sure? This will remove the folder from the list and delete all its songs from the database.")) {
            // Delete songs
            await db.songs.where('libraryId').equals(libId).delete();
            await db.songsContent.where('id').anyOf(await db.songs.where('libraryId').equals(libId).primaryKeys()).delete();
            // Ideally we filter songsContent by ID matching songs... but Dexie delete by index is simpler.
            // Wait, songsContent ID matches Library song ID. 
            // We first need the IDs.
            const ids = await db.songs.where('libraryId').equals(libId).primaryKeys();
            await db.songsContent.bulkDelete(ids);
            await db.songs.bulkDelete(ids);

            // Delete library
            await db.libraries.delete(libId);
            setLibraries(prev => prev.filter(l => l.id !== libId));
        }
    };

    const handleViewLogs = (lib: import('./db').Library) => {
        setLibraryLogs(lib.logs || []);
        setViewingLogLibraryId(lib.id);
        setShowLogDialog(true);
    };

    const handleCloseLogs = () => {
        setShowLogDialog(false);
        setViewingLogLibraryId(null);
        setLibraryLogs([]);
    };

    const handleColorClick = (event: React.MouseEvent<HTMLElement>, profileId: string) => {
        setEditingProfileId(profileId);
        setColorAnchorEl(event.currentTarget);
    };

    const handleColorClose = () => {
        setColorAnchorEl(null);
        setEditingProfileId(null);
    };

    // Player Settings Popover
    const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(null);
    const [settingsProfileId, setSettingsProfileId] = useState<string | null>(null);

    const handleSettingsClick = (event: React.MouseEvent<HTMLElement>, profileId: string) => {
        setSettingsProfileId(profileId);
        setSettingsAnchorEl(event.currentTarget);
    };

    const handleSettingsClose = () => {
        setSettingsAnchorEl(null);
        setSettingsProfileId(null);
    };

    // Device Refresh Logic
    const refreshDevices = async () => {
        setLoadingDevices(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const devs = await MicrophoneManager.getDevices();
            setDevices(devs);
            setLoadingDevices(false);
            stream.getTracks().forEach(t => t.stop());
        } catch (err) {
            console.error('Failed to get permissions:', err);
            setLoadingDevices(false);
        }
    };

    // Initialize: Load Devices
    useEffect(() => {
        MicrophoneManager.getDevices().then(devs => {
            setDevices(devs);
            setLoadingDevices(false);
        });
    }, []);

    // Save Logic
    const handleSave = () => {
        localStorage.setItem('melodiq_profiles', JSON.stringify(profiles));
        localStorage.setItem('melodiq_active_session', JSON.stringify(activePlayers));

        localStorage.setItem('melodiq_show_overlay', String(showDebugOverlay));
        localStorage.setItem('melodiq_show_slider', String(showDevSlider));
        localStorage.setItem('melodiq_show_mic_status', String(showMicStatus));
        localStorage.setItem('melodiq_show_note_labels', String(showNoteLabels));
        localStorage.setItem('melodiq_show_video_errors', String(showVideoErrors));
        localStorage.setItem('melodiq_layout_override', layoutOverride);
        localStorage.setItem('melodiq_card_size', cardSize);
        localStorage.setItem('melodiq_custom_target_columns', String(customTarget));

        localStorage.setItem('melodiq_song_volume', String(songVolume));
        localStorage.setItem('melodiq_master_volume', String(masterVolume));

        // Save WebRTC settings - NOT NEEDED here anymore, handled by Context/Connection page
        // But we DO need to ensure partyId is preserved if we ever re-init? 
        // Actually Context handles persistence.

        onBack();
    };

    // --- Profile Management ---
    const addProfile = () => {
        const newProfile: UserProfile = {
            id: crypto.randomUUID(),
            name: `Player ${profiles.length + 1}`,
            hue: COLOR_PRESETS[profiles.length % COLOR_PRESETS.length].hue
        };
        setProfiles([...profiles, newProfile]);
    };

    const updateProfile = (id: string, updates: Partial<UserProfile>) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const deleteProfile = (id: string) => {
        setProfiles(profiles.filter(p => p.id !== id));
        setActivePlayers(activePlayers.filter(ap => ap.profileId !== id));
    };

    // --- Session Selection ---
    const toggleActivePlayer = (profileId: string) => {
        if (activePlayers.some(ap => ap.profileId === profileId)) {
            // Remove
            setActivePlayers(activePlayers.filter(ap => ap.profileId !== profileId));
        } else {
            // Add (Initialize with empty device or first available)
            const usedDevices = activePlayers.map(ap => ap.deviceId).filter(Boolean);
            const nextDevice = devices.find(d => !usedDevices.includes(d.deviceId))?.deviceId || '';

            setActivePlayers([...activePlayers, {
                profileId,
                deviceId: nextDevice,
                volume: 0.8,
                muted: true,
                latency: 0
            }]);
        }
    };

    const moveActivePlayer = (index: number, direction: 'up' | 'down') => {
        const newActive = [...activePlayers];
        if (direction === 'up' && index > 0) {
            [newActive[index], newActive[index - 1]] = [newActive[index - 1], newActive[index]];
        } else if (direction === 'down' && index < newActive.length - 1) {
            [newActive[index], newActive[index + 1]] = [newActive[index + 1], newActive[index]];
        }
        setActivePlayers(newActive);
    };

    const updateActivePlayerConfig = (profileId: string, updates: Partial<ActivePlayer>) => {
        setActivePlayers(activePlayers.map(ap => ap.profileId === profileId ? { ...ap, ...updates } : ap));
    };

    // --- WebRTC Remote Microphones ---



    // Render Helper
    // Helper removed in favor of Popover logic

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
                <Typography variant="h4">Settings</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* 1. Song Libraries */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Song Libraries</Typography>
                        {/* Fallback Input for Non-FSA Browsers */}
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
                                                {/* @ts-ignore */}
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

                                    {/* Active Progress Bar for this Library */}
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
                </Box>

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
                        {/* Auto-scroll anchor */}
                        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseLogs}>Close</Button>
                    </DialogActions>
                </Dialog>

                <Divider />

                {/* 2. Session Setup */}
                <Box>
                    <Typography variant="h6" gutterBottom>Session Setup</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select who is playing today. Drag (Use arrows) to reorder priority/position.
                    </Typography>

                    <Button variant="outlined" size="small" onClick={refreshDevices} sx={{ mb: 2 }}>
                        Refresh Devices
                    </Button>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {profiles.length === 0 && <Typography>No profiles found.</Typography>}

                        {/* Active Roster */}
                        <Typography variant="subtitle2">Active Roster (Ordered)</Typography>
                        {activePlayers.map((ap, index) => {
                            const profile = profiles.find(p => p.id === ap.profileId);
                            if (!profile) return null;
                            return (
                                <Box key={ap.profileId} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <IconButton size="small" onClick={() => moveActivePlayer(index, 'up')} disabled={index === 0}>
                                            <Typography variant="caption">▲</Typography>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => moveActivePlayer(index, 'down')} disabled={index === activePlayers.length - 1}>
                                            <Typography variant="caption">▼</Typography>
                                        </IconButton>
                                    </Box>

                                    <Avatar sx={{ bgcolor: `hsl(${profile.hue}, 100%, 50%)`, width: 32, height: 32 }}>{profile.name[0]}</Avatar>
                                    <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{profile.name}</Typography>

                                    <Button
                                        size="small"
                                        onClick={() => {
                                            const newMuted = !(ap.muted ?? false);
                                            updateActivePlayerConfig(ap.profileId, { muted: newMuted });
                                        }}
                                        color={ap.muted ? "error" : "primary"}
                                        sx={{ minWidth: 40 }}
                                    >
                                        {ap.muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                                    </Button>

                                    <Slider
                                        size="small"
                                        value={typeof ap.volume === 'number' ? ap.volume * 100 : 80}
                                        min={0}
                                        max={100}
                                        onChange={(_, val) => updateActivePlayerConfig(ap.profileId, { volume: (val as number) / 100 })}
                                        sx={{ width: 80, mx: 2 }}
                                        disabled={ap.muted}
                                    />

                                    <FormControl sx={{ minWidth: 150 }} size="small">
                                        <Select
                                            value={loadingDevices ? 'loading' : (
                                                devices.some(d => d.deviceId === ap.deviceId) || connectedPreviewPeers.some(p => p.id === ap.deviceId)
                                                    ? ap.deviceId : ''
                                            )}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const isPhone = connectedPreviewPeers.some(p => p.id === val);
                                                updateActivePlayerConfig(ap.profileId, { deviceId: val, isRemote: isPhone });
                                            }}
                                            disabled={loadingDevices}
                                            displayEmpty
                                            variant="standard"
                                        >
                                            <MenuItem value=""><em>No Device</em></MenuItem>
                                            {loadingDevices && <MenuItem value="loading" disabled>Loading...</MenuItem>}
                                            {/* Local Devices */}
                                            {devices.map(d => (
                                                <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</MenuItem>
                                            ))}
                                            {/* Remote Devices (Phones) */}
                                            {connectedPreviewPeers.length > 0 && <Divider />}
                                            {connectedPreviewPeers.length > 0 && <MenuItem disabled><em>Phones</em></MenuItem>}
                                            {connectedPreviewPeers.map(p => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography>📱 {p.name}</Typography>
                                                        {p.hue && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: `hsl(${p.hue}, 100%, 50%)` }} />}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <IconButton size="small" onClick={(e) => handleSettingsClick(e, ap.profileId)}>
                                        <SettingsIcon fontSize="small" />
                                    </IconButton>

                                    <IconButton color="error" onClick={() => toggleActivePlayer(ap.profileId)}>
                                        <CloseIcon />
                                    </IconButton>
                                </Box>
                            );
                        })}


                        {/* Active Phones in Roster */}
                        {activePeers.map((peer) => (
                            <Box key={peer.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, bgcolor: 'rgba(100,100,255,0.05)' }}>
                                <Typography sx={{ width: 24, textAlign: 'center' }}>📱</Typography>
                                <Avatar sx={{ bgcolor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : 'grey', width: 32, height: 32 }}>{peer.name[0]}</Avatar>
                                <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{peer.name}</Typography>
                                <Chip label="Phone" size="small" variant="outlined" />
                                <IconButton color="error" onClick={() => togglePeerActive(peer.id)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        ))}

                        {/* Player Settings Popover */}
                        <Popover
                            open={Boolean(settingsAnchorEl)}
                            anchorEl={settingsAnchorEl}
                            onClose={handleSettingsClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'center',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'center',
                            }}
                        >
                            <Box sx={{ p: 2, minWidth: 250 }}>
                                <Typography variant="subtitle2" gutterBottom>Player Settings</Typography>

                                {(() => {
                                    const activeP = activePlayers.find(ap => ap.profileId === settingsProfileId);
                                    if (!activeP) return null;

                                    return (
                                        <Box>
                                            <Typography variant="caption" gutterBottom>Latency Compensation: {activeP.latency || 0}ms</Typography>
                                            <Slider
                                                size="small"
                                                value={activeP.latency || 0}
                                                min={0}
                                                max={500}
                                                step={10}
                                                onChange={(_, val) => updateActivePlayerConfig(settingsProfileId!, { latency: val as number })}
                                                valueLabelDisplay="auto"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Compensates for input delay.
                                            </Typography>

                                            <Divider sx={{ my: 1 }} />
                                            <LatencyCalibrator
                                                deviceId={activeP.deviceId}
                                                onComplete={(calibratedMs) => updateActivePlayerConfig(settingsProfileId!, { latency: calibratedMs })}
                                            />
                                        </Box>
                                    );
                                })()}
                            </Box>
                        </Popover>

                        {/* Available to Add */}
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>Available Profiles</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {profiles.filter(p => !activePlayers.some(ap => ap.profileId === p.id)).map(p => (
                                <Button
                                    key={p.id}
                                    variant="outlined"
                                    startIcon={<Typography sx={{ color: `hsl(${p.hue}, 100%, 50%)` }}>●</Typography>}
                                    onClick={() => toggleActivePlayer(p.id)}
                                >
                                    {p.name}
                                </Button>
                            ))}
                            {profiles.length === 0 && <Typography variant="caption">Create profiles above.</Typography>}

                            {/* Inactive Phones */}
                            {inactivePeers.map(peer => (
                                <Button
                                    key={peer.id}
                                    variant="outlined"
                                    startIcon={<Typography>📱</Typography>}
                                    onClick={() => togglePeerActive(peer.id)}
                                    sx={{ borderColor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : undefined }}
                                >
                                    {peer.name}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                </Box>

                <Divider />

                {/* 2. Manage User Profiles */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">User Profiles</Typography>
                        <Button startIcon={<PersonAddIcon />} variant="outlined" onClick={addProfile}>
                            New User
                        </Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {profiles.map(profile => (
                            <Box key={profile.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: `hsl(${profile.hue}, 100%, 50%)` }}>
                                    {profile.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        label="Name"
                                        value={profile.name}
                                        onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
                                        size="small"
                                        fullWidth
                                        variant="standard"
                                    />
                                    <Box
                                        onClick={(e) => handleColorClick(e, profile.id)}
                                        sx={{
                                            mt: 1,
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: `hsl(${profile.hue}, 100%, 50%)`,
                                            cursor: 'pointer',
                                            border: '2px solid white',
                                            boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'scale(1.1)' }
                                        }}
                                        title="Change Color"
                                    />
                                </Box>
                                <IconButton onClick={() => deleteProfile(profile.id)} color="error" disabled={profiles.length <= 1}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                </Box>



                {/* Debug & Layout */}
                <Box>
                    <Typography variant="h6" gutterBottom>Game Settings</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Layout Override (e.g. 1.2 or 2.2)"
                            helperText="Define rows and columns manually (e.g., '1.3' for 1 top, 3 bottom). Leave empty for auto."
                            value={layoutOverride}
                            onChange={(e) => setLayoutOverride(e.target.value)}
                            fullWidth
                            size="small"
                        />

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Card Size & Density</Typography>
                            <ToggleButtonGroup
                                value={cardSize}
                                exclusive
                                onChange={(_, newVal) => newVal && setCardSize(newVal)}
                                aria-label="card size"
                                size="small"
                                fullWidth
                            >
                                <ToggleButton value="small">Small</ToggleButton>
                                <ToggleButton value="medium">Medium</ToggleButton>
                                <ToggleButton value="large">Large</ToggleButton>
                                <ToggleButton value="custom">Custom</ToggleButton>
                            </ToggleButtonGroup>

                            {cardSize === 'custom' && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography gutterBottom>Max Items per Row (Large Screen): {customTarget}</Typography>
                                    <Slider
                                        value={customTarget}
                                        onChange={(_, val) => setCustomTarget(val as number)}
                                        min={1}
                                        max={12}
                                        step={1}
                                        marks
                                        valueLabelDisplay="auto"
                                        sx={{ width: '100%' }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                        Set the maximum number of songs in a row. The game will automatically adjust for smaller screens.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography gutterBottom>Song Volume: {Math.round(songVolume * 100)}%</Typography>
                            <Slider
                                value={songVolume * 100}
                                onChange={(_, val) => setSongVolume((val as number) / 100)}
                                min={0}
                                max={100}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                        <Box sx={{ mt: 1 }}>
                            <Typography gutterBottom>Master Volume: {Math.round(masterVolume * 100)}%</Typography>
                            <Slider
                                value={masterVolume * 100}
                                onChange={(_, val) => setMasterVolume((val as number) / 100)}
                                min={0}
                                max={100}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                        <FormControlLabel control={<Switch checked={showDebugOverlay} onChange={(e) => setShowDebugOverlay(e.target.checked)} />} label="Show Debug Overlay" />
                        <FormControlLabel control={<Switch checked={showDevSlider} onChange={(e) => setShowDevSlider(e.target.checked)} />} label="Show Tech/Dev Slider" />
                        <FormControlLabel control={<Switch checked={showMicStatus} onChange={(e) => setShowMicStatus(e.target.checked)} />} label="Show Mic Status" />
                        <FormControlLabel control={<Switch checked={showNoteLabels} onChange={(e) => setShowNoteLabels(e.target.checked)} />} label="Show Pitch Note Labels" />
                        <FormControlLabel control={<Switch checked={showVideoErrors} onChange={(e) => setShowVideoErrors(e.target.checked)} />} label="Show Video Error Messages" />



                    </Box>
                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="large" onClick={handleSave}>Save & Back</Button>
                </Box>

                <Popover
                    open={Boolean(colorAnchorEl)}
                    anchorEl={colorAnchorEl}
                    onClose={handleColorClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', minWidth: 200 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>Pick Color</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: editingProfileId ? `hsl(${profiles.find(p => p.id === editingProfileId)?.hue || 0}, 100%, 50%)` : 'grey',
                                    border: '1px solid rgba(255,255,255,0.3)'
                                }}
                            />
                            <Slider
                                value={editingProfileId ? profiles.find(p => p.id === editingProfileId)?.hue || 0 : 0}
                                min={0}
                                max={360}
                                onChange={(_, val) => {
                                    if (editingProfileId) {
                                        updateProfile(editingProfileId, { hue: val as number });
                                    }
                                }}
                                sx={{
                                    width: 200,
                                    // Rainbow Gradient Track
                                    '& .MuiSlider-track': {
                                        border: 'none',
                                        background: 'transparent' // Hide default track
                                    },
                                    '& .MuiSlider-rail': {
                                        opacity: 1,
                                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #00f 83%, #f00 100%)',
                                        height: 8,
                                        borderRadius: 4
                                    },
                                    '& .MuiSlider-thumb': {
                                        height: 20,
                                        width: 20,
                                        backgroundColor: '#fff',
                                        border: '2px solid currentColor',
                                        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                                            boxShadow: 'inherit',
                                        },
                                        '&:before': {
                                            display: 'none',
                                        },
                                    },
                                    // Force color of thumb to match the HSL value? 
                                    // Or simpler: just white thumb is fine.
                                    color: 'white'
                                }}
                            />
                        </Box>
                    </Box>
                </Popover>
            </Paper>
        </Container >
    );
};
