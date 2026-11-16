import { describe, expect, it } from 'vitest';
import { headerMenuKeys } from './headerMenu';

const fn = () => {};

describe('headerMenuKeys', () => {
  it('lists every owner entry in menu order', () => {
    expect(
      headerMenuKeys({
        onRestart: fn,
        onOpenTableSettings: fn,
        onOpenSaves: fn,
        onOpenRules: fn,
        onBackToLobby: fn,
      }),
    ).toEqual(['onBackToLobby', 'onOpenRules', 'onOpenSaves', 'onOpenTableSettings', 'onRestart']);
  });

  it('gives a phone or spectator only the rules', () => {
    expect(headerMenuKeys({ onOpenRules: fn })).toEqual(['onOpenRules']);
  });

  it('leaves out entries without a callback', () => {
    expect(headerMenuKeys({ onOpenRules: undefined, onOpenSaves: fn })).toEqual(['onOpenSaves']);
    expect(headerMenuKeys({})).toEqual([]);
  });
});
