/**
 * Host side of a draw pot: status, reset/close/reopen, delete [ID: DRAWPOT-ADMIN-STATE]
 *
 * The admin key comes from this device's hosted list or from the host link's fragment
 * (`#key=…`); a key from a link is remembered once the server accepted it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { drawPotApi, DrawPotApiError, type DrawPotAdminView } from '../logic/api';
import { findHosted, removeHosted, saveHosted } from '../logic/localStore';

type AdminAction = 'reset' | 'close' | 'reopen';

export function useAdminPot(potId: string) {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const adminKey = useMemo(() => {
    const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('key');
    return fromHash || findHosted(potId)?.adminKey || null;
  }, [hash, potId]);
  const [pot, setPot] = useState<DrawPotAdminView | null>(null);
  const [error, setError] = useState<DrawPotApiError['code'] | 'no_key' | null>(
    adminKey ? null : 'no_key',
  );
  const [busy, setBusy] = useState(false);

  const remember = useCallback(
    (view: DrawPotAdminView) => {
      if (!adminKey) return;
      const known = findHosted(potId);
      saveHosted({
        id: potId,
        adminKey,
        title: view.title,
        mode: view.settings.mode,
        createdAt: known?.createdAt ?? view.createdAt,
        expiresAt: view.expiresAt,
      });
    },
    [adminKey, potId],
  );

  /** Applies a server answer; never sets state before the request settled. */
  const settle = useCallback(
    (call: Promise<DrawPotAdminView>) =>
      call
        .then((view) => {
          setPot(view);
          setError(null);
          if (!findHosted(potId) || hash) remember(view);
        })
        .catch((e: unknown) => setError(e instanceof DrawPotApiError ? e.code : 'network'))
        .finally(() => setBusy(false)),
    [potId, hash, remember],
  );

  const run = (call: () => Promise<DrawPotAdminView>) => {
    setBusy(true);
    void settle(call());
  };

  useEffect(() => {
    if (adminKey) void settle(drawPotApi.adminView(potId, adminKey));
  }, [adminKey, potId, settle]);

  const refresh = () => {
    if (adminKey) run(() => drawPotApi.adminView(potId, adminKey));
  };

  const act = (action: AdminAction) => {
    if (adminKey) run(() => drawPotApi.adminAction(potId, adminKey, action));
  };

  async function remove() {
    if (!adminKey) return;
    setBusy(true);
    try {
      await drawPotApi.remove(potId, adminKey);
    } catch (e) {
      // already gone counts as deleted
      if (!(e instanceof DrawPotApiError && e.code === 'not_found')) {
        setError(e instanceof DrawPotApiError ? e.code : 'network');
        setBusy(false);
        return;
      }
    }
    removeHosted(potId);
    navigate('/games/drawpot', { replace: true });
  }

  return { pot, adminKey, error, busy, refresh, act, remove };
}

export type AdminPot = ReturnType<typeof useAdminPot>;
