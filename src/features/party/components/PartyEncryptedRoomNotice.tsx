import React, { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { partyMailbox } from '../logic/partyMailbox';

/**
 * Shown when this device hears an end-to-end encrypted room it has no key for: it typed the
 * room code (or opened a link without `key=`) instead of the host's invite link (ADR 0009).
 */
export const PartyEncryptedRoomNotice: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  const [lockedRoom, setLockedRoom] = useState<string | null>(null);

  useEffect(
    () =>
      partyMailbox.onLockedChannel((channelId) => {
        if (channelId === `party_${roomId}`) setLockedRoom(roomId);
      }),
    [roomId],
  );

  if (lockedRoom !== roomId) return null;
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      {t('party.encrypted_room_hint')}
    </Alert>
  );
};
