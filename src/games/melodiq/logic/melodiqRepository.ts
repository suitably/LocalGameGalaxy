import db, { type Score } from '../db';

export const addPlayerScore = async (score: Score): Promise<number | undefined> => {
    return db.scores.add(score);
};

export const getPlayerScores = async (songId: string, profileId: string): Promise<Score[]> => {
    return db.scores
        .where({ songId, profileId })
        .toArray();
};
