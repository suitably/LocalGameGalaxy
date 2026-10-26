/** Software loopback ports (ALSA "Midi Through") that never carry an instrument. */
const VIRTUAL_PORT = /midi through/i;

export const isVirtualMidiPort = (name: string): boolean => VIRTUAL_PORT.test(name);

/**
 * The input to listen on: keeps `current` while it is a connected instrument, otherwise the
 * first connected instrument, falling back to a virtual port only when nothing else is attached.
 */
export function pickMidiInput(
  inputs: ReadonlyArray<{ id: string; name: string; state: string }>,
  current: string | null,
): string | null {
  const connected = inputs.filter((i) => i.state === 'connected');
  const real = connected.filter((i) => !isVirtualMidiPort(i.name));
  if (current && real.some((i) => i.id === current)) return current;
  return (real[0] ?? connected[0])?.id ?? null;
}
