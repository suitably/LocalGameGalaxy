const fs = require('fs');

const path = 'src/games/melodiq-notes/MelodiqNotesGame.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /customXmlContent,\n\s*playMode,\n\s*setPlayMode,/,
    `customXmlContent,
        playMode,
        setPlayMode,
        renderMode,
        setRenderMode,`
);

code = code.replace(
    /onPlayModeChange=\{setPlayMode\}/,
    `onPlayModeChange={setPlayMode}
                            renderMode={renderMode}
                            onRenderModeChange={setRenderMode}`
);

code = code.replace(
    /xmlContent=\{currentXmlContent\}\n\s*isCurrentNoteHit=\{isCurrentNoteHit\}/,
    `xmlContent={currentXmlContent}
                    renderMode={renderMode}
                    isCurrentNoteHit={isCurrentNoteHit}`
);

fs.writeFileSync(path, code);
