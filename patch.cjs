const fs = require('fs');
let code = fs.readFileSync('src/games/melodiq/components/PhoneQueueBridge.tsx', 'utf8');

code = code.replace(/const storedRoles = localStorage\.getItem\('melodiq_client_roles'\);\n\s*let role = 'singer';\n\s*if \(storedRoles && peer\.deviceId\) \{\n\s*try \{ role = JSON\.parse\(storedRoles\)\[peer\.deviceId\] \|\| 'singer'; \} catch \(e\) \{\}\n\s*\}/g, "const role = getRoleForDevice(peer.deviceId);");

fs.writeFileSync('src/games/melodiq/components/PhoneQueueBridge.tsx', code);
