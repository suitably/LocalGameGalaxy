import React from 'react';
import {
    Stack,
    Button,
    Typography,
    Chip,
    CircularProgress,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from 'react-i18next';
import type { StoredFolderHandle } from '../types';

interface LocalLibraryPanelProps {
    storedFolders: StoredFolderHandle[];
    isSyncing: boolean;
    supportsDirectoryPicker: boolean;
    onSyncFolder: () => void;
    onResyncFolders: () => void;
    onFolderFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFolder: (folderId: string) => void;
}

export const LocalLibraryPanel: React.FC<LocalLibraryPanelProps> = ({
    storedFolders,
    isSyncing,
    supportsDirectoryPicker,
    onSyncFolder,
    onResyncFolders,
    onFolderFileInput,
    onRemoveFolder,
}) => {
    const { t } = useTranslation();

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {t('games.melodiq_notes.local_library')}
            </Typography>

            {/* Folder sync (native picker or webkitdirectory fallback) */}
            {supportsDirectoryPicker ? (
                <>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={isSyncing ? <CircularProgress size={14} /> : <FolderOpenIcon />}
                        disabled={isSyncing}
                        onClick={onSyncFolder}
                    >
                        {t('games.melodiq_notes.sync_folder')}
                    </Button>
                    {storedFolders.length > 0 && (
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<SyncIcon />}
                            disabled={isSyncing}
                            onClick={onResyncFolders}
                        >
                            {t('games.melodiq_notes.resync')}
                        </Button>
                    )}
                </>
            ) : (
                <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={isSyncing ? <CircularProgress size={14} /> : <FolderOpenIcon />}
                    disabled={isSyncing}
                >
                    {t('games.melodiq_notes.sync_folder')}
                    <input
                        type="file"
                        hidden
                        // @ts-expect-error – non-standard but widely supported attribute
                        webkitdirectory=""
                        multiple
                        onChange={onFolderFileInput}
                    />
                </Button>
            )}

            {/* Synced folder chips */}
            {storedFolders.map(folder => (
                <Chip
                    key={folder.id}
                    label={folder.name}
                    size="small"
                    onDelete={() => onRemoveFolder(folder.id)}
                    sx={{ maxWidth: 160 }}
                />
            ))}
        </Stack>
    );
};
