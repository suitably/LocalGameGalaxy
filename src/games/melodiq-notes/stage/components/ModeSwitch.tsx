import { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { StageEngine } from '../engine/StageEngine';
import type { StageMode } from '../engine/types';

const MODES: StageMode[] = ['learn', 'practice', 'perform'];

/** Learn, practise or perform: three buttons, or one menu button where a phone has no room. */
export function ModeSwitch({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const narrow = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // learn mode waits for its player: for practising alone
  const locked = (m: StageMode) => m === 'learn' && engine.players.length > 1;

  if (narrow)
    return (
      <>
        <Button
          variant="outlined"
          color="inherit"
          endIcon={<ExpandMoreIcon />}
          aria-haspopup="menu"
          aria-label={`${k('mode')}: ${k(`modes.${engine.mode}`)}`}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ minHeight: TOUCH_TARGET, textTransform: 'none' }}
        >
          {k(`modes.${engine.mode}`)}
        </Button>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          {MODES.map((m) => (
            <MenuItem
              key={m}
              selected={m === engine.mode}
              disabled={locked(m)}
              onClick={() => {
                engine.setMode(m);
                setAnchor(null);
              }}
            >
              {k(`modes.${m}`)}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  return (
    <ToggleButtonGroup
      exclusive
      value={engine.mode}
      aria-label={k('mode')}
      onChange={(_, v: StageMode | null) => v && engine.setMode(v)}
      sx={{ '& .MuiToggleButton-root': { minHeight: TOUCH_TARGET, px: 1.5 } }}
    >
      {MODES.map((m) => (
        <ToggleButton
          key={m}
          value={m}
          disabled={locked(m)}
          title={locked(m) ? k('learn_solo') : undefined}
        >
          {k(`modes.${m}`)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
