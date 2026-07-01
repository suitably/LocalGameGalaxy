import os
import re

components_dir = 'src/games/melodiq/components'
files_to_process = [
    'HardwareMicSetup.tsx', 'HelperConnection.tsx', 'HostQueueDrawer.tsx',
    'LatencyCalibrator.tsx', 'LocalSongsView.tsx', 'MiniPlayer.tsx',
    'OnlineSongsView.tsx', 'PhoneJoinPrompt.tsx', 'PhoneQueueBridge.tsx',
    'PlaybackManager.tsx', 'QueueParticipantDialog.tsx', 'RemoteLatencyCalibrator.tsx',
    'SessionSetup.tsx', 'SongCard.tsx', 'SongListItem.tsx', 'TVModeButton.tsx',
    'UserProfilesManager.tsx', 'YouTubeSearchDialog.tsx'
]

translations = {
    ">Hardware Microphones<": ">{t('melodiq.hardware_mic')}<",
    ">Use this if you have physical microphones connected to this device.<": ">{t('melodiq.hardware_mic_desc')}<",
    ">Enable Mic <": ">{t('melodiq.enable_mic')} <",
    ">Hardware Mic Setup<": ">{t('melodiq.hardware_mic_setup')}<",
    ">Host TV Setup<": ">{t('melodiq.host_tv_setup')}<",
    ">Connect Phone<": ">{t('melodiq.connect_phone')}<",
    ">Scan QR Code<": ">{t('melodiq.scan_qr')}<",
    ">Queue<": ">{t('melodiq.queue')}<",
    ">Playlists<": ">{t('melodiq.playlists')}<",
    ">History<": ">{t('melodiq.history')}<",
    ">Settings<": ">{t('melodiq.settings')}<",
    ">Join<": ">{t('melodiq.join')}<",
    ">Host<": ">{t('melodiq.host')}<",
    ">Play<": ">{t('melodiq.play')}<",
    ">Pause<": ">{t('melodiq.pause')}<",
    ">Skip<": ">{t('melodiq.skip')}<",
    ">Add to Queue<": ">{t('melodiq.add_to_queue')}<",
    ">Remove<": ">{t('melodiq.remove')}<",
    ">Microphone<": ">{t('melodiq.microphone')}<",
    ">Latency<": ">{t('melodiq.latency')}<",
    ">Calibration<": ">{t('melodiq.calibration')}<",
    ">Calibrate<": ">{t('melodiq.calibrate')}<",
    ">Score<": ">{t('melodiq.score')}<",
    ">No songs found.<": ">{t('melodiq.no_songs')}<",
    ">Loading...<": ">{t('melodiq.loading')}<",
    ">An error occurred.<": ">{t('melodiq.error')}<",
    ">Connecting...<": ">{t('melodiq.connecting')}<",
    ">Connected<": ">{t('melodiq.connected')}<",
    ">Disconnected<": ">{t('melodiq.disconnected')}<",
    ">Volume<": ">{t('melodiq.volume')}<",
    ">Pitch<": ">{t('melodiq.pitch')}<",
    ">Lyrics<": ">{t('melodiq.lyrics')}<",
    ">TV Mode<": ">{t('melodiq.tv_mode')}<",
    ">Phone Mode<": ">{t('melodiq.phone_mode')}<",
    ">Host Queue<": ">{t('melodiq.host_queue')}<",
    "\"Host Queue\"": "{t('melodiq.host_queue')}",
    ">Close<": ">{t('common.close')}<",
    "\"Close\"": "{t('common.close')}",
    ">Clear<": ">{t('melodiq.clear')}<",
    "\"Clear\"": "{t('melodiq.clear')}",
    "Empty Queue": "{t('melodiq.empty_queue')}",
    "No songs in the queue yet.": "{t('melodiq.queue_empty_desc')}",
    "Song History": "{t('melodiq.history')}",
    "History": "{t('melodiq.history')}"
}

for filename in files_to_process:
    filepath = os.path.join(components_dir, filename)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    for k, v in translations.items():
        content = content.replace(k, v)
        
    # Check if anything changed
    if content != original_content:
        # Add useTranslation if not present
        if "useTranslation" not in content:
            if "import { useState" in content:
                content = content.replace("import { useState", "import { useTranslation } from 'react-i18next';\nimport { useState", 1)
            elif "import React" in content:
                content = content.replace("import React", "import React from 'react';\nimport { useTranslation } from 'react-i18next';", 1)
            else:
                content = "import { useTranslation } from 'react-i18next';\n" + content
                
        # Insert hook if missing
        if "const { t } = useTranslation();" not in content:
            # Find the component definition
            match = re.search(r'(const \w+:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*{|export const \w+\s*=\s*\([^)]*\)\s*=>\s*{|export function \w+\([^)]*\)\s*{)', content)
            if match:
                insert_pos = match.end()
                content = content[:insert_pos] + "\n    const { t } = useTranslation();" + content[insert_pos:]

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Patch script finished.")
