import { Button, IconButton, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import HomeIcon from '@mui/icons-material/HomeRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import { useTranslation } from 'react-i18next';
import { useHomeNavigation } from '../../../../components/Layout/useHomeNavigation';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';

/**
 * What the hidden app header offered, at the start of the stage's top bar: home, and the song
 * title that opens the song picker.
 */
export function ImmersiveSong({ title, onPick }: { title: string; onPick: () => void }) {
  const { t } = useTranslation();
  const goHome = useHomeNavigation(null, false);
  return (
    <>
      <Tooltip title={t('common.home', 'Home')}>
        <IconButton
          aria-label={t('common.home', 'Home')}
          onClick={goHome}
          sx={{ width: TOUCH_TARGET, height: TOUCH_TARGET }}
        >
          <HomeIcon />
        </IconButton>
      </Tooltip>
      <Button
        color="inherit"
        startIcon={<MusicNoteIcon />}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="dialog"
        aria-label={`${t('games.melodiq_notes.stage.song_pick')}: ${title}`}
        onClick={onPick}
        sx={{ minHeight: TOUCH_TARGET, textTransform: 'none', fontWeight: 700 }}
      >
        <Typography component="span" variant="inherit" noWrap sx={{ maxWidth: '28vw' }}>
          {title}
        </Typography>
      </Button>
    </>
  );
}
