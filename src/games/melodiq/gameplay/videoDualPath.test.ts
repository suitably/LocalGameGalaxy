import { describe, it, expect } from 'vitest';
import { getYouTubeVideoId } from './youtubeApi';
import { parseUltraStarTxt } from '../parser';

describe('Video Dual-Path: YouTube ID Extraction', () => {
  it('extracts ID from standard watch URL', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://www.youtube.com/watch?feature=related&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short youtu.be URL', () => {
    expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('http://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URLs including nocookie', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from USDB tags', () => {
    expect(getYouTubeVideoId('v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('a=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('co=cover.jpg, v=dQw4w9WgXcQ, bg=bg.jpg')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from raw 11-character identifier', () => {
    expect(getYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('handles URL-encoded values', () => {
    expect(
      getYouTubeVideoId('https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ')
    ).toBe('dQw4w9WgXcQ');
  });

  it('returns null for local media filenames or invalid strings', () => {
    expect(getYouTubeVideoId('video.mp4')).toBeNull();
    expect(getYouTubeVideoId('clip.webm')).toBeNull();
    expect(getYouTubeVideoId('movie.avi')).toBeNull();
    expect(getYouTubeVideoId('path/to/my_video.mp4')).toBeNull();
    expect(getYouTubeVideoId('')).toBeNull();
    expect(getYouTubeVideoId(undefined)).toBeNull();
  });
});

describe('Video Dual-Path: UltraStar Parser #VIDEO Extraction', () => {
  it('extracts local video file tag', () => {
    const txt = `
#TITLE:Test Song
#ARTIST:Artist
#BPM:120
#GAP:0
#VIDEO:my_music_video.mp4
: 0 4 60 Hello
- 8
    `.trim();

    const parsed = parseUltraStarTxt(txt);
    expect(parsed.headers.TITLE).toBe('Test Song');
    expect(parsed.headers.VIDEO).toBe('my_music_video.mp4');
    expect(getYouTubeVideoId(parsed.headers.VIDEO)).toBeNull();
  });

  it('extracts YouTube URL video tag without truncating on colons', () => {
    const txt = `
#TITLE:Online Song
#ARTIST:Online Artist
#BPM:120
#GAP:0
#VIDEO:https://www.youtube.com/watch?v=dQw4w9WgXcQ
: 0 4 60 Sing
- 8
    `.trim();

    const parsed = parseUltraStarTxt(txt);
    expect(parsed.headers.TITLE).toBe('Online Song');
    expect(parsed.headers.VIDEO).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(getYouTubeVideoId(parsed.headers.VIDEO)).toBe('dQw4w9WgXcQ');
  });

  it('extracts USDB v= tag in #VIDEO', () => {
    const txt = `
#TITLE:USDB Song
#ARTIST:USDB Artist
#BPM:120
#GAP:0
#VIDEO:v=dQw4w9WgXcQ
: 0 4 60 Sing
- 8
    `.trim();

    const parsed = parseUltraStarTxt(txt);
    expect(parsed.headers.VIDEO).toBe('v=dQw4w9WgXcQ');
    expect(getYouTubeVideoId(parsed.headers.VIDEO)).toBe('dQw4w9WgXcQ');
  });
});
