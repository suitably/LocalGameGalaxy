import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import {
  setHelperActive,
  setHelperToken,
  setHelperUrl,
} from '../../../../lib/companion/companionSettings';
import { setSignalingUrl, SIGNALING_PORT } from '../../../../lib/webrtc/signalingSettings';
import {
  generateComposeYaml,
  hasCompanion,
  normalizeComposeOptions,
  type ComposeGeneratorOptions,
  type ComposeHostPaths,
} from './composeYamlGenerator';

export type ComposeToggle = 'melodiq' | 'tabletop' | 'notes' | 'aiImage' | 'signaling' | 'tunnel';

function downloadFile(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/yaml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Compose generator choices (kept on this device), the YAML they produce and its actions.
 * `token` is the setup wizard's token, so binary, terminal and Docker setups share one.
 */
export function useComposeGenerator(token: string) {
  const [options, setOptions] = useState<ComposeGeneratorOptions>(() =>
    normalizeComposeOptions(
      storage.getJson<Partial<ComposeGeneratorOptions> | null>(
        STORAGE_KEYS.COMPOSE_GENERATOR,
        null,
      ),
    ),
  );
  const [copied, setCopied] = useState(false);
  // the choices last applied to this device; changing any of them clears the confirmation
  const [appliedFor, setAppliedFor] = useState<ComposeGeneratorOptions | null>(null);

  useEffect(() => {
    // the token belongs to the wizard, not to these choices
    storage.setJson(STORAGE_KEYS.COMPOSE_GENERATOR, { ...options, token: '' });
  }, [options]);

  const update = useCallback((patch: Partial<ComposeGeneratorOptions>) => {
    setOptions((prev) => normalizeComposeOptions({ ...prev, ...patch }));
  }, []);

  const toggle = useCallback(
    (key: ComposeToggle) => setOptions((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  const setPath = useCallback(
    (key: keyof ComposeHostPaths, value: string) =>
      setOptions((prev) => ({ ...prev, paths: { ...prev.paths, [key]: value } })),
    [],
  );

  const yaml = useMemo(() => generateComposeYaml({ ...options, token }), [options, token]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the YAML stays selectable in the text field
    }
  }, [yaml]);

  /** Points this device at the containers the YAML starts on this machine. */
  const applyToThisDevice = useCallback(() => {
    if (hasCompanion(options)) {
      setHelperUrl(`http://localhost:${options.port}`);
      if (token) setHelperToken(token);
      setHelperActive(true);
    }
    if (options.signaling && options.signalingPort !== SIGNALING_PORT) {
      setSignalingUrl(`ws://localhost:${options.signalingPort}`);
    }
    setAppliedFor(options);
    window.dispatchEvent(new Event('server_connection_updated'));
  }, [options, token]);

  return {
    options,
    yaml,
    copied,
    applied: appliedFor === options,
    companion: hasCompanion(options),
    update,
    toggle,
    setPath,
    copy,
    download: () => downloadFile('docker-compose.yml', yaml),
    applyToThisDevice,
  };
}

export type ComposeGeneratorState = ReturnType<typeof useComposeGenerator>;
