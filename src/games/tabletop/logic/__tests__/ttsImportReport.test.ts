import { describe, it, expect } from 'vitest';
import { parseTtsSaveFile } from '../ttsParser';
import { validateAndSanitizeGame } from '../gameValidator';
import { buildImportReport, classifyTtsObject, extractScripts } from '../ttsImportReport';
import type { TTSObjectState, TTSSaveFile } from '../ttsTypes';

const obj = (GUID: string, Name: string, fields: Partial<TTSObjectState> = {}): TTSObjectState =>
  ({
    GUID,
    Name,
    Transform: {
      posX: 0,
      posY: 1,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
    ...fields,
  }) as TTSObjectState;

const save = (ObjectStates: TTSObjectState[], extra: Partial<TTSSaveFile> = {}): TTSSaveFile => ({
  SaveName: 'Hand made',
  ObjectStates,
  ...extra,
});

const board = (GUID: string, url: string) =>
  obj(GUID, 'Custom_Board', { CustomImage: { ImageURL: url, WidthScale: 1 } as never });

describe('classifyTtsObject', () => {
  it('splits converted, degraded and dropped', () => {
    expect(classifyTtsObject('Deck')).toBe('converted');
    expect(classifyTtsObject('Die_6')).toBe('converted');
    expect(classifyTtsObject('3DText')).toBe('converted');
    expect(classifyTtsObject('ScriptingTrigger')).toBe('converted');
    expect(classifyTtsObject('Checker_White')).toBe('degraded');
    expect(classifyTtsObject('Custom_Model')).toBe('degraded');
    expect(classifyTtsObject('Notecard')).toBe('dropped');
  });
});

describe('buildImportReport', () => {
  const s = save(
    [
      obj('a', 'Card'),
      obj('b', 'Card'),
      obj('c', 'Checker_White'),
      obj('d', 'Custom_Model'),
      obj('e', 'Custom_Assetbundle'),
      board('f', 'http://cloud-3.steamusercontent.com/ugc/1/'),
      board('g', 'https://i.imgur.com/x.png'),
      obj('h', 'Bag', { ContainedObjects: [board('i', 'https://i.imgur.com/y.png')] }),
    ],
    { LuaScript: 'function onLoad() end' },
  );

  it('counts per type and in total', () => {
    const r = buildImportReport(s);
    expect(r.totals).toEqual({ objects: 8, converted: 5, degraded: 2, dropped: 1 });
    expect(r.byType.Card).toEqual({ converted: 2, degraded: 0, dropped: 0 });
    expect(r.byType.Checker_White).toEqual({ converted: 0, degraded: 1, dropped: 0 });
    expect(r.byType.Custom_Model).toEqual({ converted: 0, degraded: 1, dropped: 0 });
  });

  it('lists image hosts after URL rewriting, including nested objects', () => {
    const r = buildImportReport(s, (u) => u.replace('cloud-3.steamusercontent.com', 'cdn.example'));
    expect(r.imageHosts).toEqual({ 'cdn.example': 1, 'i.imgur.com': 2 });
  });

  it('flags scripts present', () => {
    const withObjects = save(
      [obj('a', 'Card', { LuaScript: 'x=1' }), obj('b', 'Card', { XmlUI: '<a/>' })],
      {
        LuaScript: 'y=1',
      },
    );
    expect(buildImportReport(withObjects).scripts).toEqual({
      global: true,
      objects: 1,
      xmlUi: true,
    });
    expect(buildImportReport(save([obj('a', 'Card')])).scripts).toEqual({
      global: false,
      objects: 0,
      xmlUi: false,
    });
  });
});

describe('extractScripts', () => {
  it('is undefined without scripts', () => {
    expect(extractScripts(save([obj('a', 'Card')]))).toBeUndefined();
  });

  it('keeps Global and per-object Lua, state, XML, tags and GM notes verbatim', () => {
    const lua = 'function onLoad()\r\n  print("ä")\nend';
    const scripts = extractScripts(
      save(
        [
          obj('a', 'Card', {
            LuaScript: lua,
            LuaScriptState: '{"n":1}',
            Tags: ['deck'],
            GMNotes: 'note',
          }),
          obj('b', 'Card'),
          obj('c', 'Bag', { ContainedObjects: [obj('d', 'Card', { XmlUI: '<Panel/>' })] }),
          obj('a', 'Card', { LuaScript: 'dup' }),
        ],
        { LuaScript: 'global()', XmlUI: '<Ui/>' },
      ),
    );
    expect(scripts?.global).toEqual({ lua: 'global()', xmlUi: '<Ui/>' });
    expect(scripts?.objects.a).toEqual({
      lua,
      luaState: '{"n":1}',
      tags: ['deck'],
      gmNotes: 'note',
    });
    expect(scripts?.objects.d).toEqual({ xmlUi: '<Panel/>' });
    expect(scripts?.objects['a~2']).toEqual({ lua: 'dup' });
    expect(scripts?.objects.b).toBeUndefined();
  });
});

describe('import → save/load round-trip', () => {
  const s = save([obj('a', 'Card', { LuaScript: 'x=1', Tags: ['t'] }), obj('m', 'Custom_Model')], {
    LuaScript: 'g=1',
  });

  it('parseTtsSaveFile attaches report and sidecar', () => {
    const game = parseTtsSaveFile(s);
    expect(game.importReport?.totals.degraded).toBe(1);
    expect(game.scripts?.global?.lua).toBe('g=1');
    expect(game.scripts?.objects.a).toEqual({ lua: 'x=1', tags: ['t'] });
  });

  it('survives JSON serialization and the validator unchanged', () => {
    const game = parseTtsSaveFile(s);
    const loaded = validateAndSanitizeGame(JSON.parse(JSON.stringify(game)));
    expect(loaded.importReport).toEqual(game.importReport);
    expect(loaded.scripts).toEqual(game.scripts);
  });

  it('keeps the asset cache summary through save/load (#693)', () => {
    const game = parseTtsSaveFile(s);
    const assets = { total: 3, cached: 2, failed: 1, deadHosts: { 'i.imgur.com': 1 } };
    const withAssets = { ...game, importReport: { ...game.importReport!, assets } };
    const loaded = validateAndSanitizeGame(JSON.parse(JSON.stringify(withAssets)));
    expect(loaded.importReport?.assets).toEqual(assets);
  });

  it('drops malformed report and sidecar fields', () => {
    const loaded = validateAndSanitizeGame({
      name: 'x',
      importReport: { source: 'other' },
      scripts: { global: 5, objects: { a: { lua: 7 }, b: { lua: 'ok', tags: ['a', 3] } } },
    } as never);
    expect(loaded.importReport).toBeUndefined();
    expect(loaded.scripts).toEqual({ objects: { b: { lua: 'ok', tags: ['a'] } } });
  });

  it('leaves games without TTS data untouched', () => {
    const loaded = validateAndSanitizeGame({ name: 'plain' });
    expect(loaded.importReport).toBeUndefined();
    expect(loaded.scripts).toBeUndefined();
  });
});
