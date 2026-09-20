import React from 'react';
import { Box } from '@mui/material';
import type { CardWidget, FaceObject } from '../../logic/types';
import { PlayingCardFace } from './PlayingCardFace';

const parseCss = (cssStr?: string) => {
  if (!cssStr) return {};
  return cssStr.split(';').reduce((acc, rule) => {
    const colonIdx = rule.indexOf(':');
    if (colonIdx > 0) {
      const key = rule.slice(0, colonIdx).trim();
      const value = rule.slice(colonIdx + 1).trim();
      if (key && value) {
        const camelKey = key.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
        acc[camelKey] = value;
      }
    }
    return acc;
  }, {} as Record<string, string>);
};

export const FaceObjectsLayer: React.FC<{ objects: FaceObject[] }> = ({ objects }) => {
  return (
    <>
      {objects.map((obj, i) => {
        const cssProps = parseCss(obj.css);
        const sx: Record<string, unknown> = {
          position: 'absolute',
          left: obj.x ?? 0,
          top: obj.y ?? 0,
          width: obj.width,
          height: obj.height,
          pointerEvents: 'none',
          boxSizing: 'border-box',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundColor: 'transparent',
          color: obj.color,
          fontSize: obj.fontSize,
          textAlign: obj.textAlign,
          ...cssProps,
        };

        if (obj.clipPath) {
          sx.clipPath = obj.clipPath;
        }
        if (obj.borderRadius !== undefined) {
          sx.borderRadius = obj.borderRadius;
        }
        if (obj.rotation) {
          sx.transform = `rotate(${obj.rotation}deg)`;
        }

        if (obj.type === 'image') {
          if (obj.value) {
            sx.backgroundImage = `url("${obj.value}")`;
          }
          return <Box key={i} sx={sx} />;
        }

        return (
          <Box key={i} sx={sx}>
            {obj.type === 'text' ? obj.value : null}
          </Box>
        );
      })}
    </>
  );
};

interface CardFaceContentProps {
  card: CardWidget;
  isFaceUp: boolean;
  width?: number;
  height?: number;
}

export const CardFaceContent: React.FC<CardFaceContentProps> = ({
  card,
  isFaceUp,
  width,
  height,
}) => {
  const showFaceObjects = Boolean(card.faceObjects && card.faceObjects.length > 0 && isFaceUp);
  const showBackFaceObjects = Boolean(card.backFaceObjects && card.backFaceObjects.length > 0 && !isFaceUp);
  // Single-template fallback: If card is face-up but only backFaceObjects was parsed, show it
  const showFallbackObjects = Boolean(isFaceUp && !showFaceObjects && card.backFaceObjects && card.backFaceObjects.length > 0);

  if (showFaceObjects) {
    return <FaceObjectsLayer objects={card.faceObjects!} />;
  }
  if (showBackFaceObjects) {
    return <FaceObjectsLayer objects={card.backFaceObjects!} />;
  }
  if (showFallbackObjects) {
    return <FaceObjectsLayer objects={card.backFaceObjects!} />;
  }

  const hasClipPath = Boolean(card.clipPath);
  if (hasClipPath && isFaceUp && card.frontContent.type === 'image') {
    return (
      <Box
        component="img"
        src={card.frontContent.value}
        alt={card.label || 'Card'}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    );
  }

  if (hasClipPath && !isFaceUp) {
    if (card.backContent.type === 'image') {
      return (
        <Box
          component="img"
          src={card.backContent.value}
          alt={card.label || 'Card'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      );
    }
    return <Box sx={{ width: '100%', height: '100%', bgcolor: card.backContent.value }} />;
  }

  return (
    <PlayingCardFace
      frontContent={card.frontContent}
      backContent={card.backContent}
      isFaceUp={isFaceUp}
      label={card.label}
      width={width || card.width}
      height={height || card.height}
    />
  );
};
