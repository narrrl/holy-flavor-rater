import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material';

interface RichTextProps {
  text: string;
}

const RichText: React.FC<RichTextProps> = ({ text }) => {
  const theme = useTheme();

  if (!text) return null;

  const parts = text.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.substring(1);
          return (
            <Link
              key={i}
              to={`/profile/${username}`}
              style={{
                color: theme.palette.primary.main,
                textDecoration: 'none',
                fontWeight: 'bold',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                padding: '0 4px',
                borderRadius: '4px',
              }}
            >
              {part}
            </Link>
          );
        }
        return part;
      })}
    </span>
  );
};

export default RichText;
