/** A new random 6-character party code. */
export const randomPartyId = (): string => Math.random().toString(36).substring(2, 8).toUpperCase();

/**
 * The party code a host starts with: a fixed one (the party lobby's room, #647), else the stored
 * one, else a new random code.
 */
export const initialPartyId = (fixed: string | null | undefined, stored: string | null): string =>
  fixed || stored || randomPartyId();
