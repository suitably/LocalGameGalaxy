import { accuracy, sectionScore, stars } from '../logic/judging';
import type { PlayerResult, StagePlayer } from './types';

export function playerResults(players: StagePlayer[]): PlayerResult[] {
  return players.map((p) => ({
    no: p.no,
    partName: p.part.name,
    inst: p.instrument.kind,
    accuracy: accuracy(p.stats),
    stars: stars(accuracy(p.stats)),
    score: p.stats.score,
    maxCombo: p.stats.maxCombo,
  }));
}

/** Section where the player was least sure, or null when none falls short. */
export function weakestSection(player: StagePlayer | null): number | null {
  let worst: number | null = null;
  let worstScore = 0.95;
  player?.stats.sections.forEach((s, i) => {
    const v = sectionScore(s);
    if (v !== null && v < worstScore) {
      worstScore = v;
      worst = i;
    }
  });
  return worst;
}
