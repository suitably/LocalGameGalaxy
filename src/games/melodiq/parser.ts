/** The UltraStar parser lives in the shared music-score module (#566); Melodiq keeps its names. */
export {
  parseUltraStarTxt,
  type UltraStarNote as Note,
  type UltraStarSong as ParsedSong,
  type UltraStarTrack as SongTrack,
} from '../../modules/music-score/ultrastar';
