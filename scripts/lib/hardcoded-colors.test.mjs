import test from 'node:test';
import assert from 'node:assert/strict';
import { countHardcodedColors, isColorCheckedFile } from './hardcoded-colors.mjs';

test('counts hex literals of every length in strings and templates', () => {
  assert.equal(countHardcodedColors("const a = { color: '#fff' };"), 1);
  assert.equal(countHardcodedColors('const a = "#ffff", b = "#a1b2c3", c = "#a1b2c3d4";'), 3);
  assert.equal(countHardcodedColors('const a = `1px solid #FF8A3D ${x} #000`;'), 2);
  assert.equal(countHardcodedColors('sx={{ background: `linear-gradient(${a}, #123)` }}'), 1);
  assert.equal(countHardcodedColors("const a = `x ${cond ? '#fff' : 'red'} y`;"), 1);
});

test('ignores comments, JSX entities, identifiers and non-colour hashes', () => {
  assert.equal(countHardcodedColors('// color: #fff\n/* #ffffff */ const a = 1;'), 0);
  assert.equal(countHardcodedColors('<p>&#123; text &#x1F600;</p>'), 0);
  assert.equal(
    countHardcodedColors("const a = 'https://x.dev/page#fff'; const b = 'issue#1234x';"),
    0,
  );
  assert.equal(countHardcodedColors("const a = 'url(#abc)'; const b = '#12345';"), 0);
  assert.equal(countHardcodedColors("const a = 'Hash #tag'; const b = 'a#bcd';"), 0);
});

test('does not let apostrophes in JSX text or regex literals swallow code', () => {
  assert.equal(countHardcodedColors("<p>don't</p>\nconst a = { c: '#fff' };"), 1);
  assert.equal(countHardcodedColors("const re = /'/g;\nconst a = '#fff';"), 1);
});

test('counts non-black rgb/rgba and allows black', () => {
  assert.equal(countHardcodedColors("const a = 'rgba(0,0,0,0.4)', b = 'rgb(0 0 0)';"), 0);
  assert.equal(countHardcodedColors("const a = 'rgba(255, 255, 255, 0.1)';"), 1);
  assert.equal(countHardcodedColors("const a = 'rgb(0, 0, 1)', b = 'rgba(12,0,0,.5)';"), 2);
  assert.equal(countHardcodedColors('const a = `rgba(${r}, ${g}, ${b}, 0.5)`;'), 0);
});

test('isColorCheckedFile applies to non-exempt src tsx files only', () => {
  assert.equal(isColorCheckedFile('src/games/uno/UnoGame.tsx'), true);
  assert.equal(isColorCheckedFile('src/games/uno/UnoGame.test.tsx'), false);
  assert.equal(isColorCheckedFile('src/games/uno/logic.ts'), false);
  assert.equal(isColorCheckedFile('src/theme.ts'), false);
  assert.equal(isColorCheckedFile('src/themeTokens.ts'), false);
  assert.equal(isColorCheckedFile('src/games/tabletop/logic/x.tsx'), false);
  assert.equal(isColorCheckedFile('src/games/tabletop/components/widgets/Card.tsx'), false);
  assert.equal(isColorCheckedFile('src/games/tabletop/components/Board.tsx'), true);
  assert.equal(isColorCheckedFile('src/lib/musicXmlParser.ts'), false);
  assert.equal(isColorCheckedFile('server/src/a.tsx'), false);
});
