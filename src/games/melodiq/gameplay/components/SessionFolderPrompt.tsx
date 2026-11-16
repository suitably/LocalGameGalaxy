import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface SessionFolderPromptProps {
  artist: string;
  title: string;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onFolderInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExit: (forceHome?: boolean) => void;
}

/**
 * Full-screen gate before a session whose song needs folder access again. The GlobalHeader is
 * hidden during a session, so the back action stays here as a secondary button.
 */
export const SessionFolderPrompt: React.FC<SessionFolderPromptProps> = ({
  artist,
  title,
  folderInputRef,
  onFolderInputChange,
  onExit,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        minHeight: '100dvh',
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <Typography variant="h5" component="h1" sx={{ textAlign: 'center' }}>
        {artist} - {title}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 500, textAlign: 'center' }}>
        {t('melodiq.folder_prompt.body')}
      </Typography>
      <input
        ref={folderInputRef}
        type="file"
        {...{ webkitdirectory: '' }}
        style={{ display: 'none' }}
        onChange={onFolderInputChange}
      />
      <Button variant="contained" onClick={() => folderInputRef.current?.click()}>
        {t('melodiq.folder_prompt.select')}
      </Button>
      <Button variant="outlined" color="inherit" onClick={() => onExit(true)}>
        {t('common.back')}
      </Button>
    </Box>
  );
};
