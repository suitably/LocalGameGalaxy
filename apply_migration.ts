
import * as fs from 'fs';
import { CATEGORIES } from './src/games/imposter/logic/words.ts';
// We can't easily import words.ts if we want to overwrite it nicely without duplicating code.
// We will just constructing the file content string manually.

const aligned = JSON.parse(fs.readFileSync('aligned_words.json', 'utf8'));

// Format aligned words into Category structure
const newWords = [];
aligned.forEach((pair: any) => {
    // Add both words from the pair as separate entries
    // Pair is { en: [A, B], de: [A_de, B_de] }
    // We ensured A matches A_de.

    newWords.push({
        en: pair.en[0],
        de: pair.de[0]
    });
    newWords.push({
        en: pair.en[1],
        de: pair.de[1]
    });
});

// Construct the new file content based on known structure
// We will read existing words.ts as text to preserve existing categories?
// Or just hardcode them since we saw them?
// Hardcoding is risky if I missed something (I saw 3 categories).
// Better: Read words.ts, remove the last "];", append new category stuff, close it.

let existingContent = fs.readFileSync('./src/games/imposter/logic/words.ts', 'utf8');
existingContent = existingContent.trim();
// Remove last semicolon if present
if (existingContent.endsWith(';')) existingContent = existingContent.slice(0, -1);
// Remove last bracket
const lastBracket = existingContent.lastIndexOf(']');
if (lastBracket !== -1) {
    existingContent = existingContent.substring(0, lastBracket);
}

const newCategory = {
    id: 'general',
    name: { en: 'General', de: 'Allgemein' },
    words: newWords
};

const newCategoryString = JSON.stringify(newCategory, null, 4);

// Append
const finalContent = `${existingContent},
    ${newCategoryString}
];
`;

fs.writeFileSync('./src/games/imposter/logic/words.ts', finalContent);
console.log('Updated words.ts');
