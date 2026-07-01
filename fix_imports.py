import re

files_to_fix = [
    'src/games/melodiq/components/HardwareMicSetup.tsx',
    'src/games/melodiq/components/QueueParticipantDialog.tsx',
    'src/games/melodiq/components/SessionSetup.tsx'
]

for filepath in files_to_fix:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix HardwareMicSetup & SessionSetup
    content = content.replace("import { useTranslation } from 'react-i18next';, { ", "import React, { ")
    content = content.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';")
    content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useTranslation } from 'react-i18next';")

    # Fix QueueParticipantDialog
    content = content.replace("import { useTranslation } from 'react-i18next'; from 'react';", "import React from 'react';\nimport { useTranslation } from 'react-i18next';")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed imports")
