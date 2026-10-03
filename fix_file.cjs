const fs = require('fs');
const path = 'src/games/melodiq-notes/SheetMusicViewer.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /useEffect\(\(\) => \{\n\s*let isMounted = true;\n\s*if \(!osmdRef\.current \|\| !xmlContent\) return;import/,
    `import`
);

fs.writeFileSync(path, code);
