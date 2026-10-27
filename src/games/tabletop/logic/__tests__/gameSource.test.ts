import { describe, it, expect, vi } from 'vitest';
import { resolveTableGame, supportsLocalTemplate, type GameSourceLoaders } from '../gameSource';
import { validateAndSanitizeGame } from '../gameValidator';
import type { TabletopGameDefinition } from '../types';

const game = (id: string, name: string): TabletopGameDefinition =>
  validateAndSanitizeGame({ id, name });

const loaders = (overrides: Partial<GameSourceLoaders> = {}): GameSourceLoaders => ({
  session: async () => null,
  localTemplate: async () => null,
  deviceGame: async () => null,
  starterGame: async () => null,
  serverGame: null,
  ...overrides,
});

describe('resolveTableGame (#547)', () => {
  it('starts a starter game from the original without a template', async () => {
    const res = await resolveTableGame(
      'chess',
      loaders({ starterGame: async () => ({ id: 'chess', name: 'Starter' }) }),
    );
    expect(res).toMatchObject({ origin: 'starter', startedFrom: 'original' });
    expect(res?.game.name).toBe('Starter');
  });

  it('starts a starter game from the local template, keeping the game id', async () => {
    const res = await resolveTableGame(
      'chess',
      loaders({
        starterGame: async () => ({ id: 'chess', name: 'Starter' }),
        localTemplate: async () => game('other-id', 'Template'),
      }),
    );
    expect(res).toMatchObject({ origin: 'starter', startedFrom: 'template' });
    expect(res?.game).toMatchObject({ id: 'chess', name: 'Template' });
  });

  it('starts a device game from the local template and prefers it over a starter', async () => {
    const starterGame = vi.fn(async () => ({ id: 'mine', name: 'Starter' }));
    const res = await resolveTableGame(
      'mine',
      loaders({
        deviceGame: async () => game('mine', 'Device'),
        starterGame,
        localTemplate: async () => game('mine', 'Template'),
      }),
    );
    expect(res).toMatchObject({ origin: 'device', startedFrom: 'template' });
    expect(res?.game.name).toBe('Template');
    expect(starterGame).not.toHaveBeenCalled();
  });

  it('loads the original again once the template is gone (reset to original)', async () => {
    const res = await resolveTableGame(
      'mine',
      loaders({ deviceGame: async () => game('mine', 'Device') }),
    );
    expect(res).toMatchObject({ origin: 'device', startedFrom: 'original' });
    expect(res?.game.name).toBe('Device');
  });

  it('never applies a local template to a server game', async () => {
    const localTemplate = vi.fn(async () => game('srv', 'Template'));
    const res = await resolveTableGame(
      'srv',
      loaders({ serverGame: async () => game('srv', 'Server'), localTemplate }),
    );
    expect(res).toMatchObject({ origin: 'server', startedFrom: 'original' });
    expect(res?.game.name).toBe('Server');
    expect(localTemplate).not.toHaveBeenCalled();
  });

  it('resumes a session and only detects the origin, without loading the server game', async () => {
    const serverGame = vi.fn(async () => game('srv', 'Server'));
    const res = await resolveTableGame(
      'srv',
      loaders({ session: async () => game('srv', 'Running'), serverGame }),
    );
    expect(res).toMatchObject({ origin: 'server', startedFrom: 'session' });
    expect(res?.game.name).toBe('Running');
    expect(serverGame).not.toHaveBeenCalled();
  });

  it('resumes a session even when its game is unknown here', async () => {
    const res = await resolveTableGame(
      'gone',
      loaders({ session: async () => game('gone', 'Running') }),
    );
    expect(res).toMatchObject({ origin: null, startedFrom: 'session' });
  });

  it('returns null when no source knows the game', async () => {
    expect(await resolveTableGame('nope', loaders())).toBeNull();
  });
});

describe('supportsLocalTemplate', () => {
  it('allows device-only and starter games only', () => {
    expect(supportsLocalTemplate('device')).toBe(true);
    expect(supportsLocalTemplate('starter')).toBe(true);
    expect(supportsLocalTemplate('server')).toBe(false);
    expect(supportsLocalTemplate(null)).toBe(false);
  });
});
