import React, { useState, useRef } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';

interface GameDropZoneProps {
  onFileSelect: (file: File) => Promise<void>;
  isImporting?: boolean;
}

export const GameDropZone: React.FC<GameDropZoneProps> = ({ onFileSelect, isImporting }) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await onFileSelect(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onFileSelect(files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        p: 3,
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        borderRadius: 3,
        bgcolor: isDragOver ? 'action.hover' : 'background.paper',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pcio,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {isImporting ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <CircularProgress size={36} />
          <Typography variant="body2">{t('games.tabletop.importing', 'Importiere Spiel...')}</Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
          <Typography variant="subtitle1" fontWeight={600}>
            {t('games.tabletop.dropzone_title', 'Spieldatei hier ablegen')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('games.tabletop.dropzone_formats', 'Unterstützt .pcio (PlayingCards.io) und Tabletop .json')}
          </Typography>
          <Button variant="outlined" size="small" sx={{ mt: 1 }}>
            {t('games.tabletop.choose_file', 'Datei auswählen')}
          </Button>
        </Box>
      )}
    </Box>
  );
};
