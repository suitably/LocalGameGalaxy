const fs = require('fs');
let code = fs.readFileSync('src/games/werewolf/logic/utils.bench.ts', 'utf8');
code = code.replace(/import \{ bench\, describe \} from 'vitest';/g, "import { bench, describe } from 'vitest';");
fs.writeFileSync('src/games/werewolf/logic/utils.bench.ts', code);
