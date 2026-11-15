/**
 * Source, author and rights notice of a Workshop import (#702, TTS plan D4)
 * [ID: GAME-TABLETOP-WORKSHOP-RIGHTS]
 */
import React from 'react';
import { Alert, AlertTitle, Link, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface WorkshopRightsNoticeProps {
  /** Workshop item id and creator; absent for a file upload (notice only). */
  workshopId?: string;
  creatorId?: string;
}

const workshopItemUrl = (id: string) =>
  `https://steamcommunity.com/sharedfiles/filedetails/?id=${encodeURIComponent(id)}`;

const steamProfileUrl = (id: string) =>
  `https://steamcommunity.com/profiles/${encodeURIComponent(id)}`;

export const WorkshopRightsNotice: React.FC<WorkshopRightsNoticeProps> = ({
  workshopId,
  creatorId,
}) => {
  const { t } = useTranslation();
  const linkProps = { target: '_blank', rel: 'noopener noreferrer' } as const;

  return (
    <Alert severity="info" data-testid="tabletop-workshop-rights">
      <AlertTitle>{t('games.tabletop.workshop.rights_title')}</AlertTitle>
      {workshopId && (
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {t('games.tabletop.workshop.rights_source')}:{' '}
          <Link href={workshopItemUrl(workshopId)} {...linkProps}>
            {workshopItemUrl(workshopId)}
          </Link>
        </Typography>
      )}
      {creatorId && (
        <Typography variant="body2">
          {t('games.tabletop.workshop.rights_author')}:{' '}
          <Link href={steamProfileUrl(creatorId)} {...linkProps}>
            {t('games.tabletop.workshop.rights_author_profile', { id: creatorId })}
          </Link>
        </Typography>
      )}
      <Typography variant="body2" sx={{ mt: workshopId || creatorId ? 1 : 0 }}>
        {t('games.tabletop.workshop.rights_notice')}
      </Typography>
    </Alert>
  );
};
