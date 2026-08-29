import type { QwixxSheetType, SheetDefinition, SheetRowDefinition, SheetCell, RowColor } from './types';

const createSimpleCells = (numbers: number[], color: RowColor): SheetCell[] => {
    return numbers.map((num) => ({
        number: num,
        color
    }));
};

// 1. Qwixx Classic
const classicRows: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: createSimpleCells([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'red'),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: createSimpleCells([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'yellow'),
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: createSimpleCells([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2], 'green'),
        lockNumber: 2,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: createSimpleCells([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2], 'blue'),
        lockNumber: 2,
        lockColor: 'blue'
    }
];

// 2. Qwixx Gemixxt — Variante A (Mehrfarbige Reihen)
// Preset 1 (Offizieller Block 1)
const gemixxtARows1: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [
            { number: 2, color: 'red' }, { number: 3, color: 'red' }, { number: 4, color: 'red' }, { number: 5, color: 'red' },
            { number: 6, color: 'yellow' }, { number: 7, color: 'yellow' }, { number: 8, color: 'yellow' },
            { number: 9, color: 'green' }, { number: 10, color: 'green' },
            { number: 11, color: 'blue' }, { number: 12, color: 'blue' }
        ],
        lockNumber: 12,
        lockColor: 'blue'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [
            { number: 2, color: 'yellow' }, { number: 3, color: 'yellow' }, { number: 4, color: 'yellow' },
            { number: 5, color: 'green' }, { number: 6, color: 'green' }, { number: 7, color: 'green' },
            { number: 8, color: 'blue' }, { number: 9, color: 'blue' }, { number: 10, color: 'blue' },
            { number: 11, color: 'red' }, { number: 12, color: 'red' }
        ],
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [
            { number: 12, color: 'green' }, { number: 11, color: 'green' }, { number: 10, color: 'green' }, { number: 9, color: 'green' },
            { number: 8, color: 'blue' }, { number: 7, color: 'blue' }, { number: 6, color: 'blue' },
            { number: 5, color: 'red' }, { number: 4, color: 'red' },
            { number: 3, color: 'yellow' }, { number: 2, color: 'yellow' }
        ],
        lockNumber: 2,
        lockColor: 'yellow'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [
            { number: 12, color: 'blue' }, { number: 11, color: 'blue' }, { number: 10, color: 'blue' },
            { number: 9, color: 'red' }, { number: 8, color: 'red' }, { number: 7, color: 'red' },
            { number: 6, color: 'yellow' }, { number: 5, color: 'yellow' }, { number: 4, color: 'yellow' },
            { number: 3, color: 'green' }, { number: 2, color: 'green' }
        ],
        lockNumber: 2,
        lockColor: 'green'
    }
];

// Preset 2 (Offizieller Block 2)
const gemixxtARows2: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [
            { number: 2, color: 'blue' }, { number: 3, color: 'blue' }, { number: 4, color: 'blue' },
            { number: 5, color: 'red' }, { number: 6, color: 'red' }, { number: 7, color: 'red' }, { number: 8, color: 'red' },
            { number: 9, color: 'yellow' }, { number: 10, color: 'yellow' }, { number: 11, color: 'yellow' },
            { number: 12, color: 'green' }
        ],
        lockNumber: 12,
        lockColor: 'green'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [
            { number: 2, color: 'green' }, { number: 3, color: 'green' }, { number: 4, color: 'green' }, { number: 5, color: 'green' },
            { number: 6, color: 'blue' }, { number: 7, color: 'blue' }, { number: 8, color: 'blue' },
            { number: 9, color: 'red' }, { number: 10, color: 'red' },
            { number: 11, color: 'yellow' }, { number: 12, color: 'yellow' }
        ],
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [
            { number: 12, color: 'red' }, { number: 11, color: 'red' }, { number: 10, color: 'red' },
            { number: 9, color: 'yellow' }, { number: 8, color: 'yellow' }, { number: 7, color: 'yellow' },
            { number: 6, color: 'green' }, { number: 5, color: 'green' },
            { number: 4, color: 'blue' }, { number: 3, color: 'blue' }, { number: 2, color: 'blue' }
        ],
        lockNumber: 2,
        lockColor: 'blue'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [
            { number: 12, color: 'yellow' }, { number: 11, color: 'yellow' },
            { number: 10, color: 'green' }, { number: 9, color: 'green' }, { number: 8, color: 'green' },
            { number: 7, color: 'blue' }, { number: 6, color: 'blue' }, { number: 5, color: 'blue' },
            { number: 4, color: 'red' }, { number: 3, color: 'red' }, { number: 2, color: 'red' }
        ],
        lockNumber: 2,
        lockColor: 'red'
    }
];

