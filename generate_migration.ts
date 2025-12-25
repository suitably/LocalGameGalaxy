
import wordPairsEN from './src/games/imposter/logic/wordPairs_en.ts';
import wordPairsDE from './src/games/imposter/logic/wordPairs_de.ts';
import * as fs from 'fs';

interface Pair {
    words: string[];
    index: number;
}

// Helper for string similarity
function similarity(s1: string, s2: string): number {
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    // Levenshtein-like check for typos/cognates
    if (s1.length > 2 && s2.length > 2) {
        if (s1.startsWith(s2.substring(0, 3))) return 0.6;
    }
    return 0.0;
}

function pairSimilarity(en: string[], de: string[]): number {
    if (!en || !de) return 0;
    const s1 = similarity(en[0], de[0]);
    const s2 = similarity(en[1], de[1]);
    const score1 = s1 + s2;

    const c1 = similarity(en[0], de[1]);
    const c2 = similarity(en[1], de[0]);
    const score2 = c1 + c2;

    return Math.max(score1, score2);
}

// 1. Find Anchors
const anchors: { enIndex: number, deIndex: number }[] = [];
const usedDE = new Set<number>();

for (let i = 0; i < wordPairsEN.length; i++) {
    const enPair = wordPairsEN[i];
    let bestMatch = -1;
    let bestScore = 0;

    for (let j = 0; j < wordPairsDE.length; j++) {
        if (usedDE.has(j)) continue;
        const score = pairSimilarity(enPair, wordPairsDE[j]);
        if (score > 1.2) {
            if (score > bestScore) {
                bestScore = score;
                bestMatch = j;
            }
        }
    }

    if (bestMatch !== -1) {
        anchors.push({ enIndex: i, deIndex: bestMatch });
        usedDE.add(bestMatch);
    }
}

anchors.sort((a, b) => a.enIndex - b.enIndex);

// 2. Fill Gaps
const enToDeMap = new Map<number, number>();
anchors.forEach(a => enToDeMap.set(a.enIndex, a.deIndex));

for (let k = 0; k <= anchors.length; k++) {
    const prevAnchor = k === 0 ? { enIndex: -1, deIndex: -1 } : anchors[k - 1];
    const nextAnchor = k === anchors.length ? { enIndex: wordPairsEN.length, deIndex: wordPairsDE.length } : anchors[k];

    const gapStartEn = prevAnchor.enIndex + 1;
    const gapEndEn = nextAnchor.enIndex;

    let gapStartDe = prevAnchor.deIndex + 1;
    let gapEndDe = nextAnchor.deIndex;

    // Check monotonicity just in case
    // We assume anchors are correct.
    const monotonic = gapEndDe >= gapStartDe;

    if (!monotonic) {
        // If anchors crossed, our range is invalid. Fallback to searching all unused.
        // Or pick valid range relative to sorted DE indices? No, assume global map.
    }

    const gapSizeEn = gapEndEn - gapStartEn;
    const gapSizeDe = gapEndDe - gapStartDe;

    if (monotonic && gapSizeEn === gapSizeDe && gapSizeEn > 0) {
        // Geometric match!
        for (let offset = 0; offset < gapSizeEn; offset++) {
            enToDeMap.set(gapStartEn + offset, gapStartDe + offset);
            usedDE.add(gapStartDe + offset);
        }
    } else {
        // Fallback search
        for (let i = gapStartEn; i < gapEndEn; i++) {
            const enPair = wordPairsEN[i];
            let bestMatch = -1;
            let bestScore = 0;

            const searchIndices = [];
            if (monotonic) {
                for (let j = gapStartDe; j < gapEndDe; j++) {
                    if (!usedDE.has(j)) searchIndices.push(j);
                }
            } else {
                for (let j = 0; j < wordPairsDE.length; j++) {
                    if (!usedDE.has(j)) searchIndices.push(j);
                }
            }

            for (const j of searchIndices) {
                const score = pairSimilarity(enPair, wordPairsDE[j]);
                if (score > 0.6 && score > bestScore) {
                    bestScore = score;
                    bestMatch = j;
                }
            }

            if (bestMatch !== -1) {
                enToDeMap.set(i, bestMatch);
                usedDE.add(bestMatch);
            }
        }
    }
}

// Generate Output
const finalOutput = [];
const missingOutput = [];

for (let i = 0; i < wordPairsEN.length; i++) {
    const en = wordPairsEN[i];
    if (enToDeMap.has(i)) {
        const deIndex = enToDeMap.get(i)!;
        const de = wordPairsDE[deIndex];
        finalOutput.push({ en, de });
    } else {
        missingOutput.push({ index: i, en: en });
    }
}

fs.writeFileSync('aligned_words.json', JSON.stringify(finalOutput, null, 2));
fs.writeFileSync('missing_words.json', JSON.stringify(missingOutput, null, 2));

console.log(`Matched: ${finalOutput.length}`);
console.log(`Missing: ${missingOutput.length}`);
