/**
 * Draw pot home: `games/drawpot` [ID: DRAWPOT-HOME]
 *
 * Start a new pot, reopen pots this device hosts, and see every result this device drew.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { GameLayout } from '../../components/Layout/GameLayout';
import { loadHistory, loadHosted, removeHistory, removeHosted } from './logic/localStore';
import { PotList } from './components/PotList';

export const DrawPotGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('games.drawpot.title'));
  const navigate = useNavigate();
  const [hosted, setHosted] = useState(loadHosted);
  const [history, setHistory] = useState(loadHistory);
  const [now] = useState(Date.now);
  const fmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  return (
    <GameLayout maxWidth="sm">
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography color="text.secondary">{t('drawpot.home.intro')}</Typography>
        </Stack>
        <Button
          size="large"
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => navigate('/games/drawpot/new')}
          sx={{ py: 1.5, fontWeight: 800, borderRadius: 3 }}
        >
          {t('drawpot.home.create')}
        </Button>
        <PotList
          title={t('drawpot.home.hosted')}
          empty={t('drawpot.home.hostedEmpty')}
          items={hosted.map((p) => ({
            id: p.id,
            primary: p.title,
            secondary: t('drawpot.home.hostedMeta', {
              date: fmt.format(p.createdAt),
              expires: fmt.format(p.expiresAt),
            }),
            expired: p.expiresAt < now,
          }))}
          onOpen={(id) => navigate(`/games/drawpot/admin/${id}`)}
          onRemove={(id) => setHosted(removeHosted(id))}
          removeLabel={t('drawpot.home.forgetHosted')}
        />
        <PotList
          title={t('drawpot.home.history')}
          empty={t('drawpot.home.historyEmpty')}
          items={history.map((h) => ({
            id: h.potId,
            primary: h.title,
            secondary: h.draws.map((d) => d.label).join(', '),
            expired: false,
          }))}
          onOpen={(id) => navigate(`/games/drawpot/p/${id}`)}
          onRemove={(id) => setHistory(removeHistory(id))}
          removeLabel={t('drawpot.home.forgetHistory')}
        />
      </Stack>
    </GameLayout>
  );
};
