import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface GameRecord {
    id?: number;
    gameType: 'WEREWOLF';
    date: Date;
    winner: string | null;
    playerCount: number;
}

export class LocalGameDatabase extends Dexie {
    games!: Table<GameRecord>;
    imposter_categories!: Table<{
        id: string;
        name: { en: string; de: string };
    }>;
    imposter_word_pairs!: Table<{
        id?: number;
        words: { en: [string, string]; de: [string, string] };
        categoryIds: string[];
    }>;

    constructor() {
        super('LocalGameGalaxyDB');
        this.version(1).stores({
            games: '++id, gameType, date'
        });
        this.version(2).stores({
            imposter_categories: 'id',
            imposter_word_pairs: '++id, *categoryIds'
        });
    }
}

export const db = new LocalGameDatabase();
