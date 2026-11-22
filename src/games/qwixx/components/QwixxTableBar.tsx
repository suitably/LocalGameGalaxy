/**
 * Scoreboard and "<name> fertig" for several sheets on one device [ID: GAME-QWIXX-TABLE-BAR]
 */
import React from 'react';
import { Box, Chip, Stack } from '@mui/material';
import { HandoverCover, SwitchPlayerButton } from '../../../modules/pass-and-play';
import type { useQwixxLocalTable } from '../useQwixxLocalTable';

type LocalTable = ReturnType<typeof useQwixxLocalTable>;

export const QwixxTableBar: React.FC<{ table: LocalTable }> = ({ table }) => {
  const { scores, activeId, players, handover } = table;
  if (scores.length < 2) return null;
  const current = scores.find((s) => s.id === activeId);
  const pick = (id: string) => {
    handover.startSwitch();
    handover.retarget(id);
  };
  return (
    <>
      <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="center" mb={1}>
        {scores.map((s) => (
          <Chip
            key={s.id}
            label={`${s.name} · ${s.total}`}
            color={s.id === activeId ? 'primary' : 'default'}
            variant={s.id === activeId ? 'filled' : 'outlined'}
            onClick={s.id === activeId ? undefined : () => pick(s.id)}
            sx={{ minHeight: 36, fontWeight: 700 }}
          />
        ))}
      </Stack>
      <Box
        sx={{
          position: 'sticky',
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'center',
          mt: 2,
          zIndex: 2,
        }}
      >
        <SwitchPlayerButton onClick={handover.startSwitch} currentName={current?.name} />
      </Box>
      {handover.coveredFor && (
        <HandoverCover
          player={handover.coveredFor}
          players={players}
          onReveal={handover.reveal}
          onRetarget={handover.retarget}
          onCancel={handover.cancel}
        />
      )}
    </>
  );
};
