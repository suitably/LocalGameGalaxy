import React from 'react';
import { Stack, TextField, FormControlLabel, Checkbox, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PublishFormFieldsProps {
  authorName: string;
  onAuthorChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  licenseAgreed: boolean;
  onLicenseChange: (val: boolean) => void;
}

export const PublishFormFields: React.FC<PublishFormFieldsProps> = ({
  authorName,
  onAuthorChange,
  notes,
  onNotesChange,
  licenseAgreed,
  onLicenseChange,
}) => {
  const { t } = useTranslation();

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label={t('games.tabletop.publish_author', 'Dein Name / GitHub Handle')}
        value={authorName}
        onChange={(e) => onAuthorChange(e.target.value)}
        fullWidth
        required
      />
      <TextField
        label={t('games.tabletop.publish_notes', 'Hinweise für die Reviewer (optional)')}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        fullWidth
        multiline
        rows={2}
        placeholder="z. B. Spielregeln, Herkunft der Icons oder besondere Mechaniken"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={licenseAgreed}
            onChange={(e) => onLicenseChange(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Typography variant="body2">
            {t(
              'games.tabletop.publish_license_agree',
              'Ich stimme zu, dieses Spiel unter der Open-Source-Lizenz (MIT / CC0) für die LocalGameGalaxy-Community bereitzustellen.',
            )}
          </Typography>
        }
      />
    </Stack>
  );
};
