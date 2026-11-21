/**
 * A scripted card game as a game file in the Spieltisch's own format [ID: LOGIC-TABLETOP-SCRIPT-EXPORT]
 *
 * "Export as .json" of a scripted game writes the same `TabletopGameDefinition` the tabletop
 * exports and imports (`logic/nativeGameFile.ts`): its full deck, a discard pile, one hand per
 * seat and the rule text, plus `ruleScript` naming the built-in script. Imported again, the app
 * plays it with enforced rules (`ruleScriptOf`); an app without that script gets a free table
 * with the same cards. The file holds no code (ADR-0005).
 */
import { buildDeck } from '../../logic/deckBuilder';
import type {
  CardContent,
  CardWidget,
  DeckWidget,
  HolderWidget,
  TabletopGameDefinition,
  TabletopWidget,
} from '../../logic/types';
import { SUIT_SYMBOL, cardText, isJoker, makeDeck, rankOf, suitOf, type Suit } from './cardDeck';
import { getScript } from './scriptRegistry';
import type { AnyGameScript } from './scriptTypes';

const TABLE = { width: 1600, height: 1000, backgroundColor: '#1e3d2f' };
const CARD = { width: 80, height: 120 };
const RED = '#d32f2f';
const BLACK = '#212121';
const SUIT_NAME: Record<Suit, string> = {
  C: 'clubs',
  S: 'spades',
  H: 'hearts',
  D: 'diamonds',
};

export const RULE_SCRIPT_DECK_ID = 'deck';

export interface ScriptExportTexts {
  name: string;
  description: string;
  /** HTML, as the rules dialog shows it. */
  ruleText: string;
}

const face = (card: string): CardContent => {
  if (isJoker(card)) return { type: 'text', value: cardText(card), color: RED };
  const suit = suitOf(card);
  return {
    type: 'text',
    value: `${SUIT_SYMBOL[suit]} ${rankOf(card)}`,
    color: suit === 'H' || suit === 'D' ? RED : BLACK,
  };
};

/** Hands in two rows: even seats at the bottom, odd seats at the top. */
function hands(count: number): HolderWidget[] {
  const perRow = Math.ceil(count / 2);
  const width = Math.min(500, Math.floor(TABLE.width / perRow) - 20);
  return Array.from({ length: count }, (_, seat) => {
    const col = Math.floor(seat / 2);
    return {
      id: `hand_p${seat}`,
      type: 'holder',
      x: 10 + col * (width + 20),
      y: seat % 2 === 0 ? TABLE.height - 200 : 40,
      width,
      height: 160,
      zIndex: 2,
      label: `${seat + 1}`,
      labelKey: 'games.tabletop.labels.hand_n',
      labelParams: { n: seat + 1 },
      isHand: true,
      ownerSeat: seat,
      childIds: [],
      layout: 'fan',
      dropTargetTypes: ['card'],
    };
  });
}

export function scriptedGameDefinition(
  script: AnyGameScript,
  texts: ScriptExportTexts,
): TabletopGameDefinition {
  const cards = makeDeck(script.ranks, script.jokers).filter((c) => !script.removed?.includes(c));
  const [deckWidget, ...cardWidgets] = buildDeck({
    deckId: RULE_SCRIPT_DECK_ID,
    x: TABLE.width / 2 - CARD.width - 20,
    y: TABLE.height / 2 - CARD.height / 2,
    zIndex: 10,
    ...CARD,
    faces: cards.map(face),
  });
  const labelled = (cardWidgets as CardWidget[]).map((w, i) =>
    isJoker(cards[i])
      ? { ...w, label: 'Joker' }
      : {
          ...w,
          labelKey: 'games.tabletop.labels.card',
          labelParams: { rank: rankOf(cards[i]), suit: SUIT_NAME[suitOf(cards[i])] },
        },
  );
  const discard: HolderWidget = {
    id: 'discard',
    type: 'holder',
    x: TABLE.width / 2 + 20,
    y: TABLE.height / 2 - CARD.height / 2 - 10,
    width: CARD.width + 30,
    height: CARD.height + 20,
    zIndex: 5,
    labelKey: 'games.tabletop.labels.discard_pile',
    dropTarget: true,
    dropTargetTypes: ['card'],
    childIds: [],
    layout: 'stack',
  };
  const widgets: TabletopWidget[] = [
    {
      ...(deckWidget as DeckWidget),
      labelKey: 'games.tabletop.labels.draw_pile',
      shuffleOnStart: true,
    },
    ...labelled,
    discard,
    ...hands(script.maxPlayers),
  ];
  return {
    id: `${script.id}-rules`,
    name: texts.name,
    description: texts.description,
    author: 'LocalGameGalaxy',
    version: '1.0.0',
    minPlayers: script.minPlayers,
    maxPlayers: script.maxPlayers,
    supportedModes: ['party_multi_device', 'local_pass_and_play'],
    table: { ...TABLE },
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
    ruleText: texts.ruleText,
    ruleScript: script.id,
  };
}

/** The built-in script an imported or saved game asks for, if this app has it. */
export const ruleScriptOf = (game: Pick<TabletopGameDefinition, 'ruleScript'>): string | null =>
  getScript(game.ruleScript) ? (game.ruleScript ?? null) : null;
