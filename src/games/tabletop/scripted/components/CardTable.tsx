/**
 * The table of a scripted card game for one viewer [ID: COMP-TABLETOP-SCRIPT-TABLE]
 *
 * A seat sees the table, its hand and its buttons (phone); without a seat it is the shared
 * table for the TV: everything public, larger, no hand.
 */
import React, { useEffect } from 'react';
import { alpha, Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { ScriptMove, ScriptView, SlotRef } from '../logic/scriptTypes';
import { playableAlone } from '../logic/selection';
import { useCardSelection } from '../hooks/useCardSelection';
import { useScriptText } from '../hooks/useScriptText';
import { HandFan } from './HandFan';
import { RoundSummaryPanel } from './RoundSummaryPanel';
import { SeatBadges } from './SeatBadges';
import { SlotGrid } from './SlotGrid';
import { TablePiles } from './TablePiles';

interface CardTableProps {
  view: ScriptView;
  names: string[];
  viewer: number | null;
  step: number;
  allowed: (move: ScriptMove) => boolean;
  onMove: (move: ScriptMove) => void;
  /** Shown instead of the hand on a table without a seat. */
  tableHint?: string;
}

export const CardTable: React.FC<CardTableProps> = ({
  view,
  names,
  viewer,
  step,
  allowed,
  onMove,
  tableHint,
}) => {
  const text = useScriptText(names);
  const selection = useCardSelection(view, step, allowed, onMove);
  const isTable = viewer === null;
  const myTurn = viewer !== null && view.active.includes(viewer);
  const mySlots = viewer === null ? undefined : view.seats[viewer]?.slots;
  const onSlot = (ref: SlotRef) => onMove({ kind: 'slot', ...ref });

  useEffect(() => {
    if (myTurn && typeof navigator !== 'undefined') navigator.vibrate?.(40);
  }, [myTurn]);

  const actions = (
    <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
      {view.select !== 'none' && (
        <Button variant="contained" disabled={!selection.canPlay} onClick={selection.play}>
          {view.playLabel ? text(view.playLabel) : ''}
        </Button>
      )}
      {view.actions.map((action) => (
        <Button
          key={`${action.id}:${action.arg ?? ''}`}
          variant={action.tone === 'primary' ? 'contained' : 'outlined'}
          color={action.tone === 'danger' ? 'error' : 'primary'}
          onClick={() => onMove({ kind: 'action', id: action.id, arg: action.arg })}
        >
          {text(action.label)}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1, flexShrink: 0, maxHeight: '34%', overflowY: 'auto' }}>
        <SeatBadges
          view={view}
          names={names}
          viewer={viewer}
          text={text}
          large={isTable}
          onSlot={isTable ? undefined : onSlot}
        />
      </Box>

      <Box
        sx={(theme) => ({
          flex: 1,
          minHeight: 0,
          mx: 1,
          borderRadius: 4,
          bgcolor: alpha(theme.palette.success.main, 0.14),
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          p: 1.5,
          overflowY: 'auto',
        })}
      >
        {view.info.length > 0 && (
          <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="center">
            {view.info.map((item, i) => (
              <Chip
                key={i}
                label={text(item)}
                size={isTable ? 'medium' : 'small'}
                color="primary"
              />
            ))}
          </Stack>
        )}
        {view.summary ? (
          <RoundSummaryPanel summary={view.summary} names={names} text={text} large={isTable} />
        ) : (
          <TablePiles
            piles={view.piles}
            names={names}
            targets={view.targets}
            target={selection.sel.target}
            onTarget={selection.tapTarget}
            text={text}
            cardWidth={isTable ? 104 : 64}
          />
        )}
        {myTurn && !view.summary && <Chip color="primary" label={text({ key: 'yourTurn' })} />}
        <Typography
          role="status"
          aria-live="polite"
          textAlign="center"
          fontWeight={800}
          sx={{ fontSize: isTable ? '1.6rem' : '1rem' }}
        >
          {text(view.status)}
        </Typography>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: 1,
          pt: 1,
          pb: 'calc(8px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {actions}
        {mySlots && viewer !== null && (
          <SlotGrid
            seat={viewer}
            slots={mySlots}
            columns={view.seats[viewer].slotColumns}
            targets={view.slotTargets}
            onTap={onSlot}
            width={64}
            text={text}
          />
        )}
        {isTable
          ? tableHint && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {tableHint}
              </Typography>
            )
          : view.hand.length > 0 && (
              <HandFan
                cards={view.hand}
                picked={selection.sel.cards}
                dimmed={(card) => view.select === 'one' && !playableAlone(card, view, allowed)}
                onTap={view.select === 'none' ? undefined : selection.tapCard}
              />
            )}
      </Box>
    </Box>
  );
};
