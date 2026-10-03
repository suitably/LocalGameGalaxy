const fs = require('fs');

const path = 'src/games/melodiq-notes/components/ControlPanel.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /<\/FormControl>\n\n\s*\{\/\* Input Source Switcher \*\/\}/,
    `</FormControl>
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
                )}

                {/* Input Source Switcher */}`
);

fs.writeFileSync(path, code);
