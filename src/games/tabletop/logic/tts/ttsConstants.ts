/** TTS importer constants [ID: GAME-TABLETOP-TTS-PARSER] */

/** Scale factor: 1 TTS unit ≈ this many pixels */
export const TTS_SCALE = 50;

/** A standard TTS card at scale 1 is about 2.2 × 3.1 units. */
export const CARD_W = 110;

export const CARD_H = 155;

/**
 * Play surface of the custom rectangle table (`Table_Custom`), centred on the origin; the
 * `TableURL` image is stretched over it whatever its aspect ratio.
 */
export const CUSTOM_TABLE = { width: 88, depth: 52 };

/** Widget id of the board made from the custom table image. */
export const TTS_TABLE_WIDGET_ID = 'tts_table';

/** Token/figurine default size */
export const TOKEN_SIZE = 76;

/** Die default size */
export const DIE_SIZE = 80;
