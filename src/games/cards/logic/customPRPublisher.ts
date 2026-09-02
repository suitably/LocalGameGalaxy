import type { CardGameDefinition } from './types';
import { resolveGitHubConfig, createGitHubPR } from '../../../lib/github';

export const publishCustomCardGameViaPR = async (
  game: CardGameDefinition,
  authorNote?: string,
): Promise<{ success: boolean; prUrl?: string; prNumber?: number; updated?: boolean; error?: string }> => {
  const { config: ghConfig, source } = resolveGitHubConfig();
  if (source !== 'local' || !ghConfig) {
    return {
      success: false,
      error: 'GitHub PAT is missing. Please configure a GitHub Token in Settings to submit PRs.',
    };
  }

  const gameJson = JSON.stringify(game, null, 2);
  const fileContent = `import type { CardGameDefinition } from '../types';\n\nexport const ${game.id.toUpperCase()}_GAME: CardGameDefinition = ${gameJson};\n`;

  const prTitle = `[Cards Suite] Add Custom Game: ${game.name}`;
  const prBody = `## New Card Game Contribution: ${game.name}

### Details:
- **Game ID:** \`${game.id}\`
- **Tracker Mode:** \`${game.trackerType}\`
- **Description:** ${game.description}
${authorNote ? `\n### Contributor Note:\n> ${authorNote.trim()}\n` : ''}

---
*Created automatically via LocalGameGalaxy Card Game Suite Builder.*`;

  return createGitHubPR(ghConfig, {
    filePath: `src/games/cards/modules/custom_${game.id}.ts`,
    fileContent,
    branchPrefix: `cards/add-game-${game.id}`,
    commitMessage: `feat(cards): add custom game ${game.id}`,
    prTitle,
    prBody,
  });
};
