const test = require('node:test');
const assert = require('node:assert');
const {
  hasNotes,
  cleanSearchTerm,
  hasSongHeaders,
  rewriteMediaHeaders,
  buildMinimalTxt,
} = require('../dist/plugins/melodiq/services/ultrastarTxt.js');

test('UltraStar txt helpers (#413)', async (t) => {
  await t.test('hasNotes detects note lines only', () => {
    assert.strictEqual(hasNotes('#TITLE:x\n: 0 4 60 Hel\n'), true);
    assert.strictEqual(hasNotes('#TITLE:x\n* 4 2 62 lo'), true);
    assert.strictEqual(hasNotes('#TITLE:x\n#ARTIST:y\nE'), false);
    assert.strictEqual(hasNotes(null), false);
  });

  await t.test('cleanSearchTerm drops bracketed suffixes and collapses spaces', () => {
    assert.strictEqual(cleanSearchTerm('Song  (Live) [Remastered 2011]'), 'Song');
    assert.strictEqual(cleanSearchTerm(' A  B '), 'A B');
  });

  await t.test('hasSongHeaders needs #TITLE or #ARTIST', () => {
    assert.strictEqual(hasSongHeaders('#ARTIST:a\n: 0 1 1 x'), true);
    assert.strictEqual(hasSongHeaders(': 0 1 1 x'), false);
    assert.strictEqual(hasSongHeaders(null), false);
  });

  await t.test('rewriteMediaHeaders replaces media headers after the last header line', () => {
    const txt = [
      '#TITLE:T',
      '#ARTIST:A',
      '#MP3:old.mp3',
      '#VIDEO:old.mp4',
      '#BACKGROUND:bg.jpg',
      '#BPM:300',
      ': 0 4 60 la',
      'E',
    ].join('\n');
    const out = rewriteMediaHeaders(txt, {
      mp3: 'new.mp3',
      video: 'https://youtu.be/x',
      cover: 'S-cover.jpg',
    });
    assert.deepStrictEqual(out.split('\n'), [
      '#TITLE:T',
      '#ARTIST:A',
      '#BPM:300',
      '#MP3:new.mp3',
      '#VIDEO:https://youtu.be/x',
      '#COVER:S-cover.jpg',
      ': 0 4 60 la',
      'E',
    ]);
  });

  await t.test('rewriteMediaHeaders omits empty video and missing cover', () => {
    const out = rewriteMediaHeaders('#TITLE:T\n: 0 1 1 x', { mp3: 'a.mp3', video: '' });
    assert.strictEqual(out, '#TITLE:T\n#MP3:a.mp3\n: 0 1 1 x');
  });

  await t.test(
    'rewriteMediaHeaders keeps CRLF lines and is case-insensitive for old headers',
    () => {
      const out = rewriteMediaHeaders('#TITLE:T\r\n#mp3:old.mp3\r\n: 0 1 1 x\r\n', {
        mp3: 'a.mp3',
      });
      assert.strictEqual(out, '#TITLE:T\r\n#MP3:a.mp3\n: 0 1 1 x\r\n');
    },
  );

  await t.test('buildMinimalTxt writes a playable header-only file', () => {
    assert.strictEqual(
      buildMinimalTxt({ title: 'T', artist: 'A', mp3: 'a.mp3', video: '', cover: 'c.jpg' }),
      '#TITLE:T\n#ARTIST:A\n#MP3:a.mp3\n#COVER:c.jpg\n#BPM:200\n#GAP:0\nE',
    );
  });
});
