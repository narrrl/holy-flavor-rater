import React from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

export interface GlobalSearchProps {
  compact?: boolean;
}

export const GlobalSearch = ({ compact = false }: GlobalSearchProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { query, setQuery, options, loading } = useGlobalSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <Box sx={{ flexGrow: 1, mx: compact ? 0 : isMobile ? 1 : 4 }}>
      <Autocomplete
        fullWidth
        freeSolo
        size="small"
        loading={loading}
        options={options}
        filterOptions={(x) => x}
        getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
        inputValue={query}
        onInputChange={(_, newValue) => setQuery(typeof newValue === 'string' ? newValue : '')}
        onChange={(_, newValue) => {
          if (newValue && typeof newValue !== 'string' && newValue.type === 'flavor') {
            navigate(`/flavor/${newValue.id}`);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch(e as unknown as React.FormEvent);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            placeholder={t('common.search')}
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                color: 'inherit',
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
                outline: 'none',
              },
              '& .MuiInputBase-input': { outline: 'none' },
            }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'inherit', opacity: 0.7 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & {
            key: React.Key;
          };
          return (
            <Box
              component="li"
              key={key}
              {...optionProps}
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <Box
                component="img"
                src={option.image_url || undefined}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  objectFit: 'contain',
                  bgcolor: 'action.hover',
                  p: 0.5,
                }}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.subtitle}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
    </Box>
  );
};
