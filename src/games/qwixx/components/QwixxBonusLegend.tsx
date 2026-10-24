import React from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/ShieldRounded';
import AddCircleIcon from '@mui/icons-material/AddCircleRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useTranslation } from 'react-i18next';

interface LegendItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ icon, title, description }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      p: 0.75,
      borderRadius: 2,
      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
    }}
  >
    <Box sx={{ display: 'flex', mt: 0.2 }}>{icon}</Box>
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.primary', fontWeight: 'bold', display: 'block' }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block' }}
      >
        {description}
      </Typography>
    </Box>
  </Box>
);

const PartnerDots: React.FC = () => {
  const { palette } = useTheme();
  const dot = (color: string) => (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: color,
        border: `1px solid ${palette.text.primary}`,
      }}
    />
  );
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {dot(palette.piece.yellow)}
        {dot(palette.piece.blue)}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {dot(palette.piece.red)}
        {dot(palette.piece.green)}
      </Box>
    </Box>
  );
};

/** Legend of the bonus-icon effects plus the active-shield counter (bonus sheet only). */
export const QwixxBonusLegend: React.FC<{ shields?: number }> = ({ shields }) => {
  const { t } = useTranslation();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: 'primary.main',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: '1.1rem' }} />
          {t('games.qwixx.bonus_legend_title', 'Bonus-Symbole & Effekte')}
        </Typography>
        {shields !== undefined && (
          <Chip
            icon={<ShieldIcon sx={{ color: 'primary.main !important' }} />}
            label={`${t('games.qwixx.active_shields', 'Aktive Schutzschilde')}: ${shields}`}
            size="small"
            variant="outlined"
            sx={{
              color: shields > 0 ? 'primary.main' : 'text.secondary',
              borderColor: shields > 0 ? 'primary.main' : 'divider',
              fontWeight: 'bold',
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          gap: 1,
        }}
      >
        <LegendItem
          icon={<ShieldIcon sx={{ color: 'primary.main', fontSize: '1.4rem' }} />}
          title={t('games.qwixx.bonus_shield_title', 'Schutzschild')}
          description={t(
            'games.qwixx.bonus_shield_desc',
            'Fängt den nächsten Fehlwurf automatisch ab (-5 Pkt vermieden).',
          )}
        />
        <LegendItem
          icon={
            <Box
              sx={{
                bgcolor: 'success.main',
                color: 'success.contrastText',
                borderRadius: '50%',
                p: 0.2,
                display: 'flex',
              }}
            >
              <AddCircleIcon sx={{ fontSize: '1rem' }} />
            </Box>
          }
          title={t('games.qwixx.bonus_self_title', 'Sofort-Kreuz')}
          description={t(
            'games.qwixx.bonus_self_desc',
            'Setzt sofort das nächste freie Kreuz in dieser Reihe.',
          )}
        />
        <LegendItem
          icon={<PartnerDots />}
          title={t('games.qwixx.bonus_partner_title', 'Partner-Kreuz')}
          description={t(
            'games.qwixx.bonus_partner_desc',
            'Setzt sofort ein Kreuz in der Zielfarbe (Rot 8➔Gelb, Gelb 3➔Blau, Grün 5➔Rot, Blau 11➔Grün).',
          )}
        />
      </Box>
    </Paper>
  );
};