// 3. Qwixx Gemixxt — Variante B (Gemischte Zahlen)
// Preset 1 (Offizieller Block 1)
const gemixxtBRows1: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: createSimpleCells([5, 7, 11, 9, 12, 3, 8, 10, 4, 6, 2], 'red'),
        lockNumber: 2,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: createSimpleCells([9, 12, 4, 6, 7, 2, 5, 8, 11, 3, 10], 'yellow'),
        lockNumber: 10,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: createSimpleCells([8, 2, 10, 12, 6, 9, 7, 4, 5, 11, 3], 'green'),
        lockNumber: 3,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: createSimpleCells([10, 6, 2, 8, 3, 11, 12, 5, 9, 7, 4], 'blue'),
        lockNumber: 4,
        lockColor: 'blue'
    }
];

// Preset 2 (Offizieller Block 2)
const gemixxtBRows2: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: createSimpleCells([4, 11, 8, 2, 6, 9, 12, 5, 10, 7, 3], 'red'),
        lockNumber: 3,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: createSimpleCells([6, 3, 10, 7, 11, 4, 8, 12, 2, 9, 5], 'yellow'),
        lockNumber: 5,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: createSimpleCells([11, 5, 9, 3, 7, 12, 4, 8, 2, 10, 6], 'green'),
        lockNumber: 6,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: createSimpleCells([7, 12, 5, 9, 2, 8, 4, 10, 3, 6, 11], 'blue'),
        lockNumber: 11,
        lockColor: 'blue'
    }
];

// Preset 3 (Offizieller Block 3)
const gemixxtBRows3: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: createSimpleCells([9, 4, 6, 11, 3, 8, 12, 7, 2, 10, 5], 'red'),
        lockNumber: 5,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: createSimpleCells([8, 11, 5, 2, 9, 6, 3, 10, 12, 4, 7], 'yellow'),
        lockNumber: 7,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: createSimpleCells([3, 8, 12, 6, 10, 4, 9, 2, 7, 5, 11], 'green'),
        lockNumber: 11,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: createSimpleCells([5, 2, 7, 10, 4, 12, 6, 3, 11, 8, 9], 'blue'),
        lockNumber: 9,
        lockColor: 'blue'
    }
];

// 4. Qwixx Big Points (Zusatzreihen)
const bigPointsBonusRows: SheetRowDefinition[] = [
    {
        id: 'bonus_red_yellow',
        defaultColor: 'red',
        isBonusRow: true,
        linkedRows: ['red', 'yellow'],
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'red'
        })),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'bonus_green_blue',
        defaultColor: 'green',
        isBonusRow: true,
        linkedRows: ['green', 'blue'],
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'green'
        })),
        lockNumber: 2,
        lockColor: 'green'
    }
];

// 5. Qwixx Connected — Treppe
const connectedStairsRows: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'red',
            isStair: [2, 3, 4].includes(num)
        })),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'yellow',
            isStair: [5, 6, 7].includes(num)
        })),
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'green',
            isStair: [7, 6, 5].includes(num)
        })),
        lockNumber: 2,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'blue',
            isStair: [4, 3, 2].includes(num)
        })),
        lockNumber: 2,
        lockColor: 'blue'
    }
];

