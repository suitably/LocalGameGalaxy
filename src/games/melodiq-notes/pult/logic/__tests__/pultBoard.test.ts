import { describe, expect, it } from 'vitest';
import type { SongResult } from '../../../stage/logic/songResults';
import {
  initialPultRoom,
  parsePultBoard,
  PULT_BOARD_ROWS,
  pultBoardOf,
  pultRoomAllows,
  pultRoomReducer,
  type PultSong,
} from '../protocol';

const SONG: PultSong = {
  key: 'k1',
  title: 'Ode',
  parts: [{ id: 'piano', name: 'Piano', inst: 'keyboard', octaveBase: 60 }],
};

const result = (player: string, score: number, songKey = 'k1'): SongResult => ({
  songKey,
  title: 'Ode',
  player,
  seat: 1,
  partName: 'Piano',
  inst: 'keyboard',
  score,
  accuracy: 0.8,
  stars: 2,
  maxCombo: 10,
  at: 1,
});

const withSong = () =>
  pultRoomReducer(initialPultRoom('stage'), { type: 'STAGE', song: SONG, play: 'idle' });

describe('pult leaderboard', () => {
  it('shares the ranked rows of one song, best first, without the stored details', () => {
    const board = pultBoardOf(
      [result('Ann', 500), result('Ben', 900), result('Cid', 900, 'other')],
      'k1',
    );
    expect(board).toEqual({
      songKey: 'k1',
      rows: [
        { rank: 1, player: 'Ben', seat: 1, inst: 'keyboard', score: 900 },
        { rank: 2, player: 'Ann', seat: 1, inst: 'keyboard', score: 500 },
      ],
    });
  });

  it('keeps only the top rows', () => {
    const many = Array.from({ length: PULT_BOARD_ROWS + 5 }, (_, i) => result(`P${i}`, i));
    const board = pultBoardOf(many, 'k1');
    expect(board.rows).toHaveLength(PULT_BOARD_ROWS);
    expect(board.rows[0].score).toBe(PULT_BOARD_ROWS + 4);
  });

  it('survives the network round trip and rejects malformed boards', () => {
    const board = pultBoardOf([result('Ann', 500)], 'k1');
    expect(parsePultBoard(JSON.parse(JSON.stringify(board)))).toEqual(board);
    expect(parsePultBoard(null)).toBeNull();
    expect(parsePultBoard({ songKey: 'k1' })).toBeNull();
    expect(parsePultBoard({ songKey: 'k1', rows: [{ rank: 1, player: 5 }] })).toBeNull();
    const tooLong = pultBoardOf(
      Array.from({ length: PULT_BOARD_ROWS }, (_, i) => result(`P${i}`, i)),
      'k1',
    );
    tooLong.rows.push(tooLong.rows[0]);
    expect(parsePultBoard(tooLong)).toBeNull();
  });

  it('takes a board for the song on stage only and drops it on a song change', () => {
    const s = withSong();
    const board = pultBoardOf([result('Ann', 500)], 'k1');
    const next = pultRoomReducer(s, { type: 'BOARD', board });
    expect(next.board).toEqual(board);
    expect(pultRoomReducer(next, { type: 'BOARD', board })).toBe(next);
    const stale = { ...board, songKey: 'old' };
    expect(pultRoomReducer(s, { type: 'BOARD', board: stale })).toBe(s);
    expect(pultRoomReducer(next, { type: 'STAGE', song: SONG, play: 'done' }).board).toEqual(board);
    const other = { ...SONG, key: 'k2' };
    expect(pultRoomReducer(next, { type: 'STAGE', song: other, play: 'idle' }).board).toBeNull();
  });

  it('lets only the stage send the board', () => {
    const s = withSong();
    const action = { type: 'BOARD' as const, board: pultBoardOf([], 'k1') };
    expect(pultRoomAllows(s, action, 'stage')).toBe(true);
    expect(pultRoomAllows(s, action, 'a')).toBe(false);
  });
});
