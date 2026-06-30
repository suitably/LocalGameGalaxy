const path = require('path');
const fs = require('fs');
const config = require('./server/config');
console.log("Config directories:", config.directories);

const resolveSecurePath = (userPath) => {
    if (!userPath) return null;
    const safePath = path.normalize(userPath);
    console.log("Safe path:", safePath);
    const isAllowed = config.directories.some(dir => safePath.startsWith(path.normalize(dir)));
    console.log("Is allowed:", isAllowed);
    console.log("Exists:", fs.existsSync(safePath));
    return isAllowed && fs.existsSync(safePath) ? safePath : null;
};

resolveSecurePath('/app/music/Alligatoah - Willst du/Alligatoah - Willst du.mp3');
