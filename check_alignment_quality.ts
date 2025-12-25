
import wordPairsEN from './src/games/imposter/logic/wordPairs_en.ts';
import wordPairsDE from './src/games/imposter/logic/wordPairs_de.ts';

// Simple heuristic: check if any of the words look similar
function isSimilar(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    if (s1 === s2) return true;
    if (s1.includes(s2) || s2.includes(s1)) return true;
    // Check first letter
    if (s1[0] === s2[0]) return true;
    return false;
}

let mismatchCount = 0;
const minLen = Math.min(wordPairsEN.length, wordPairsDE.length);

for (let i = 0; i < minLen; i++) {
    const en = wordPairsEN[i];
    const de = wordPairsDE[i];

    const w1Match = isSimilar(en[0], de[0]);
    const w2Match = isSimilar(en[1], de[1]);

    // Cross match? (e.g. Dog, Cat vs Katze, Hund - unlikely but possible order diff)
    const crossMatch = (isSimilar(en[0], de[1]) && isSimilar(en[1], de[0]));

    if (!w1Match && !w2Match && !crossMatch) {
        console.log(`Mismatch at ${i}: [${en}] vs [${de}]`);
        mismatchCount++;
    }
}

console.log(`Total mismatches with heuristic: ${mismatchCount} / ${minLen}`);
