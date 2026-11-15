/**
 * Which backend a pot page talks to: `?server=` in the URL, else what this device stored for the
 * pot, else the cloud [ID: DRAWPOT-BACKEND-HOOK]
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { backendFromServer, serverOf, type DrawPotBackend } from '../logic/api';

export function usePotBackend(storedServer: string | undefined): {
  backend: DrawPotBackend;
  server: string | undefined;
} {
  const [params] = useSearchParams();
  const raw = params.get('server') ?? storedServer;
  return useMemo(() => {
    const backend = backendFromServer(raw);
    return { backend, server: serverOf(backend) };
  }, [raw]);
}
