import React from 'react';
import { alpha, IconButton } from '@mui/material';
import MicIcon from '@mui/icons-material/MicRounded';
import MicNoneIcon from '@mui/icons-material/MicNoneRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';

interface PartMicButtonProps {
  /** Lane colour of the part (duet blue / pink, solo teal). */
  color: string;
  /** This phone sings the part. */
  active: boolean;
  partName: string;
  onClick: () => void;
}

/** Mic in a lyrics lane: tap to sing that part, or to join the song as a spectator. */
export const PartMicButton: React.FC<PartMicButtonProps> = ({
  color,
  active,
  partName,
  onClick,
}) => {
  const { t } = useTranslation();
  const label = t(active ? 'melodiq.singing_part' : 'melodiq.sing_part', { part: partName });
  return (
    <IconButton
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      sx={{
        width: TOUCH_TARGET,
        height: TOUCH_TARGET,
        flexShrink: 0,
        pointerEvents: 'auto',
        color: active ? 'common.black' : color,
        bgcolor: active ? color : alpha(color, 0.12),
        border: 2,
        borderColor: color,
        '&:hover': { bgcolor: active ? color : alpha(color, 0.24) },
      }}
    >
      {active ? <MicIcon /> : <MicNoneIcon />}
    </IconButton>
  );
};
