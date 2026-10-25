import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  applyPairing,
  describeDevice,
  PAIRING_PARAMS,
  parsePairingParams,
  redeemPairingCode,
  type PairingRequest,
  type PairingResult,
} from '../../../../lib/companion/serverPairing';

export type PairingPhase =
  { phase: 'ready' } | { phase: 'pairing' } | { phase: 'done'; result: PairingResult };

/** Pairing link state for Settings → Server: confirm, redeem the one-time code, clean the URL. */
export function useServerPairing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [request, setRequest] = useState<PairingRequest | null>(() =>
    parsePairingParams(searchParams),
  );
  const [state, setState] = useState<PairingPhase>({ phase: 'ready' });

  const clearParams = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        PAIRING_PARAMS.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const pair = useCallback(async () => {
    if (!request) return;
    setState({ phase: 'pairing' });
    const result = await redeemPairingCode(request, describeDevice(navigator.userAgent));
    if (result.status === 'paired') {
      applyPairing(request.serverUrl, result.token);
      // The code is spent; keep it out of history and bookmarks.
      clearParams();
    }
    setState({ phase: 'done', result });
  }, [request, clearParams]);

  const dismiss = useCallback(() => {
    clearParams();
    setRequest(null);
  }, [clearParams]);

  return { request, state, pair, dismiss };
}
