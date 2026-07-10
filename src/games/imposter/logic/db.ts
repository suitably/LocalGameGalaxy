import Dexie from 'dexie';
import type { Table } from 'dexie';

export class ImposterDatabase extends Dexie {
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
        super('ImposterDB');
        this.version(1).stores({
            imposter_categories: 'id',
            imposter_word_pairs: '++id, *categoryIds'
        });
    }
}

export const imposterDb = new ImposterDatabase();
