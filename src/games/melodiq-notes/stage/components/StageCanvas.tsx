import { useEffect, useRef, type ReactNode } from 'react';
import { Box } from '@mui/material';
import type { StageEngine } from '../engine/StageEngine';
import { keyAction } from '../logic/keyboardInput';
import {
  drumLaneAt,
  keyAt,
  keyGeometry,
  pitchGeometry,
  stringAt,
  stringGeometry,
} from '../render/geometry';
import { locatePointer, StageRenderer, type StageDisplay } from '../render/stageRenderer';
import type { StageTexts } from '../render/common';

interface StageCanvasProps {
  engine: StageEngine;
  display: StageDisplay;
  texts: StageTexts;
  onGesture: () => void;
  onTogglePause: () => void;
  children?: ReactNode;
}

const MAX_DPR = 2;

/** The drawn stage plus pointer and computer-keyboard input for the highlighted player. */
export function StageCanvas({
  engine,
  display,
  texts,
  onGesture,
  onTogglePause,
  children,
}: StageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const live = useRef({ display, texts });
  useEffect(() => {
    live.current = { display, texts };
  }, [display, texts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const renderer = new StageRenderer();
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height };
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      renderer.draw(
        g,
        engine,
        size.current.w,
        size.current.h,
        live.current.display,
        live.current.texts,
        dt,
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag))
        return;
      const down = e.type === 'keydown';
      if (down && e.code === 'Escape') return onTogglePause();
      if (down && e.code === 'Tab' && engine.players.length > 1 && tag !== 'BUTTON') {
        e.preventDefault();
        return engine.focusNext();
      }
      const p = engine.focus;
      if (!p) return;
      const action = keyAction(
        e.code,
        p.instrument.view,
        p.octaveBase,
        p.instrument.kind === 'guitar' ? 6 : 4,
        down,
      );
      if (!action) return;
      e.preventDefault();
      if (action.kind === 'lane' && !e.repeat) {
        onGesture();
        engine.hit(action.lane);
      } else if (action.kind === 'sing') engine.setVoice(p.voice.pitch, action.on);
      else if (action.kind === 'pitchStep')
        engine.setVoice(Math.round(p.voice.pitch) + action.delta, p.voice.singing);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [engine, onGesture, onTogglePause]);

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>, kind: 'down' | 'move' | 'up') => {
    const r = e.currentTarget.getBoundingClientRect();
    const hit = locatePointer(
      engine,
      size.current.w,
      size.current.h,
      e.clientX - r.left,
      e.clientY - r.top,
    );
    const focus = engine.focus;
    if (kind !== 'down') {
      // singing: the pointer height is the pitch; lifting the pointer stops singing
      if (focus?.instrument.view !== 'pitch') return;
      const pitch =
        hit?.player === focus
          ? pitchGeometry(focus, hit.rect.w, hit.rect.h).pitchAt(hit.y)
          : focus.voice.pitch;
      engine.setVoice(pitch, kind === 'move' && focus.voice.singing);
      return;
    }
    onGesture();
    if (!hit) return;
    if (hit.player !== focus) return engine.setFocus(hit.player);
    if (hit.onHeader) return;
    const { w, h } = hit.rect;
    const p = hit.player;
    if (display === 'notation') return p.pending[0] ? engine.hit(p.pending[0].lane) : undefined;
    switch (p.instrument.view) {
      case 'keys': {
        const key = keyAt(keyGeometry(p, w, h, true), hit.x, hit.y);
        if (key !== null) engine.hit(key);
        return;
      }
      case 'strings':
        return engine.hit(stringAt(stringGeometry(p, w, h), hit.y));
      case 'drums':
        return engine.hit(drumLaneAt(w, h, hit.x, hit.y));
      default:
        e.currentTarget.setPointerCapture(e.pointerId);
        return engine.setVoice(pitchGeometry(p, w, h).pitchAt(hit.y), true);
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
        onPointerDown={(e) => pointer(e, 'down')}
        onPointerMove={(e) => pointer(e, 'move')}
        onPointerUp={(e) => pointer(e, 'up')}
        onPointerCancel={(e) => pointer(e, 'up')}
      />
      {children}
    </Box>
  );
}
