import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export interface SessionFolderPromptProps {
    artist: string;
    title: string;
    folderInputRef: React.RefObject<HTMLInputElement | null>;
    onFolderInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExit: (forceHome?: boolean) => void;
}

export const SessionFolderPrompt: React.FC<SessionFolderPromptProps> = ({
    artist,
    title,
    folderInputRef,
    onFolderInputChange,
    onExit
}) => {
    return (
        <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Typography variant="h5">{artist} - {title}</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 500, textAlign: 'center' }}>
                This song was imported without persistent file access.<br />To play, please select the same folder you imported from.
            </Typography>
            <input ref={folderInputRef} type="file" {...{ webkitdirectory: "" }} style={{ display: 'none' }} onChange={onFolderInputChange} />
            <Button variant="contained" onClick={() => folderInputRef.current?.click()}>Select Song Folder</Button>
            <Button variant="text" color="inherit" onClick={() => onExit(true)}>Go Back</Button>
        </Box>
    );
};
