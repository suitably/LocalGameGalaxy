
import wordPairsEN from './src/games/imposter/logic/wordPairs_en.ts';
import wordPairsDE from './src/games/imposter/logic/wordPairs_de.ts';

let deIndex = 0;
for (let enIndex = 0; enIndex < wordPairsEN.length; enIndex++) {
    const enPair = wordPairsEN[enIndex];
    const dePair = wordPairsDE[deIndex];
    if (!dePair) {
        console.log(`DE exhausted at index ${deIndex}. EN continues with ${enPair}`);
        continue;
    }

    // Heuristics:
    // If exact match (some words are same in both languages e.g. names) -> Good
    // If not, print it to manual check?
    // Let's just print every line where they don't look "connected".
    // Or simpler: Print a window around the index where I suspect a shift.
    // I know Netflix/Cinema is missing. That was around index 296.
    // Let's print everything from 290 to end.
    if (enIndex > 200) {
        // console.log(`${enIndex} EN: ${enPair} | DE: ${dePair}`);
    }
}

// Just print the lines around the mismatch I suspected
console.log('--- Checking around index 290 ---');
for (let i = 290; i < 300; i++) {
    console.log(`Index ${i}: EN=${wordPairsEN[i]} | DE=${wordPairsDE[i]}`);
}
