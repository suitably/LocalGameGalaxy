import re

with open('src/games/melodiq/components/HelperConnection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';")
content = content.replace("export const HelperConnection: React.FC = () => {", "export const HelperConnection: React.FC = () => {\n    const { t } = useTranslation();")

replacements = {
    "'Connecting...'": "t('melodiq.helper.connecting', 'Connecting...')",
    "`Connected! Found ${data.count || 0} songs.`": "t('melodiq.helper.connected', { count: data.count || 0, defaultValue: `Connected! Found ${data.count || 0} songs.` })",
    "'Unauthorized. Check Token.'": "t('melodiq.helper.unauthorized', 'Unauthorized. Check Token.')",
    "`Error: ${res.statusText}`": "t('melodiq.helper.error_status', { status: res.statusText, defaultValue: `Error: ${res.statusText}` })",
    "'Connection Failed. Check URL or Network.'": "t('melodiq.helper.conn_failed', 'Connection Failed. Check URL or Network.')",
    "Helper Server Connection": "{t('melodiq.helper.title', 'Helper Server Connection')}",
    "Connect to a Melodiq Helper (PC/Server) to load 8000+ songs.\n                Enter the URL (e.g., http://192.168.1.50:3000) and the Security Token shown on the Helper screen.": "{t('melodiq.helper.desc', 'Connect to a Melodiq Helper (PC/Server) to load 8000+ songs. Enter the URL (e.g., http://192.168.1.50:3000) and the Security Token shown on the Helper screen.')}",
    'label="Enable Helper Connection"': 'label={t("melodiq.helper.enable", "Enable Helper Connection")}',
    'label="Server URL"': 'label={t("melodiq.helper.server_url", "Server URL")}',
    'label="Security Token"': 'label={t("melodiq.helper.token", "Security Token")}',
    'placeholder="Copy from Helper Console/Screen"': 'placeholder={t("melodiq.helper.token_placeholder", "Copy from Helper Console/Screen")}',
    'Test Connection': '{t("melodiq.helper.test", "Test Connection")}'
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('src/games/melodiq/components/HelperConnection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

