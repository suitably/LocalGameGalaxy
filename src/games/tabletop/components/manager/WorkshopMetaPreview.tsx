import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface WorkshopMetaPreviewData {
  title: string;
  description: string;
  previewUrl: string;
  fileSize: number;
  tags?: string[] | Array<{ tag: string }>;
  subscriptions: number;
}

interface WorkshopMetaPreviewProps {
  meta: WorkshopMetaPreviewData;
}

export const WorkshopMetaPreview: React.FC<WorkshopMetaPreviewProps> = ({ meta }) => {
  const { t } = useTranslation();
  const sizeMb = (meta.fileSize / (1024 * 1024)).toFixed(1);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      {meta.previewUrl && (
        <Box
          component="img"
          src={meta.previewUrl}
          alt={meta.title}
          sx={{
            width: 100,
            height: 100,
            borderRadius: 1.5,
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      )}
      <Box flex={1} minWidth={0}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {meta.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxHeight: 40, overflow: 'hidden', mb: 0.5 }}
        >
          {meta.description?.slice(0, 150)}
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap">
          <Chip
            size="small"
            label={`${sizeMb} MB`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={t('games.tabletop.workshop_subs', '{{count}} Abos', {
              count: meta.subscriptions,
            })}
            variant="outlined"
          />
          {meta.tags?.slice(0, 3).map((item) => {
            const label = typeof item === 'string' ? item : item.tag;
            return <Chip key={label} size="small" label={label} />;
          })}
        </Box>
      </Box>
    </Box>
  );
};
