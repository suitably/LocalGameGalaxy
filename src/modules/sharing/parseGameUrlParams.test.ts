import { describe, it, expect } from 'vitest';
import { parseGameUrlParams } from './parseGameUrlParams';

describe('parseGameUrlParams', () => {
  it('extracts parameters from search query', () => {
    const params = parseGameUrlParams('?room=ABC&name=Alice', '');
    expect(params.get('room')).toBe('ABC');
    expect(params.get('name')).toBe('Alice');
  });

  it('extracts parameters from hash query', () => {
    const params = parseGameUrlParams('', '#/games/gartic?room=XYZ&test=1');
    expect(params.get('room')).toBe('XYZ');
    expect(params.get('test')).toBe('1');
  });

  it('prioritizes search over hash query when both exist', () => {
    const params = parseGameUrlParams('?room=FROM_SEARCH', '#/games/gartic?room=FROM_HASH');
    expect(params.get('room')).toBe('FROM_SEARCH');
  });

  it('handles empty or missing parameters gracefully', () => {
    const params = parseGameUrlParams('', '');
    expect(params.get('room')).toBeNull();
  });
});
