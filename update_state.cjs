const fs = require('fs');

const path = 'src/games/melodiq-notes/hooks/useMelodiqNotesState.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /const \[playMode, setPlayMode\] = useState<PlayMode>\('continuous'\);/,
    `const [playMode, setPlayMode] = useState<PlayMode>('continuous');
    const [renderMode, setRenderMode] = useState<'horizontal' | 'vertical'>('vertical');`
);

code = code.replace(
    /customXmlContent,\n\s*playMode,\n\s*setPlayMode,/,
    `customXmlContent,
        playMode,
        setPlayMode,
        renderMode,
        setRenderMode,`
);

fs.writeFileSync(path, code);
