import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';

interface UsdbPasswordFieldProps {
  value: string;
  hasPassword: boolean;
  inputRef: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
}

export const UsdbPasswordField: React.FC<UsdbPasswordFieldProps> = ({
  value,
  hasPassword,
  inputRef,
  onChange,
}) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  return (
    <TextField
      size="small"
      fullWidth
      inputRef={inputRef}
      label={t('server.usdb.password', 'Password')}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={
        hasPassword
          ? t('server.usdb.password_saved_placeholder', '•••••••• (Saved)')
          : t('server.usdb.password_placeholder', 'Enter password')
      }
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShow(!show)} edge="end">
                {show ? (
                  <VisibilityOffIcon fontSize="small" />
                ) : (
                  <VisibilityIcon fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