// 6. Qwixx Connected — Kette
const connectedChainsRows: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'red',
            chainId: num === 4 ? 'chain_1' : num === 9 ? 'chain_2' : undefined
        })),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'yellow',
            chainId: num === 6 ? 'chain_1' : num === 3 ? 'chain_3' : num === 11 ? 'chain_5' : undefined
        })),
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'green',
            chainId: num === 10 ? 'chain_3' : num === 6 ? 'chain_4' : num === 3 ? 'chain_5' : undefined
        })),
        lockNumber: 2,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'blue',
            chainId: num === 7 ? 'chain_2' : num === 4 ? 'chain_4' : undefined
        })),
        lockNumber: 2,
        lockColor: 'blue'
    }
];

// 7. Qwixx Double — Zusatzkästchen
const doubleSubRows: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({ number: num, color: 'red', hasSubBox: true })),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({ number: num, color: 'yellow', hasSubBox: true })),
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({ number: num, color: 'green', hasSubBox: true })),
        lockNumber: 2,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({ number: num, color: 'blue', hasSubBox: true })),
        lockNumber: 2,
        lockColor: 'blue'
    }
];

// 8. Qwixx Double — Doppelzahlen
const doubleNumbersRows: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'red',
            isDouble: [6, 10].includes(num)
        })),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'yellow',
            isDouble: [4, 8].includes(num)
        })),
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'green',
            isDouble: [9, 5].includes(num)
        })),
        lockNumber: 2,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'blue',
            isDouble: [7, 3].includes(num)
        })),
        lockNumber: 2,
        lockColor: 'blue'
    }
];

// 9. Qwixx Bonus (Official Symbols: Self-Cross, Partner-Cross, Miss-Shield)
const bonusRowsDef: SheetRowDefinition[] = [
    {
        id: 'red',
        defaultColor: 'red',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'red',
            bonusEffect: num === 4
                ? { type: 'self_cross' }
                : num === 8
                    ? { type: 'partner_cross', targetColor: 'yellow' }
                    : undefined
        })),
        lockNumber: 12,
        lockColor: 'red'
    },
    {
        id: 'yellow',
        defaultColor: 'yellow',
        cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
            number: num,
            color: 'yellow',
            bonusEffect: num === 3
                ? { type: 'partner_cross', targetColor: 'blue' }
                : num === 9
                    ? { type: 'shield' }
                    : undefined
        })),
        lockNumber: 12,
        lockColor: 'yellow'
    },
    {
        id: 'green',
        defaultColor: 'green',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'green',
            bonusEffect: num === 10
                ? { type: 'self_cross' }
                : num === 5
                    ? { type: 'partner_cross', targetColor: 'red' }
                    : undefined
        })),
        lockNumber: 2,
        lockColor: 'green'
    },
    {
        id: 'blue',
        defaultColor: 'blue',
        cells: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((num) => ({
            number: num,
            color: 'blue',
            bonusEffect: num === 11
                ? { type: 'partner_cross', targetColor: 'green' }
                : num === 6
                    ? { type: 'shield' }
                    : undefined
        })),
        lockNumber: 2,
        lockColor: 'blue'
    }
];

// Helper: Shuffle array in place
function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function generateRandomSheetRows(): SheetRowDefinition[] {
    const colors: RowColor[] = ['red', 'yellow', 'green', 'blue'];
    const standardNumbers = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    return colors.map((color) => {
        const shuffled = shuffle(standardNumbers);
        const lockNumber = shuffled[shuffled.length - 1];
        return {
            id: color,
            defaultColor: color,
            cells: shuffled.map((num) => ({
                number: num,
                color
            })),
            lockNumber,
            lockColor: color
        };
    });
}

