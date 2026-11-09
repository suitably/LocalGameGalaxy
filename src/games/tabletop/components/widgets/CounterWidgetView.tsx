import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import RemoveIcon from '@mui/icons-material/RemoveRounded';
import { useTranslation } from 'react-i18next';
import type { CounterWidget } from '../../logic/types';

interface CounterWidgetViewProps {
  widget: CounterWidget;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

export const CounterWidgetView: React.FC<CounterWidgetViewProps> = ({
  widget,
  onIncrement,
  onDecrement,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      style={{ left: widget.x, top: widget.y }}
      sx={{
        position: 'absolute',
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 0.25,
        p: 0.25,
        border: '1.5px solid',
        borderColor: 'divider',
        userSelect: 'none',
      }}
    >
      <IconButton
        size="small"
        onClick={onDecrement}
        color="primary"
        sx={{ p: 0.5, flexShrink: 0 }}
        aria-label={t('games.tabletop.counterDecrement', 'Verringern')}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Box textAlign="center" sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.1 }}>
          {widget.value}
        </Typography>
        {widget.label && (
          <Typography
            variant="caption"
            color="text.secondary"
            title={widget.label}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '0.75rem',
              lineHeight: 1.2,
            }}
          >
            {widget.label}
          </Typography>
        )}
      </Box>
      <IconButton
        size="small"
        onClick={onIncrement}
        color="primary"
        sx={{ p: 0.5, flexShrink: 0 }}
        aria-label={t('games.tabletop.counterIncrement', 'Erhöhen')}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};
