const fs = require('fs');

// Fix SheetMusicViewer
const path1 = 'src/games/melodiq-notes/SheetMusicViewer.tsx';
let code1 = fs.readFileSync(path1, 'utf8');
code1 = code1.replace(
    /renderMode\?: 'horizontal' \| 'vertical';\n\s*renderMode\?: 'horizontal' \| 'vertical';/,
    `renderMode?: 'horizontal' | 'vertical';`
);
fs.writeFileSync(path1, code1);

// Fix ControlPanel
const path2 = 'src/games/melodiq-notes/components/ControlPanel.tsx';
let code2 = fs.readFileSync(path2, 'utf8');

code2 = code2.replace(
    /renderMode = 'vertical',\n\s*inputSource,/,
    `renderMode,\n    inputSource,`
);
code2 = code2.replace(
    /onRenderModeChange,\n\s*onInputSourceChange,/,
    `onRenderModeChange,\n    onInputSourceChange,`
);

fs.writeFileSync(path2, code2);
