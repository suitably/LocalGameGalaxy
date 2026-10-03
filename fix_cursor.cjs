const fs = require('fs');

const path = 'src/games/melodiq-notes/SheetMusicViewer.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /useEffect\(\(\) => \{\n\s*updateCursorHighlight\(isCurrentNoteHit\);\n\s*\}, \[isCurrentNoteHit, updateCursorHighlight\]\);/,
    `useEffect(() => {
        updateCursorHighlight(isCurrentNoteHit);
    }, [isCurrentNoteHit, updateCursorHighlight, renderMode]);`
);


fs.writeFileSync(path, code);
