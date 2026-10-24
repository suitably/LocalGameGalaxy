import { useEffect, useRef, useState } from 'react';
import type { GarticGameState } from '../types';

interface UseAlbumRevealArgs {
  state: GarticGameState;
  isHost: boolean;
  onRevealStateChange?: (bookIndex: number, stepIndex: number) => void;
}

/**
 * Album reveal progress. The host drives book/step locally and broadcasts it; guests follow the
 * broadcast state. Also scrolls down on each new step and back to the top on a new album.
 */
export const useAlbumReveal = ({ state, isHost, onRevealStateChange }: UseAlbumRevealArgs) => {
  const [localBookIndex, setLocalBookIndex] = useState(state.currentRevealBookIndex || 0);
  const [localRevealedStepsCount, setLocalRevealedStepsCount] = useState(
    (state.currentRevealStepIndex || 0) + 1,
  );

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const bookIndex = isHost ? localBookIndex : (state.currentRevealBookIndex ?? localBookIndex);
  const revealedStepsCount = isHost
    ? localRevealedStepsCount
    : Math.max(1, (state.currentRevealStepIndex ?? 0) + 1);

  const prevBookIndexRef = useRef(bookIndex);

  useEffect(() => {
    if (prevBookIndexRef.current !== bookIndex) {
      prevBookIndexRef.current = bookIndex;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (revealedStepsCount > 1) {
      // Delay slightly so the new step's DOM is rendered
      const timer = setTimeout(() => {
        if (bottomAnchorRef.current) {
          bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [bookIndex, revealedStepsCount]);

  const currentBook = state.books[bookIndex] || state.books[0];
  const totalSteps = currentBook?.steps.length ?? 0;
  const isBookFullyRevealed = revealedStepsCount >= totalSteps;
  const hasNextBook = bookIndex < state.books.length - 1;

  const handleNextStep = () => {
    if (!isHost) return;
    let nextBook = bookIndex;
    let nextStepCount = revealedStepsCount;

    if (revealedStepsCount < totalSteps) {
      nextStepCount = revealedStepsCount + 1;
      setLocalRevealedStepsCount(nextStepCount);
    } else if (hasNextBook) {
      nextBook = bookIndex + 1;
      nextStepCount = 1;
      setLocalBookIndex(nextBook);
      setLocalRevealedStepsCount(1);
    }

    onRevealStateChange?.(nextBook, nextStepCount - 1);
  };

  const handlePrevStep = () => {
    if (!isHost) return;
    let prevBook = bookIndex;
    let prevStepCount = revealedStepsCount;

    if (revealedStepsCount > 1) {
      prevStepCount = revealedStepsCount - 1;
      setLocalRevealedStepsCount(prevStepCount);
    } else if (bookIndex > 0) {
      prevBook = bookIndex - 1;
      const prevB = state.books[prevBook];
      prevStepCount = prevB ? prevB.steps.length : 1;
      setLocalBookIndex(prevBook);
      setLocalRevealedStepsCount(prevStepCount);
    }

    onRevealStateChange?.(prevBook, prevStepCount - 1);
  };

  const handleSelectBook = (idx: number) => {
    if (!isHost) return;
    setLocalBookIndex(idx);
    setLocalRevealedStepsCount(1);
    onRevealStateChange?.(idx, 0);
  };

  return {
    scrollContainerRef,
    bottomAnchorRef,
    bookIndex,
    revealedStepsCount,
    currentBook,
    totalSteps,
    isBookFullyRevealed,
    hasNextBook,
    handleNextStep,
    handlePrevStep,
    handleSelectBook,
  };
};
