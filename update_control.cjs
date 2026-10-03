const fs = require('fs');

const path = 'src/games/melodiq-notes/components/ControlPanel.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /playMode: PlayMode;/,
    `playMode: PlayMode;
    renderMode?: 'horizontal' | 'vertical';`
);

code = code.replace(
    /onPlayModeChange: \(mode: PlayMode\) => void;/,
    `onPlayModeChange: (mode: PlayMode) => void;
    onRenderModeChange?: (mode: 'horizontal' | 'vertical') => void;`
);

code = code.replace(
    /onPlayModeChange,\n\s*onInputSourceChange,/,
    `onPlayModeChange,
    onRenderModeChange,
    onInputSourceChange,`
);

code = code.replace(
    /playMode,\n\s*inputSource,/,
    `playMode,
    renderMode = 'vertical',
    inputSource,`
);


code = code.replace(
    /<FormControl size="small" sx=\{\{ minWidth: 150, width: \{ xs: '100%', md: 'auto' \} \}\}>\n\s*<InputLabel id="mode-select-label">\{t\('games\.melodiq_notes\.mode'\)\}<\/InputLabel>\n\s*<Select\n\s*labelId="mode-select-label"\n\s*value=\{playMode\}\n\s*label=\{t\('games\.melodiq_notes\.mode'\)\}\n\s*onChange=\{\(e\) => onPlayModeChange\(e\.target\.value as PlayMode\)\}\n\s*>\n\s*<MenuItem value="continuous">\{t\('games\.melodiq_notes\.continuous_mode'\)\}<\/MenuItem>\n\s*<MenuItem value="wait">\{t\('games\.melodiq_notes\.wait_mode'\)\}<\/MenuItem>\n\s*<\/Select>\n\s*<\/FormControl>/,
    `<FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
                    <InputLabel id="mode-select-label">{t('games.melodiq_notes.mode')}</InputLabel>
                    <Select
                        labelId="mode-select-label"
                        value={playMode}
                        label={t('games.melodiq_notes.mode')}
                        onChange={(e) => onPlayModeChange(e.target.value as PlayMode)}
                    >
                        <MenuItem value="continuous">{t('games.melodiq_notes.continuous_mode')}</MenuItem>
                        <MenuItem value="wait">{t('games.melodiq_notes.wait_mode')}</MenuItem>
                    </Select>
                </FormControl>

                {onRenderModeChange && (
                    <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
                        <InputLabel id="render-select-label">{t('games.melodiq_notes.render_mode', 'Layout')}</InputLabel>
                        <Select
                            labelId="render-select-label"
                            value={renderMode}
                            label={t('games.melodiq_notes.render_mode', 'Layout')}
                            onChange={(e) => onRenderModeChange(e.target.value as 'horizontal' | 'vertical')}
                        >
                            <MenuItem value="vertical">{t('games.melodiq_notes.render_vertical', 'Vertical')}</MenuItem>
                            <MenuItem value="horizontal">{t('games.melodiq_notes.render_horizontal', 'Horizontal')}</MenuItem>
                        </Select>
                    </FormControl>
                )}`
);

fs.writeFileSync(path, code);
