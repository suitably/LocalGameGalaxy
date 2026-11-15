/**
 * Participant side of a draw pot: load, pick own name (secret santa), draw, remember
 * [ID: DRAWPOT-PARTICIPANT-STATE]
 *
 * The device id (`getDeviceId`) identifies the participant towards the server, which enforces
 * the draw limit. Every result is also stored locally (`saveHistory`) and shown again on the
 * next visit, even when the pot is gone or the device is offline.
 */
import { useCallback, useEffect, useState } from 'react';
import { getDeviceId } from '../../../lib/deviceIdentity';
import { drawPotApi, DrawPotApiError, type DrawPotPublicView, type DrawRecord } from '../logic/api';
import { findHistory, saveHistory, type PotHistory } from '../logic/localStore';

export function useParticipantPot(potId: string) {
  const participantId = getDeviceId();
  const [pot, setPot] = useState<DrawPotPublicView | null>(null);
  const [history, setHistory] = useState<PotHistory | undefined>(() => findHistory(potId));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DrawPotApiError['code'] | null>(null);
  const [drawError, setDrawError] = useState<DrawPotApiError['code'] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [revealing, setRevealing] = useState<DrawRecord | null>(null);
  const [identityId, setIdentityId] = useState<string | null>(null);

  const remember = useCallback(
    (view: DrawPotPublicView, draws: DrawRecord[]) => {
      if (draws.length === 0) return;
      const identity = view.entries?.find((e) => e.id === draws[0].identityId)?.label;
      setHistory(
        saveHistory({
          potId,
          title: view.title,
          mode: view.settings.mode,
          identityLabel: identity,
          draws,
        }),
      );
    },
    [potId],
  );

  /** Loads the pot; state changes only after the request settled. */
  const load = useCallback(
    () =>
      drawPotApi
        .view(potId, participantId)
        .then((view) => {
          setPot(view);
          setLoadError(null);
          remember(view, view.myDraws);
        })
        .catch((e: unknown) => setLoadError(e instanceof DrawPotApiError ? e.code : 'network'))
        .finally(() => setLoading(false)),
    [potId, participantId, remember],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    void load();
  };

  async function draw() {
    if (drawing || !pot) return;
    setDrawing(true);
    setDrawError(null);
    setRevealing(null);
    try {
      const res = await drawPotApi.draw(potId, participantId, identityId ?? undefined);
      setPot(res.pot);
      remember(res.pot, [...res.pot.myDraws, res.draw]);
      setRevealing(res.draw);
    } catch (e) {
      const err = e instanceof DrawPotApiError ? e : new DrawPotApiError('network', 0);
      setDrawError(err.code);
      if (err.payload?.myDraws) remember(pot, err.payload.myDraws);
      if (err.code === 'identity_taken' || err.code === 'empty' || err.code === 'closed')
        void refresh();
    } finally {
      setDrawing(false);
    }
  }

  const draws = history?.draws ?? [];
  const santa = pot?.settings.mode === 'secret-santa';
  const canDraw =
    !!pot &&
    !pot.closed &&
    pot.drawsLeft !== 0 &&
    pot.remainingCount > 0 &&
    (!santa || draws.length === 0);

  return {
    pot,
    history,
    draws,
    loading,
    loadError,
    drawError,
    drawing,
    canDraw,
    santa,
    identityId,
    setIdentityId,
    revealing,
    finishReveal: () => setRevealing(null),
    draw,
    refresh,
  };
}

export type ParticipantPot = ReturnType<typeof useParticipantPot>;
