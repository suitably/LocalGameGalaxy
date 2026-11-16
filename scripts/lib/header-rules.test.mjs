import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countAppBarImports,
  countBackIconImports,
  findSetHeaderHiddenCalls,
  findUnlabeledIconButtons,
  isAppBarCheckedFile,
  isBackIconCheckedFile,
  isSetHeaderHiddenAllowed,
} from './header-rules.mjs';

test('AppBar: detects named, aliased, multi-line and path imports; ignores comments and others', () => {
  assert.equal(countAppBarImports("import { AppBar } from '@mui/material';"), 1);
  assert.equal(
    countAppBarImports("import { Box, AppBar as Bar, Toolbar } from '@mui/material';"),
    1,
  );
  assert.equal(countAppBarImports("import {\n  Box,\n  AppBar,\n} from '@mui/material';"), 1);
  assert.equal(countAppBarImports("import AppBar from '@mui/material/AppBar';"), 1);
  assert.equal(countAppBarImports("import { Box, Toolbar } from '@mui/material';"), 0);
  assert.equal(countAppBarImports("import Box from '@mui/material/Box';"), 0);
  assert.equal(countAppBarImports("// import { AppBar } from '@mui/material';"), 0);
  assert.equal(countAppBarImports("import { AppBarLike } from './x';"), 0);
});

test('AppBar rule applies to non-test files under src/games only', () => {
  assert.equal(isAppBarCheckedFile('src/games/a/B.tsx'), true);
  assert.equal(isAppBarCheckedFile('src/games/a/B.test.tsx'), false);
  assert.equal(isAppBarCheckedFile('src/components/Layout/GlobalHeader.tsx'), false);
});

test('setHeaderHidden: finds calls, skips comments and similarly named identifiers', () => {
  assert.deepEqual(findSetHeaderHiddenCalls('a();\nsetHeaderHidden(true);'), [2]);
  assert.deepEqual(findSetHeaderHiddenCalls('layout.setHeaderHidden(false)'), [1]);
  assert.deepEqual(findSetHeaderHiddenCalls('setHeaderHidden?.(x)'), [1]);
  assert.deepEqual(findSetHeaderHiddenCalls('// setHeaderHidden(true)'), []);
  assert.deepEqual(findSetHeaderHiddenCalls('/* setHeaderHidden(true) */'), []);
  assert.deepEqual(findSetHeaderHiddenCalls('const { setHeaderHidden } = useHeaderLayout();'), []);
  assert.deepEqual(findSetHeaderHiddenCalls('setHeaderHiddenState(x)'), []);
});

test('setHeaderHidden allowlist: immersive hook, context files and tests', () => {
  assert.equal(isSetHeaderHiddenAllowed('src/games/melodiq-notes/stage/useImmersive.ts'), true);
  assert.equal(isSetHeaderHiddenAllowed('src/context/HeaderLayoutContext.tsx'), true);
  assert.equal(isSetHeaderHiddenAllowed('src/context/LayoutContext.test.tsx'), true);
  assert.equal(isSetHeaderHiddenAllowed('src/games/wordle/WordleGame.tsx'), false);
});

test('back icons: counts one per import for every variant, ignores other icons', () => {
  assert.equal(countBackIconImports("import A from '@mui/icons-material/ArrowBackRounded';"), 1);
  assert.equal(countBackIconImports("import A from '@mui/icons-material/ArrowBack';"), 1);
  assert.equal(
    countBackIconImports("import A from '@mui/icons-material/ArrowBackIosNewRounded';"),
    1,
  );
  assert.equal(countBackIconImports("import A from '@mui/icons-material/ChevronLeftRounded';"), 1);
  assert.equal(countBackIconImports("import A from '@mui/icons-material/KeyboardBackspace';"), 1);
  assert.equal(
    countBackIconImports(
      "import { ArrowBack, ChevronLeft as L, Close } from '@mui/icons-material';",
    ),
    2,
  );
  assert.equal(
    countBackIconImports("import { default as X } from '@mui/icons-material/ArrowBackIosRounded';"),
    1,
  );
  assert.equal(countBackIconImports("import A from '@mui/icons-material/ArrowForwardRounded';"), 0);
  assert.equal(countBackIconImports("import A from '@mui/icons-material/ChevronRight';"), 0);
  assert.equal(countBackIconImports("// import A from '@mui/icons-material/ArrowBack';"), 0);
  const twice = "import A from '@mui/icons-material/ArrowBack';\nconst x = <A />; const y = <A />;";
  assert.equal(countBackIconImports(twice), 1);
});

test('back icon rule scope: games and components, not Layout or tests', () => {
  assert.equal(isBackIconCheckedFile('src/games/x/Y.tsx'), true);
  assert.equal(isBackIconCheckedFile('src/components/common/Z.ts'), true);
  assert.equal(isBackIconCheckedFile('src/components/Layout/GlobalHeader.tsx'), false);
  assert.equal(isBackIconCheckedFile('src/components/common/Z.test.tsx'), false);
  assert.equal(isBackIconCheckedFile('src/modules/audio/A.tsx'), false);
});

test('IconButton: flags unnamed buttons, accepts aria-label, title, spread and Tooltip wrapping', () => {
  assert.deepEqual(findUnlabeledIconButtons('<IconButton onClick={f}><X /></IconButton>'), [1]);
  assert.deepEqual(
    findUnlabeledIconButtons('a\n<IconButton\n  size="small"\n>\n<X/></IconButton>'),
    [2],
  );
  assert.deepEqual(findUnlabeledIconButtons('<IconButton aria-label="x"><X /></IconButton>'), []);
  assert.deepEqual(
    findUnlabeledIconButtons('<IconButton aria-label={t(a)}><X /></IconButton>'),
    [],
  );
  assert.deepEqual(
    findUnlabeledIconButtons('<IconButton aria-labelledby="h"><X /></IconButton>'),
    [],
  );
  assert.deepEqual(findUnlabeledIconButtons('<IconButton {...props}><X /></IconButton>'), []);
  assert.deepEqual(findUnlabeledIconButtons('<IconButton title="x"><X /></IconButton>'), []);
  assert.deepEqual(
    findUnlabeledIconButtons(
      '<Tooltip title="x"><span><IconButton onClick={f}><X /></IconButton></span></Tooltip>',
    ),
    [],
  );
  // Tooltip already closed: the later button is unnamed again.
  assert.deepEqual(
    findUnlabeledIconButtons(
      '<Tooltip title="x"><IconButton aria-label="a"/></Tooltip>\n<IconButton onClick={f}/>',
    ),
    [2],
  );
  // `=>` and `>` inside attribute expressions must not end the tag early.
  assert.deepEqual(
    findUnlabeledIconButtons(
      '<IconButton onClick={() => a > b} aria-label="ok"><X /></IconButton>',
    ),
    [],
  );
  assert.deepEqual(findUnlabeledIconButtons('<IconButtonGroup><X /></IconButtonGroup>'), []);
  assert.deepEqual(findUnlabeledIconButtons('// <IconButton onClick={f}>'), []);
});
