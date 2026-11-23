import React, { useState } from 'react';
import { Collapse, List, ListItemButton, ListItemText, ListSubheader } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import { type SongMeta } from '../../db';
import { LibrarySongRow } from './LibrarySongRow';
import { type SongRowActions } from './types';

export interface LibraryGroupSection {
  key: string;
  /** Sub-heading inside the group (e.g. the album of an artist); none shows no heading. */
  label?: string;
  songs: SongMeta[];
}

export interface LibraryGroup {
  key: string;
  title: string;
  subtitle: string;
  sections: LibraryGroupSection[];
}

interface LibraryGroupListProps extends SongRowActions {
  groups: LibraryGroup[];
}

/** Artists or albums as an accordion list: one group open at a time, its songs below it. */
export const LibraryGroupList: React.FC<LibraryGroupListProps> = ({ groups, ...rowActions }) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <List disablePadding>
      {groups.map((group) => {
        const open = openKey === group.key;
        return (
          <React.Fragment key={group.key}>
            <ListItemButton
              divider
              aria-expanded={open}
              onClick={() => setOpenKey(open ? null : group.key)}
            >
              <ListItemText
                primary={group.title}
                secondary={group.subtitle}
                primaryTypographyProps={{ noWrap: true, fontWeight: 600 }}
              />
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={open} unmountOnExit>
              <List disablePadding sx={{ bgcolor: 'action.hover' }}>
                {group.sections.map((section) => (
                  <React.Fragment key={section.key}>
                    {section.label !== undefined && (
                      <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: 2.5 }}>
                        {section.label}
                      </ListSubheader>
                    )}
                    {section.songs.map((song) => (
                      <LibrarySongRow key={song.id} song={song} {...rowActions} />
                    ))}
                  </React.Fragment>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        );
      })}
    </List>
  );
};
