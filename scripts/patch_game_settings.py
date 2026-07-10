import re

with open('src/games/melodiq/components/GameSettingsPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useTranslation import
if "import { useTranslation }" not in content:
    content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useTranslation } from 'react-i18next';")

# Add t hook
if "const { t } = useTranslation();" not in content:
    content = content.replace("const [newPlayerCount, setNewPlayerCount] = useState('');", "const { t } = useTranslation();\n    const [newPlayerCount, setNewPlayerCount] = useState('');")

# Replacements
replacements = {
    "Game Settings": "{t('melodiq.settings_panel.title')}",
    "Custom Layouts per Player Count": "{t('melodiq.settings_panel.custom_layouts')}",
    "Define rows and columns (e.g., '1.3' for 1 top, 3 bottom). Missing counts use auto.": "{t('melodiq.settings_panel.custom_layouts_desc')}",
    "Players:": "{t('melodiq.settings_panel.players')}:",
    "label=\"Players\"": "label={t('melodiq.settings_panel.players')}",
    "label=\"Layout (e.g. 2.2)\"": "label={t('melodiq.settings_panel.layout_example')}",
    ">Add<": ">{t('melodiq.settings_panel.add')}<",
    "Default View Mode": "{t('melodiq.settings_panel.default_view')}",
    ">List View<": ">{t('melodiq.settings_panel.list_view')}<",
    ">Grid View<": ">{t('melodiq.settings_panel.grid_view')}<",
    "Preferred song list layout on startup.": "{t('melodiq.settings_panel.default_view_desc')}",
    "Autoplay Settings": "{t('melodiq.settings_panel.autoplay')}",
    "Autoplay (No Singers)": "{t('melodiq.settings_panel.autoplay_no_singers')}",
    "Automatically skip to the next song when nobody is singing (Jukebox mode).": "{t('melodiq.settings_panel.autoplay_no_singers_desc')}",
    "Autoplay (With Singers)": "{t('melodiq.settings_panel.autoplay_singers')}",
    "Automatically skip after scores are shown (Party mode).": "{t('melodiq.settings_panel.autoplay_singers_desc')}",
    ">Off / Manual<": ">{t('melodiq.settings_panel.off_manual')}<",
    "label=\"Autoplay (No Singers)\"": "label={t('melodiq.settings_panel.autoplay_no_singers')}",
    "label=\"Autoplay (With Singers)\"": "label={t('melodiq.settings_panel.autoplay_singers')}",
    "Default Click Action (When playing)": "{t('melodiq.settings_panel.default_click')}",
    ">Play Now<": ">{t('melodiq.settings_panel.play_now')}<",
    ">Play Next<": ">{t('melodiq.settings_panel.play_next')}<",
    ">Add to Queue<": ">{t('melodiq.settings_panel.add_queue')}<",
    "What happens when you click a song while another is already playing.": "{t('melodiq.settings_panel.default_click_desc')}",
    "Card Size & Density": "{t('melodiq.settings_panel.card_size')}",
    ">Small<": ">{t('melodiq.settings_panel.small')}<",
    ">Medium<": ">{t('melodiq.settings_panel.medium')}<",
    ">Large<": ">{t('melodiq.settings_panel.large')}<",
    ">Custom<": ">{t('melodiq.settings_panel.custom')}<",
    "Max Items per Row (Large Screen):": "{t('melodiq.settings_panel.max_items')}:",
    "Set the maximum number of songs in a row. The game will automatically adjust for smaller screens.": "{t('melodiq.settings_panel.max_items_desc')}",
    "Golden Note Multiplier:": "{t('melodiq.settings_panel.golden_multiplier')}:",
    "Multiplier for golden notes (marked with *).": "{t('melodiq.settings_panel.golden_multiplier_desc')}",
    "Song Volume:": "{t('melodiq.settings_panel.song_volume')}:",
    "Vocals Volume (If Separated):": "{t('melodiq.settings_panel.vocals_volume')}:",
    "Master Volume:": "{t('melodiq.settings_panel.master_volume')}:",
    "label=\"Show Pitch Note Labels\"": "label={t('melodiq.settings_panel.show_pitch')}",
    "Developer / Debug Options": "{t('melodiq.settings_panel.dev_options')}",
    "label=\"Show Debug Overlay\"": "label={t('melodiq.settings_panel.show_debug')}",
    "label=\"Show Tech/Dev Slider\"": "label={t('melodiq.settings_panel.show_dev_slider')}",
    "label=\"Show Video Error Messages\"": "label={t('melodiq.settings_panel.show_video_errors')}"
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Replace the seconds options dynamically
content = re.sub(r">(\d+) Seconds<", r">{t('melodiq.settings_panel.seconds', { count: \1 })}<", content)

with open('src/games/melodiq/components/GameSettingsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

