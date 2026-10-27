# Wordle word lists (generated)

`words-de.ts` and `words-en.ts` hold every 5-letter word (A-Z, uppercase, sorted, concatenated
without separators) extracted from Hunspell dictionaries, used for the "Only dictionary words"
guess validation. German is folded like `normalizeWord` (Ä→AE, Ö→OE, Ü→UE, ß→SS) before the
length check. English proper nouns and acronyms are dropped.

Regenerate: `npm ci && npm run build:wordle-words` (script: `scripts/build-wordle-words.mjs`,
inputs: devDependencies `dictionary-de`, `dictionary-en`). Do not edit the `.ts` files by hand.

## Licences and attribution

- **German**: derived from [igerman98](https://www.j3e.de/ispell/igerman98/) by Björn Jacke
  (via npm `dictionary-de`), GPL-2.0 OR GPL-3.0. Compatible with this project's
  AGPL-3.0-or-later; `words-de.ts` is a derivative work under the GPL.
- **English**: derived from [SCOWL](http://wordlist.sourceforge.net) by Kevin Atkinson
  (via npm `dictionary-en`), MIT AND BSD. The SCOWL copyright notice (see
  `node_modules/dictionary-en/license`) applies to `words-en.ts`.
