import React from 'react';
import { Box, Typography } from '@mui/material';

interface SettingsCardHeaderProps {
  title: string;
  description: string;
  /** Rendered next to the title, e.g. a status chip. */
  titleAdornment?: React.ReactNode;
  /** Rendered right-aligned in the header row, e.g. an add button or a saved notice. */
  action?: React.ReactNode;
  /** Rendered below the description, e.g. a link. */
  children?: React.ReactNode;
}

/** Title / description / action row shared by the server settings cards. */
export const SettingsCardHeader: React.FC<SettingsCardHeaderProps> = ({
  title,
  description,
  titleAdornment,
  action,
  children,
}) => {
  const heading = <Typography variant="h6">{title}</Typography>;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1.5,
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Box>
        {titleAdornment ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {heading}
            {titleAdornment}
          </Box>
        ) : (
          heading
        )}
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {children}
      </Box>
      {action}
    </Box>
  );
};