export const SHEET_DEFINITIONS: Record<QwixxSheetType, SheetDefinition> = {
    classic: {
        id: 'classic',
        nameKey: 'games.qwixx.sheets.classic.name',
        descriptionKey: 'games.qwixx.sheets.classic.desc',
        badgeKey: 'games.qwixx.sheets.classic.badge',
        rows: classicRows
    },
    gemixxt_a: {
        id: 'gemixxt_a',
        nameKey: 'games.qwixx.sheets.gemixxt_a.name',
        descriptionKey: 'games.qwixx.sheets.gemixxt_a.desc',
        badgeKey: 'games.qwixx.sheets.gemixxt_a.badge',
        rows: gemixxtARows1,
        presets: [gemixxtARows1, gemixxtARows2],
        presetNames: ['Block 1', 'Block 2']
    },
    gemixxt_b: {
        id: 'gemixxt_b',
        nameKey: 'games.qwixx.sheets.gemixxt_b.name',
        descriptionKey: 'games.qwixx.sheets.gemixxt_b.desc',
        badgeKey: 'games.qwixx.sheets.gemixxt_b.badge',
        rows: gemixxtBRows1,
        presets: [gemixxtBRows1, gemixxtBRows2, gemixxtBRows3],
        presetNames: ['Block 1', 'Block 2', 'Block 3']
    },
    big_points: {
        id: 'big_points',
        nameKey: 'games.qwixx.sheets.big_points.name',
        descriptionKey: 'games.qwixx.sheets.big_points.desc',
        badgeKey: 'games.qwixx.sheets.big_points.badge',
        rows: classicRows,
        hasBonusRows: true,
        bonusRows: bigPointsBonusRows
    },
    connected_stairs: {
        id: 'connected_stairs',
        nameKey: 'games.qwixx.sheets.connected_stairs.name',
        descriptionKey: 'games.qwixx.sheets.connected_stairs.desc',
        badgeKey: 'games.qwixx.sheets.connected_stairs.badge',
        rows: connectedStairsRows,
        hasStairScoring: true
    },
    connected_chains: {
        id: 'connected_chains',
        nameKey: 'games.qwixx.sheets.connected_chains.name',
        descriptionKey: 'games.qwixx.sheets.connected_chains.desc',
        badgeKey: 'games.qwixx.sheets.connected_chains.badge',
        rows: connectedChainsRows
    },
    double_sub: {
        id: 'double_sub',
        nameKey: 'games.qwixx.sheets.double_sub.name',
        descriptionKey: 'games.qwixx.sheets.double_sub.desc',
        badgeKey: 'games.qwixx.sheets.double_sub.badge',
        rows: doubleSubRows
    },
    double_numbers: {
        id: 'double_numbers',
        nameKey: 'games.qwixx.sheets.double_numbers.name',
        descriptionKey: 'games.qwixx.sheets.double_numbers.desc',
        badgeKey: 'games.qwixx.sheets.double_numbers.badge',
        rows: doubleNumbersRows
    },
    bonus: {
        id: 'bonus',
        nameKey: 'games.qwixx.sheets.bonus.name',
        descriptionKey: 'games.qwixx.sheets.bonus.desc',
        badgeKey: 'games.qwixx.sheets.bonus.badge',
        rows: bonusRowsDef
    },
    random_mix: {
        id: 'random_mix',
        nameKey: 'games.qwixx.sheets.random_mix.name',
        descriptionKey: 'games.qwixx.sheets.random_mix.desc',
        badgeKey: 'games.qwixx.sheets.random_mix.badge',
        rows: classicRows
    }
};

export const ALL_SHEET_TYPES: QwixxSheetType[] = [
    'classic',
    'gemixxt_a',
    'gemixxt_b',
    'big_points',
    'connected_stairs',
    'connected_chains',
    'double_sub',
    'double_numbers',
    'bonus',
    'random_mix'
];

export function getSheetDefinition(sheetType: QwixxSheetType = 'classic'): SheetDefinition {
    return SHEET_DEFINITIONS[sheetType] || SHEET_DEFINITIONS.classic;
}

export function getSheetRows(
    sheetType: QwixxSheetType = 'classic',
    presetIndex?: number,
    customRows?: SheetRowDefinition[]
): SheetRowDefinition[] {
    if (customRows && customRows.length > 0) {
        return customRows;
    }
    const def = getSheetDefinition(sheetType);
    if (def.presets && presetIndex !== undefined && def.presets[presetIndex]) {
        return def.presets[presetIndex];
    }
    return def.rows;
}
