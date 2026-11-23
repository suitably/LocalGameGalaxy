import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findGameLists, isGameListCheckedFile } from './game-lists.mjs';

const ids = new Set(['kniffel', 'qwixx', 'skat']);

describe('game-lists rule', () => {
  it('flags string arrays that name two catalogue ids', () => {
    assert.deepEqual(findGameLists("const A = ['kniffel', 'qwixx'];", ids), [1]);
    assert.deepEqual(findGameLists("const A = [\n  'kniffel',\n  'skat',\n];", ids), [1]);
  });

  it('ignores single ids, object arrays and marked lists', () => {
    assert.deepEqual(findGameLists("const A = ['kniffel', 'other'];", ids), []);
    assert.deepEqual(findGameLists("const A = [{ id: 'kniffel' }, { id: 'qwixx' }];", ids), []);
    assert.deepEqual(findGameLists("// game-list-ok\nconst A = ['kniffel', 'qwixx'];", ids), []);
  });

  it('checks app code outside the games and the catalogue', () => {
    assert.equal(isGameListCheckedFile('src/features/hub/Hub.tsx'), true);
    assert.equal(isGameListCheckedFile('src/lib/catalog/views.ts'), false);
    assert.equal(isGameListCheckedFile('src/games/kniffel/definition.tsx'), false);
    assert.equal(isGameListCheckedFile('src/features/hub/Hub.test.tsx'), false);
  });
});
