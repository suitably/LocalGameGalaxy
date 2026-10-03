const fs = require('fs');

const path = 'src/games/melodiq-notes/SheetMusicViewer.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /zoom\?: number;\n\s*isCurrentNoteHit\?: boolean;/,
    `zoom?: number;
    isCurrentNoteHit?: boolean;
    renderMode?: 'horizontal' | 'vertical';`
);

code = code.replace(
    /zoom = 1\.0,\n\s*isCurrentNoteHit = false,\n\s*onNotesChanged,/,
    `zoom = 1.0,
    isCurrentNoteHit = false,
    renderMode = 'vertical',
    onNotesChanged,`
);

code = code.replace(
    /renderSingleHorizontalStaffline: true,/,
    `renderSingleHorizontalStaffline: renderMode === 'horizontal',`
);

code = code.replace(
    /whiteSpace: 'nowrap',\n\s*display: isLoading \? 'none' : 'flex',\n\s*alignItems: 'center',\n\s*background: '#ffffff',/,
    `whiteSpace: renderMode === 'horizontal' ? 'nowrap' : 'normal',
                    display: isLoading ? 'none' : (renderMode === 'horizontal' ? 'flex' : 'block'),
                    alignItems: renderMode === 'horizontal' ? 'center' : 'flex-start',
                    background: '#ffffff',`
);

// We need to recreate OSMD instance if renderMode changes, because renderSingleHorizontalStaffline can only be set before load()
code = code.replace(
    /const osmd = new OpenSheetMusicDisplay\(containerRef\.current, \{/,
    `// Destroy previous instance if it exists
            if (osmdRef.current) {
                containerRef.current.innerHTML = '';
            }

            const osmd = new OpenSheetMusicDisplay(containerRef.current, {`
);

// Include renderMode in dependency array of the load effect
code = code.replace(
    /\[xmlContent, zoom, isMobile, extractCurrentCursorNotes\]\);/,
    `[xmlContent, zoom, isMobile, extractCurrentCursorNotes, renderMode]);`
);


fs.writeFileSync(path, code);
