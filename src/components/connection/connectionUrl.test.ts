import { describe, it, expect } from 'vitest';
import { buildDeviceConnectionUrl } from './connectionUrl';

describe('buildDeviceConnectionUrl', () => {
  it('builds standard connection URL with party ID and trackers', () => {
    const result = buildDeviceConnectionUrl({
      baseUrl: 'http://192.168.1.50:3000',
      clientPath: '/games/melodiq?role=client',
      partyId: 'ABC123',
      trackerUrls: ['wss://tracker.example.com', 'ws://localhost:8000'],
    });

    const url = new URL(result);
    expect(url.origin).toBe('http://192.168.1.50:3000');
    expect(url.pathname).toBe('/games/melodiq');
    expect(url.searchParams.get('role')).toBe('client');
    expect(url.searchParams.get('party')).toBe('ABC123');

    const trackers = url.searchParams.getAll('tracker');
    expect(trackers).toContain('wss://tracker.example.com');
    // localhost should be replaced with targetHost 192.168.1.50
    expect(trackers).toContain('ws://192.168.1.50:8000');
  });

  it('handles fallback when baseUrl is invalid', () => {
    const result = buildDeviceConnectionUrl({
      baseUrl: 'invalid-url',
      clientPath: '/games/melodiq?role=client',
      partyId: 'XYZ999',
      trackerUrls: [],
    });

    const url = new URL(result);
    expect(url.searchParams.get('party')).toBe('XYZ999');
  });
});

describe('buildDeviceConnectionUrl for a party lobby (#647)', () => {
  it('opens the lobby of the room and carries the trackers', () => {
    const result = buildDeviceConnectionUrl({
      baseUrl: 'http://192.168.1.50:3000',
      clientPath: '/games/melodiq?role=client',
      partyId: 'ABC123',
      trackerUrls: ['wss://tracker.example.com', 'ws://localhost:8000'],
      lobby: true,
    });
    const url = new URL(result);
    expect(url.origin).toBe('http://192.168.1.50:3000');
    expect(url.pathname).toBe('/');
    const hash = new URLSearchParams(url.hash.slice(url.hash.indexOf('?') + 1));
    expect(url.hash.startsWith('#/party?')).toBe(true);
    expect(hash.get('room')).toBe('ABC123');
    expect(hash.getAll('tracker')).toEqual(['wss://tracker.example.com', 'ws://192.168.1.50:8000']);
  });
});
