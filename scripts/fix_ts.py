import os
import re

def fix_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
    with open(filepath, 'w') as f:
        f.write(content)

base = '/home/deck/Projects/LocalGameGalaxy/src/games/melodiq/'

fix_file(base + 'MelodiqGame.tsx', [
    (r'const \{ t \} = useTranslation\(\);\n', ''),
    (r'queueLength: queue\.length, loadingProgress, refreshSongs, setShowQueueDrawer,', 'queueLength: queue.length, loadingProgress: loadingProgress as any, refreshSongs, setShowQueueDrawer,')
])

fix_file(base + 'components/GameSettingsPanel.tsx', [
    (r"import \{ useState, useEffect \} from 'react';", "import { useState } from 'react';")
])

fix_file(base + 'components/LibraryEmptyState.tsx', [
    (r'hasConnectionError, isLoading, songsLength, isOnlineSearch, refreshSongs', 'hasConnectionError, songsLength, isOnlineSearch, refreshSongs')
])

fix_file(base + 'components/MelodiqSearchBar.tsx', [
    (r'availableYears, availableLanguages,', '')
])

fix_file(base + 'components/OnlineSongsView.tsx', [
    (r"import \{ type SongMeta \} from '\.\./db';\n", ''),
    (r'onMenuClick=\{\(e\) => \{', 'onMenuClick={() => {')
])

fix_file(base + 'gameplay/MelodiqSession.tsx', [
    (r'layoutOverride,\n', ''),
    (r'const \[scores, setScores\] = useState<Record<string, number>>\(\{\}\);\n', ''),
    (r'if \(mounted\) setParsedSong\(parsed\);', 'if (mounted && parsed) setParsedSong(parsed as any);'),
    (r'playPromiseRef,\n', ''),
    (r'playPromiseRef\n', ''),
    (r'const \{ handleSongEnd \} = useSessionEnd\(\{', 'useSessionEnd({')
])

def fix_refs(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace('React.RefObject<HTMLAudioElement>', 'React.RefObject<HTMLAudioElement | null>')
    content = content.replace('React.RefObject<HTMLVideoElement>', 'React.RefObject<HTMLVideoElement | null>')
    content = content.replace('React.RefObject<ScoreDisplayHandle>', 'React.RefObject<ScoreDisplayHandle | null>')
    content = content.replace('React.RefObject<HTMLDivElement>', 'React.RefObject<HTMLDivElement | null>')
    with open(filepath, 'w') as f:
        f.write(content)

fix_refs(base + 'gameplay/hooks/usePlaybackControls.ts')
fix_refs(base + 'gameplay/hooks/useScoringEngine.ts')
fix_refs(base + 'gameplay/hooks/useSessionEnd.ts')
fix_refs(base + 'gameplay/hooks/usePassiveSync.ts')
fix_refs(base + 'gameplay/hooks/useSessionPlayers.ts')

fix_file(base + 'gameplay/hooks/usePlaybackControls.ts', [
    (r"import \{ useCallback, useRef, type MutableRefObject \} from 'react';", "import { useCallback, useRef } from 'react';")
])

fix_file(base + 'gameplay/hooks/useScoringEngine.ts', [
    (r'const activeNote = notesSource\.find\(\(n\) =>', 'const activeNote = notesSource.find((n: any) =>')
])

fix_file(base + 'gameplay/hooks/useSessionPlayers.ts', [
    (r"import \{ useWebRTC \} from '\.\./\.\./audio/WebRTCContext';\n", '')
])

fix_file(base + 'hooks/useMelodiqHeader.tsx', [
    (r"import React, \{ useEffect \} from 'react';", "import { useEffect } from 'react';")
])

fix_file(base + 'hooks/useSongDownloader.ts', [
    (r"import \{ useState \} from 'react';\n", "")
])

print("Fixed!")
