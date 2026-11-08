import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSave, aggregate, tierRegressions } from './analyze.mjs';
import { analyzeLua } from './lua.mjs';
import { loadParser } from './load-parser.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const fixture = () => JSON.parse(fs.readFileSync(path.join(DIR, 'fixture.save.json'), 'utf8'));

test('analyzeLua: API calls, namespaces, events; skips local functions and stdlib', () => {
  const r = analyzeLua(`
    local function helper() end
    function onLoad() helper(); print('x'); string.format('a'); Wait.time(helper, 1)
      getObjectFromGUID('a').shuffle(); self.createButton({}) end
    function onObjectDrop() end`);
  assert.equal(r.ok, true);
  assert.deepEqual(r.events, ['onLoad', 'onObjectDrop']);
  assert.deepEqual(r.calls, ['Wait.time', 'createButton', 'getObjectFromGUID', 'shuffle']);
});

test('analyzeLua: reports syntax errors instead of throwing', () => {
  const r = analyzeLua('function (');
  assert.equal(r.ok, false);
  assert.ok(r.error);
});

test('fixture: parsed by the real importer, tier A, scripts and hosts reported', async () => {
  const parser = await loadParser();
  try {
    const { parseTtsSaveFile, sanitizeTtsUrl } = parser.mod;
    const r = analyzeSave(fixture(), { parse: parseTtsSaveFile, sanitizeUrl: sanitizeTtsUrl });
    assert.equal(r.tier, 'A');
    assert.deepEqual(r.objects, {
      ...r.objects,
      total: 5,
      converted: 3,
      degraded: 1,
      dropped: 1,
    });
    assert.deepEqual(r.decks, [{ guid: 'deck01', expected: 3, actual: 3 }]);
    assert.equal(r.images.insecure, 0);
    assert.ok(r.images.hosts['steamusercontent-a.akamaihd.net']);
    assert.equal(r.scripts.global, true);
    assert.equal(r.scripts.objects, 1);
    assert.ok(r.scripts.calls.includes('Wait.time'));
    assert.deepEqual(r.projection, { B: false, C: true });
  } finally {
    parser.cleanup();
  }
});

test('tier: parse error, GUID collision, http image, assetbundle', () => {
  const ok = (save) => analyzeSave(save, { parse: () => ({ widgets: {}, maxPlayers: 4 }) });
  const obj = (GUID, Name, extra = {}) => ({ GUID, Name, ...extra });
  assert.equal(
    analyzeSave(
      { ObjectStates: [] },
      {
        parse: () => {
          throw new Error('boom');
        },
      },
    ).tier,
    'none',
  );
  assert.equal(ok({ ObjectStates: [obj('a', 'Card'), obj('a', 'Card')] }).guidCollisions, 1);
  assert.equal(ok({ ObjectStates: [obj('a', 'Card'), obj('a', 'Card')] }).tier, 'none');
  const http = ok({
    ObjectStates: [
      obj('a', 'Custom_Board', { CustomImage: { ImageURL: 'http://i.imgur.com/x.png' } }),
    ],
  });
  assert.equal(http.checks.imagesHttps, false);
  assert.equal(http.tier, 'none');
  assert.equal(ok({ ObjectStates: [obj('a', 'Custom_Assetbundle')] }).tier, 'D');
  assert.equal(
    ok({ ObjectStates: [obj('a', 'Card')], LuaScript: 'WebRequest.get("u", function() end)' }).tier,
    'D',
  );
});

test('deck completeness compares cards with DeckIDs', () => {
  const save = { ObjectStates: [{ GUID: 'd', Name: 'Deck', DeckIDs: [1, 2, 3] }] };
  const r = analyzeSave(save, {
    parse: () => ({ widgets: { deck_1: { type: 'deck', cardIds: ['a'] } }, maxPlayers: 4 }),
  });
  assert.deepEqual(r.decks, [{ guid: 'd', expected: 3, actual: 1 }]);
  assert.equal(r.checks.decksComplete, false);
});

test('aggregate and regressions', () => {
  const m = (tier, calls) => ({
    tier,
    projection: { B: true, C: false },
    scripts: { calls, events: [] },
  });
  const agg = aggregate([m('A', ['shuffle', 'deal']), m('none', ['shuffle'])], 5);
  assert.equal(agg.perTier.A, 1);
  assert.equal(agg.perTier.none, 1);
  assert.deepEqual(agg.topCalls[0], { name: 'shuffle', mods: 2 });
  assert.deepEqual(tierRegressions({ x: 'B', y: 'A' }, { x: 'A', y: 'A', z: 'none' }), ['x']);
});
