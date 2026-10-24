import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownloadRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useTranslation } from 'react-i18next';

export interface SongCardStatusProps {
  hasUsdbId: boolean;
  onActionClick?: (e: React.MouseEvent) => void;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  downloadProgress?: number;
  hasActiveJob?: boolean;
  activeJobType?: string;
}

const cornerSx = {
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  alignItems: 'center',
  bgcolor: 'action.disabledBackground',
  p: 0.5,
  borderRadius: 2,
} as const;

/** Corner icon overlay for a song card (download / AI job / downloaded / downloadable). */
export const SongCardCorner: React.FC<SongCardStatusProps> = ({
  hasUsdbId,
  onActionClick,
  isDownloading,
  isDownloaded,
  downloadProgress,
  hasActiveJob,
  activeJobType,
}) => {
  if (isDownloading) {
    return (
      <Box sx={cornerSx}>
        <CloudDownloadIcon sx={{ color: 'text.primary', fontSize: 20 }} />
      </Box>
    );
  }
  if (hasActiveJob && (activeJobType === 'full-sync' || activeJobType === 'separate')) {
    return (
      <Box sx={{ ...cornerSx, gap: 0.5, px: 0.75, py: 0.25, borderRadius: 2, zIndex: 2 }}>
        <AutoAwesomeIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}
        >
          {downloadProgress !== undefined && downloadProgress > 0 ? `${downloadProgress}%` : ''}
        </Typography>
      </Box>
    );
  }
  if (isDownloaded && !hasActiveJob) {
    return (
      <Box sx={cornerSx}>
        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
      </Box>
    );
  }
  if (!isDownloaded && !hasActiveJob && hasUsdbId && onActionClick) {
    return (
      <Box sx={cornerSx} onClick={onActionClick}>
        <CloudDownloadIcon sx={{ color: 'primary.main', fontSize: 20 }} />
      </Box>
    );
  }
  return null;
};

/** Progress label + bar while a download or background job is running. */
export const SongCardProgress: React.FC<
  Pick<SongCardStatusProps, 'isDownloading' | 'downloadProgress' | 'activeJobType'>
> = ({ isDownloading, downloadProgress, activeJobType }) => {
  const { t } = useTranslation();
  const isAiJob = activeJobType === 'full-sync' || activeJobType === 'separate';
  let label: string;
  if (activeJobType === 'full-sync') label = t('melodiq.ai_sync_active', 'KI-Sync...');
  else if (activeJobType === 'separate')
    label = t('melodiq.vocal_separation_active', 'Vokaltrennung...');
  else if (isDownloading) label = t('melodiq.downloading', 'Downloading...');
  else label = t('melodiq.processing', 'Processing...');

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color={isAiJob ? 'secondary.main' : 'primary'}>
        {downloadProgress}% {label}
      </Typography>
      <LinearProgress
        color={isAiJob ? 'secondary' : 'primary'}
        variant={
          downloadProgress !== undefined && downloadProgress > 0 ? 'determinate' : 'indeterminate'
        }
        value={downloadProgress}
        sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
      />
    </Box>
  );
};
