import React from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighRounded';
import BedIcon from '@mui/icons-material/BedRounded';
import BedtimeIcon from '@mui/icons-material/BedtimeRounded';
import ChildCareIcon from '@mui/icons-material/ChildCareRounded';
import ChurchIcon from '@mui/icons-material/ChurchRounded';
import ContentCutIcon from '@mui/icons-material/ContentCutRounded';
import CottageIcon from '@mui/icons-material/CottageRounded';
import CrueltyFreeIcon from '@mui/icons-material/CrueltyFreeRounded';
import ElderlyIcon from '@mui/icons-material/ElderlyRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import ExtensionIcon from '@mui/icons-material/ExtensionRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import NightlightIcon from '@mui/icons-material/NightlightRoundRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';
import PersonSearchIcon from '@mui/icons-material/PersonSearchRounded';
import PestControlRodentIcon from '@mui/icons-material/PestControlRodentRounded';
import PetsIcon from '@mui/icons-material/PetsRounded';
import SavingsIcon from '@mui/icons-material/SavingsRounded';
import SecurityIcon from '@mui/icons-material/SecurityRounded';
import ShieldIcon from '@mui/icons-material/ShieldRounded';
import TrackChangesIcon from '@mui/icons-material/TrackChangesRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import WbSunnyIcon from '@mui/icons-material/WbSunnyRounded';

/** Rounded MUI icons for the built-in roles; keys equal the role / winner ids. */
const ROLE_ICONS: Record<string, SvgIconComponent> = {
  WEREWOLF: PetsIcon,
  WEREWOLVES: PetsIcon,
  WITCH: AutoFixHighIcon,
  SEER: VisibilityIcon,
  CUPID: FavoriteIcon,
  LOVERS: FavoriteIcon,
  HUNTER: TrackChangesIcon,
  LITTLE_GIRL: ChildCareIcon,
  DETECTIVE: PersonSearchIcon,
  GUARDIAN: ShieldIcon,
  BLACK_CAT: BedtimeIcon,
  WISE: ElderlyIcon,
  BLACK_WEREWOLF: NightlightIcon,
  WHITE_WEREWOLF: PestControlRodentIcon,
  ANGEL: ChurchIcon,
  EASTER_BUNNY: CrueltyFreeIcon,
  WOLFDOG: ExtensionIcon,
  RIPPER: ContentCutIcon,
  SURVIVOR: SecurityIcon,
  PYROMANIAC: LocalFireDepartmentIcon,
  THIEF: SavingsIcon,
  DORFMATRATZE: BedIcon,
  VILLAGER: CottageIcon,
  VILLAGERS: CottageIcon,
  CUSTOM: PersonIcon,
  WINNER: EmojiEventsIcon,
  MORNING: WbSunnyIcon,
  SECRET: VisibilityOffIcon,
};

interface RoleIconProps {
  /** Registered key (role id) or free text typed by a user for a custom role. */
  icon: string;
  fontSize?: number | string;
}

export const RoleIcon: React.FC<RoleIconProps> = ({ icon, fontSize = 'inherit' }) => {
  const Icon = ROLE_ICONS[icon];
  if (!Icon) return <span>{icon}</span>;
  return <Icon sx={{ fontSize, verticalAlign: 'middle' }} />;
};
