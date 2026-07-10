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

    constructor() {
        super('LocalGameGalaxyDB');
        this.version(1).stores({
            games: '++id, gameType, date'
        });
    }
}

export const db = new LocalGameDatabase();
