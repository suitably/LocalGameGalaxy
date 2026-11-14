import React from 'react';
import { alpha, Box } from '@mui/material';
import { LyricsDisplay } from '../LyricsDisplay';
import { PitchVisualizer, type SongWithNotes } from '../PitchVisualizer';
import { type PlayerRuntime } from '../hooks/PlayerRuntime';
import { useMelodiqSettings } from '../../hooks/SettingsContext';
import type { LyricsRows } from '../logic/lyricsFit';
import { lyricsOnlyLineCount } from '../logic/lyricsLines';
import { HostPartToggle } from './HostPartToggle';
import { useStackedStage } from '../hooks/useStackedStage';

/** Wide enough that each duet lane keeps a readable font on a 1080p TV. */
const LYRICS_MAX_WIDTH = '1800px';

/** Centered lyrics on a big screen; a portrait phone's lane is narrow, so they grow less there. */
const CENTER_LYRICS_SCALE = 1.45;
const STACKED_CENTER_LYRICS_SCALE = 1.2;

/** TV lyrics relative to the x2 TV UI (`uiScale`, only set by MelodiqTV): 54px instead of 72px on 1080p. */
const TV_LYRICS_SCALE = 0.75;

export interface SessionLyricsVisualizerProps {
  visiblePlayers: PlayerRuntime[];
  allPlayers: PlayerRuntime[];
  parsedSong: SongWithNotes;
  timeProxyRef: React.RefObject<any>;
  lyricsUiScale: number;
  activeLyricsZoom: boolean;
  activeLyricsLines?: number;
  activeLyricsPosition: 'bottom' | 'center';
  gridLayout: { rows: number[]; columnWidthPercent: number };
  showDebugOverlay?: boolean;
  showNoteLabels?: boolean;
  uiScale?: number;
  onSwitchTrack: (playerIndex: number, trackIndex: number) => void;
}

interface LyricsBarProps {
  song: SongWithNotes;
  audioRef: SessionLyricsVisualizerProps['timeProxyRef'];
  uiScale: number;
  enableZoom: boolean;
  lyricsLines?: number;
  lyricsRows: LyricsRows;
  lyricsMinFit: number;
}

/** Translucent lyrics strip docked to the bottom of the stage. */
const LyricsBar: React.FC<LyricsBarProps> = (props) => (
  <Box
    sx={{
      flexShrink: 0,
      width: '100%',
      pointerEvents: 'none',
      zIndex: 10,
      borderTop: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
      bgcolor: 'rgba(0,0,0,0.4)',
      // Blur kept on purpose: the bar sits over the lyrics video and needs it for legibility.
      backdropFilter: 'blur(8px)',
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <Box sx={{ width: '100%', maxWidth: LYRICS_MAX_WIDTH }}>
      <LyricsDisplay
        song={props.song}
        audioRef={props.audioRef}
        uiScale={props.uiScale}
        enableZoom={props.enableZoom}
        lyricsLines={props.lyricsLines}
        lyricsRows={props.lyricsRows}
        lyricsMinFit={props.lyricsMinFit}
      />
    </Box>
  </Box>
);

export const SessionLyricsVisualizer: React.FC<SessionLyricsVisualizerProps> = ({
  visiblePlayers,
  allPlayers,
  parsedSong,
  timeProxyRef,
  lyricsUiScale,
  activeLyricsZoom,
  activeLyricsLines,
  activeLyricsPosition,
  gridLayout,
  showDebugOverlay,
  showNoteLabels,
  uiScale = 1.0,
  onSwitchTrack,
}) => {
  const { settings } = useMelodiqSettings();
  const { lyricsRows, lyricsMinFit } = settings;
  const stacked = useStackedStage();
  const trackNames = (parsedSong.tracks ?? []).map((t) => t.name);
  const lyricsScale = lyricsUiScale * (uiScale > 1 ? TV_LYRICS_SCALE : 1);
  const lyricsProps: LyricsBarProps = {
    song: parsedSong,
    audioRef: timeProxyRef,
    uiScale: lyricsScale,
    enableZoom: activeLyricsZoom,
    lyricsLines: activeLyricsLines,
    lyricsRows,
    lyricsMinFit,
  };

  if (visiblePlayers.length === 0) {
    // Without pitch lanes a phone would show an empty stage above a small bar: centre the lyrics.
    if (activeLyricsPosition === 'center' || stacked) {
      return (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            overflow: 'hidden',
            px: { xs: 2, md: 6 },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: LYRICS_MAX_WIDTH }}>
            <LyricsDisplay
              song={parsedSong}
              audioRef={timeProxyRef}
              uiScale={lyricsScale * (stacked ? STACKED_CENTER_LYRICS_SCALE : CENTER_LYRICS_SCALE)}
              enableZoom={activeLyricsZoom}
              lyricsLines={lyricsOnlyLineCount(
                activeLyricsLines ?? 2,
                stacked,
                trackNames.length > 1,
              )}
              lyricsRows={lyricsRows}
              lyricsMinFit={lyricsMinFit}
            />
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        <Box sx={{ flex: 1 }} />
        <LyricsBar {...lyricsProps} />
      </Box>
    );
  }

  return (
    <Box
      sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
    >
      <Box
        sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0, alignContent: 'stretch' }}
      >
        {visiblePlayers.map((player, idx) => {
          let remaining = idx;
          let rowIndex = 0;
          let colIndex = 0;
          let colsInRow = 1;
          for (let i = 0; i < gridLayout.rows.length; i++) {
            if (remaining < gridLayout.rows[i]) {
              rowIndex = i;
              colIndex = remaining;
              colsInRow = gridLayout.rows[i];
              break;
            }
            remaining -= gridLayout.rows[i];
          }

          const widthPercent = 100 / colsInRow;
          const heightPercent = 100 / gridLayout.rows.length;

          return (
            <Box
              key={player.config.id}
              sx={{
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                minHeight: 0,
                position: 'relative',
                borderRight: colIndex < colsInRow - 1 ? 1 : 0,
                borderColor: 'divider',
                borderBottom: rowIndex < gridLayout.rows.length - 1 ? 1 : 0,
              }}
            >
              <PitchVisualizer
                song={parsedSong}
                audioRef={timeProxyRef}
                currentPitchRef={player.pitchRef}
                sungSegmentsRef={player.segmentsRef}
                showDebugOverlay={showDebugOverlay}
                label={player.config.name}
                hue={player.config.hue}
                showNoteLabels={showNoteLabels}
                latency={player.config.latency}
                trackIndex={player.trackIndex}
                scale={uiScale}
              />
              {!player.config.isRemote && trackNames.length > 1 && (
                <HostPartToggle
                  trackNames={trackNames}
                  value={player.trackIndex}
                  hue={player.config.hue}
                  onChange={(tIdx) => onSwitchTrack(allPlayers.indexOf(player), tIdx)}
                />
              )}
            </Box>
          );
        })}
      </Box>
      <LyricsBar {...lyricsProps} />
    </Box>
  );
};
