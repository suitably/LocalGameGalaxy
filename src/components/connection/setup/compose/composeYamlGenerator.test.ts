import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COMPOSE_OPTIONS,
  companionPlugins,
  generateComposeYaml,
  normalizeComposeOptions,
  type ComposeGeneratorOptions,
} from './composeYamlGenerator';

const opts = (over: Partial<ComposeGeneratorOptions>): ComposeGeneratorOptions => ({
  ...DEFAULT_COMPOSE_OPTIONS,
  ...over,
});

describe('generateComposeYaml (#342)', () => {
  it('has the signaling tracker and no non-existent images', () => {
    const yaml = generateComposeYaml(opts({ melodiq: true, tabletop: true, tunnel: true }));
    expect(yaml).toContain('nexumia/galaxy-signaling:latest');
    expect(yaml).not.toContain('tabletop-companion');
    expect(yaml).not.toContain('push-relay');
  });

  it('runs one companion container with the selected plugins and their volumes', () => {
    const yaml = generateComposeYaml(opts({ melodiq: false, tabletop: true }));
    expect(yaml.match(/nexumia\/melodiq-server/g)).toHaveLength(1);
    expect(yaml).toContain('PLUGINS=relay,tabletop');
    expect(yaml).toContain('"./tabletop:/app/tabletop"');
    expect(yaml).not.toContain('MUSIC_DIR');
    expect(yaml).not.toContain('/app/notes');
    expect(companionPlugins(opts({ melodiq: true, tabletop: true, notes: true }))).toEqual([
      'relay',
      'melodiq',
      'tabletop',
      'notes',
    ]);
  });

  it('mounts the Melodiq Notes library on its own', () => {
    const yaml = generateComposeYaml(
      opts({
        melodiq: false,
        notes: true,
        paths: { ...DEFAULT_COMPOSE_OPTIONS.paths, notes: '/srv/my notes' },
      }),
    );
    expect(yaml).toContain('PLUGINS=relay,notes');
    expect(yaml).toContain('"/srv/my notes:/app/notes"');
    expect(yaml).toContain('NOTES_DIR=/app/notes');
  });

  it('uses the chosen ports, token and AI image', () => {
    const yaml = generateComposeYaml(
      opts({ port: 3100, signalingPort: 8100, token: 'abc$; rm', aiImage: true }),
    );
    expect(yaml).toContain('"3100:3000"');
    expect(yaml).toContain('"8100:8000"');
    expect(yaml).toContain('SECURITY_TOKEN=abcrm');
    expect(yaml).toContain('nexumia/melodiq-server:full');
    // the AI image only makes sense with Melodiq
    expect(generateComposeYaml(opts({ melodiq: false, tabletop: true, aiImage: true }))).toContain(
      'nexumia/melodiq-server:latest',
    );
  });

  it('can leave out the tracker', () => {
    const yaml = generateComposeYaml(opts({ signaling: false }));
    expect(yaml).not.toContain('galaxy-signaling');
    expect(yaml).toContain('companion:');
  });

  it('tunnels the companion when present, else the tracker', () => {
    expect(generateComposeYaml(opts({ tunnel: true }))).toContain('http://companion:3000');
    const trackerOnly = generateComposeYaml(opts({ melodiq: false, tunnel: true }));
    expect(trackerOnly).toContain('http://signaling:8000');
    expect(trackerOnly).not.toContain('companion:');
  });

  it('escapes quotes in host paths', () => {
    const yaml = generateComposeYaml(
      opts({ paths: { ...DEFAULT_COMPOSE_OPTIONS.paths, music: 'C:\\Music "x"' } }),
    );
    expect(yaml).toContain('"C:\\\\Music \\"x\\":/app/music"');
  });
});

describe('normalizeComposeOptions', () => {
  it('fills fields older saves did not have and rejects bad ports', () => {
    const restored = normalizeComposeOptions({
      melodiq: false,
      port: 70000,
      paths: { music: '/data/music' } as ComposeGeneratorOptions['paths'],
    });
    expect(restored.melodiq).toBe(false);
    expect(restored.notes).toBe(false);
    expect(restored.port).toBe(3000);
    expect(restored.paths.music).toBe('/data/music');
    expect(restored.paths.notes).toBe('./notes');
    expect(normalizeComposeOptions(null)).toEqual(DEFAULT_COMPOSE_OPTIONS);
  });
});
