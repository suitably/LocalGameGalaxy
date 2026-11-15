/**
 * Table button that runs its routine [ID: COMP-TABLETOP-BUTTON-VIEW]
 *
 * An imported TTS button whose click function the Lua translator could not map (`untranslated`,
 * no routine) stays visible but inert, with a tooltip naming the function (#704).
 */
import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ButtonWidget } from '../../logic/types';

interface ButtonWidgetViewProps {
  widget: ButtonWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onRun: () => void;
}

export const ButtonWidgetView: React.FC<ButtonWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
  onRun,
}) => {
  const { t } = useTranslation();
  const inert = Boolean(widget.untranslated) && widget.routine.length === 0;
  const view = (
    <Box
      role="button"
      aria-disabled={inert || undefined}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (!inert) onRun();
      }}
      style={{ left: widget.x, top: widget.y }}
      sx={{
        position: 'absolute',
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex + (isDragging ? 100 : 0),
        bgcolor: widget.color || 'primary.main',
        color: 'common.white',
        borderRadius: 2,
        boxShadow: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: Math.max(12, Math.min(widget.height / 2.5, 24)),
        px: 1,
        cursor: inert ? 'help' : 'pointer',
        opacity: inert ? 0.55 : 1,
        userSelect: 'none',
        transition: 'transform 0.1s',
        '&:active': { transform: inert ? 'none' : 'scale(0.96)' },
      }}
    >
      {widget.text}
    </Box>
  );
  if (!inert) return view;
  return (
    <Tooltip
      title={t('games.tabletop.import_report.button_untranslated', { fn: widget.untranslated })}
      enterTouchDelay={0}
    >
      {view}
    </Tooltip>
  );
};
