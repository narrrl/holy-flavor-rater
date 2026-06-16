import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

export interface FlavorThumbProps {
  src?: string | null;
  /** Used for alt text and the initial-letter fallback. */
  name: string;
  /** Pixel size, or a responsive map (passed straight to sx width/height). */
  size?: number | Record<string, number>;
  /** sx border-radius (theme spacing units). */
  radius?: number;
  sx?: SxProps<Theme>;
}

/**
 * Square flavor thumbnail with a graceful fallback: when there is no image — or the
 * image fails to load — it renders the flavor's initial instead of the browser's
 * broken-image glyph. Mirrors the placeholder treatment in `FlavorCard`.
 */
export const FlavorThumb = ({ src, name, size = 64, radius = 1.5, sx }: FlavorThumbProps) => {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius,
        overflow: 'hidden',
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
    >
      {showImg ? (
        <Box
          component="img"
          src={src || undefined}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {name.charAt(0).toUpperCase()}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
