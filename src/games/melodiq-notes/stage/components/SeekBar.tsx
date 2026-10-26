import { useState } from 'react';
import { Button, ButtonGroup, ListSubheader, Menu, MenuItem, Slider, Tooltip } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDownRounded';
import SkipPreviousIcon from '@mui/icons-material/SkipPreviousRounded';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { StageEngine } from '../engine/StageEngine';
import { useStageLive } from '../useStage';
import { beatFromFraction, fractionOfBeat, LEAD_IN_OPTIONS_SEC, parseLeadIn } from '../logic/seek';
import { overlayContainer } from './overlayContainer';

const STEPS = 1000;

/** Timeline like a video player: drag or click the bar to seek. */
export function SeekBar({ engine }: { engine: StageEngine }) {
  useStageLive(engine);
  const { t } = useTranslation();
  const [dragging, setDragging] = useState<number | null>(null);
  const song = engine.song;
  if (!song || !engine.players.length) return null;
  const shown = dragging ?? Math.round(fractionOfBeat(engine.beat, song.end) * STEPS);
  return (
    <Slider
      size="small"
      aria-label={t('games.melodiq_notes.stage.timeline')}
      min={0}
      max={STEPS}
      value={shown}
      sx={{ flex: '1 1 160px', minWidth: 120, mx: 1 }}
      onChange={(_, v) => setDragging(v as number)}
      onChangeCommitted={(_, v) => {
        setDragging(null);
        engine.seekTo(beatFromFraction((v as number) / STEPS, song.end));
      }}
    />
  );
}

/** Jumps to the first note with a lead-in; the lead-in (0–10 s) is chosen in the attached menu. */
export function FirstNoteButton({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [leadIn, setLeadIn] = useState(() =>
    parseLeadIn(storage.get(STORAGE_KEYS.MELODIQ_NOTES_SEEK_LEAD_IN)),
  );
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!engine.song || !engine.players.length) return null;
  return (
    <>
      <ButtonGroup variant="text" color="inherit">
        <Tooltip title={`${k('first_note')} · ${k('lead_in_seconds', { count: leadIn })}`}>
          <Button
            aria-label={k('first_note')}
            onClick={() => engine.jumpToFirstNote(leadIn)}
            sx={{ minHeight: TOUCH_TARGET, minWidth: 44 }}
          >
            <SkipPreviousIcon />
          </Button>
        </Tooltip>
        <Button
          aria-label={k('lead_in')}
          aria-haspopup="menu"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ minWidth: 28, px: 0 }}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Menu
        container={overlayContainer}
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
      >
        <ListSubheader>{k('lead_in')}</ListSubheader>
        {LEAD_IN_OPTIONS_SEC.map((s) => (
          <MenuItem
            key={s}
            selected={s === leadIn}
            onClick={() => {
              setLeadIn(s);
              storage.set(STORAGE_KEYS.MELODIQ_NOTES_SEEK_LEAD_IN, String(s));
              setAnchor(null);
            }}
          >
            {k('lead_in_seconds', { count: s })}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
