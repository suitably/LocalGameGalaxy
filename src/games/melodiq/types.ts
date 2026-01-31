/**
 * Shared types for Melodiq game
 */

// Color presets for player customization
export const COLOR_PRESETS = [
    { name: 'Cyan', hue: 190, color: 'hsl(190, 100%, 50%)' },
    { name: 'Green', hue: 120, color: 'hsl(120, 100%, 50%)' },
    { name: 'Blue', hue: 240, color: 'hsl(240, 100%, 50%)' },
    { name: 'Purple', hue: 270, color: 'hsl(270, 100%, 50%)' },
    { name: 'Pink', hue: 330, color: 'hsl(330, 100%, 50%)' },
    { name: 'Red', hue: 0, color: 'hsl(0, 100%, 50%)' },
    { name: 'Orange', hue: 30, color: 'hsl(30, 100%, 50%)' },
];

export interface UserProfile {
    id: string;
    name: string;
    hue: number;
}

export interface ActivePlayer {
    profileId: string;
    deviceId: string;
    volume?: number;
    muted?: boolean;
    latency?: number;
    isRemote?: boolean;
}
