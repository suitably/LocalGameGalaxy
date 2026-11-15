/**
 * Which hint the participant page shows under the draw button [ID: DRAWPOT-PARTICIPANT-STATUS]
 */
import type { DrawPotPublicView, DrawRecord } from './api';

export interface ParticipantStatus {
  severity: 'info' | 'success' | 'warning';
  key: string;
  params?: Record<string, number>;
}

export function participantStatus(s: {
  pot: DrawPotPublicView | null;
  draws: DrawRecord[];
  santa: boolean;
}): ParticipantStatus | null {
  const { pot, draws, santa } = s;
  if (!pot) return null;
  if (santa && draws.length > 0)
    return { severity: 'success', key: 'drawpot.participant.santaDone' };
  if (pot.closed) return { severity: 'warning', key: 'drawpot.participant.closed' };
  if (pot.settings.removeDrawn && pot.remainingCount === 0)
    return { severity: 'info', key: 'drawpot.participant.empty' };
  if (pot.drawsLeft === 0) return { severity: 'info', key: 'drawpot.participant.noDrawsLeft' };
  if (pot.drawsLeft !== null && draws.length > 0)
    return {
      severity: 'info',
      key: 'drawpot.participant.drawsLeft',
      params: { count: pot.drawsLeft },
    };
  if (!santa && pot.settings.removeDrawn)
    return {
      severity: 'info',
      key: 'drawpot.participant.remaining',
      params: { count: pot.remainingCount },
    };
  return null;
}
