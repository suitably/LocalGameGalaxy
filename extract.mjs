import fs from 'fs';
const content = fs.readFileSync('src/i18n.ts', 'utf8');

// Strip the imports and exports, leaving just the resources object
let script = content.replace(/import .*? from .*?;/g, '');
script = script.replace(/i18n[\s\S]*$/, '');

// Create a function that returns the resources
script += '\nreturn resources;';
const getResources = new Function(script);
const resources = getResources();

fs.mkdirSync('public/locales/en', { recursive: true });
fs.writeFileSync('public/locales/en/translation.json', JSON.stringify(resources.en.translation, null, 2));

fs.mkdirSync('public/locales/de', { recursive: true });
fs.writeFileSync('public/locales/de/translation.json', JSON.stringify(resources.de.translation, null, 2));
console.log('Extraction complete');
