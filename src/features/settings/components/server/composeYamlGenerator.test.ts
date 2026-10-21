import { describe, it, expect } from 'vitest';
import { companionPlugins, generateComposeYaml } from './composeYamlGenerator';

describe('generateComposeYaml (#342)', () => {
  it('always has the signaling tracker and no non-existent images', () => {
    const yaml = generateComposeYaml({ melodiq: true, tabletop: true, tunnel: true });
    expect(yaml).toContain('nexumia/galaxy-signaling:latest');
    expect(yaml).not.toContain('tabletop-companion');
    expect(yaml).not.toContain('push-relay');
  });

  it('runs one companion container with the selected plugins', () => {
    const yaml = generateComposeYaml({ melodiq: false, tabletop: true, tunnel: false });
    expect(yaml.match(/nexumia\/melodiq-server/g)).toHaveLength(1);
    expect(yaml).toContain('PLUGINS=relay,tabletop');
    expect(yaml).not.toContain('MUSIC_DIR');
    expect(companionPlugins({ melodiq: true, tabletop: true, tunnel: false })).toEqual([
      'relay',
      'melodiq',
      'tabletop',
    ]);
  });

  it('tunnels the companion when present, else the tracker', () => {
    expect(generateComposeYaml({ melodiq: true, tabletop: false, tunnel: true })).toContain(
      'http://companion:3000',
    );
    const trackerOnly = generateComposeYaml({ melodiq: false, tabletop: false, tunnel: true });
    expect(trackerOnly).toContain('http://signaling:8000');
    expect(trackerOnly).not.toContain('companion:');
  });
});
