import { alpha, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { nothingLeftToPlay } from '../engine/transport';
import { useStageLive } from '../useStage';

/** Once no player has notes left, skips the rest of the song (an outro) straight to the results. */
export function SkipToEndButton({ engine, floating }: { engine: StageEngine; floating?: boolean }) {
  useStageLive(engine);
  const { t } = useTranslation();
  if (!nothingLeftToPlay(engine)) return null;
  return (
    <Button
      variant={floating ? 'contained' : 'outlined'}
      size={floating ? 'medium' : 'large'}
      onClick={() => engine.skipToEnd()}
      sx={
        floating
          ? {
              position: 'absolute',
              // below the canvas header, clear of the fullscreen controls at the bottom
              top: 40,
              right: 12,
              minHeight: 44,
              boxShadow: (theme) => `0 2px 12px ${alpha(theme.palette.common.black, 0.4)}`,
            }
          : undefined
      }
    >
      {t('games.melodiq_notes.stage.skip_to_end')}
    </Button>
  );
}
