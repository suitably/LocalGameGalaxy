import React from 'react';
import { Box } from '@mui/material';
import type { Note } from '../../parser';
import { groupNotesIntoWords } from '../logic/lyricsFit';

interface LineWordsProps {
  notes: Note[];
  renderNote: (note: Note, key: string) => React.ReactNode;
}

/** A line's syllables, grouped so wrapping can only happen between words. */
export const LineWords: React.FC<LineWordsProps> = ({ notes, renderNote }) => (
  <>
    {groupNotesIntoWords(notes).map((word, wordIndex) => (
      <React.Fragment key={wordIndex}>
        <Box component="span" sx={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {word.map((note, noteIndex) => renderNote(note, `${wordIndex}-${noteIndex}`))}
        </Box>
        <wbr />
      </React.Fragment>
    ))}
  </>
);
