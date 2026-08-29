import { useEffect, useState } from 'react';

export const useKeyboardInsets = () => {
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 0,
  );
  const [keyboardInset, setKeyboardInset] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const visualViewport = window.visualViewport;

    const handleResize = () => {
      const currentHeight = visualViewport ? visualViewport.height : window.innerHeight;
      const screenHeight = window.screen.height;
      const inset = Math.max(0, screenHeight - currentHeight);
      const isVisible = inset > 120;

      setViewportHeight(currentHeight);
      setKeyboardInset(inset);
      setIsKeyboardVisible(isVisible);
    };

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize);
      visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    handleResize();

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return { viewportHeight, keyboardInset, isKeyboardVisible };
};
