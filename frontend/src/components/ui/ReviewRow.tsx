import { Link } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GlassCard } from './Glass';
import RatingBadge from '../RatingBadge';
import RichText from '../RichText';
import { formatDate } from '../../utils/date';

export interface ReviewRowData {
  id: number;
  user: string;
  user_avatar: string | null;
  flavor: number;
  flavor_name?: string;
  flavor_image?: string | null;
  score: number;
  comment?: string;
  created_at: string;
}

export interface ReviewRowProps {
  review: ReviewRowData;
  showFlavor?: boolean;
  compact?: boolean;
}

export const ReviewRow = ({ review, showFlavor = true, compact }: ReviewRowProps) => (
  <Link
    to={`/flavor/${review.flavor}`}
    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
  >
    <GlassCard
      intensity="subtle"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: compact ? 1.5 : 2,
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
          boxShadow: (theme) => theme.tokens.elevation.md,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar src={review.user_avatar || undefined} sx={{ width: 28, height: 28 }}>
          {!review.user_avatar && review.user.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {review.user}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(review.created_at)}
          </Typography>
        </Box>
        <RatingBadge score={review.score} size="small" />
      </Box>

      {showFlavor && review.flavor_name && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }} noWrap>
          on {review.flavor_name}
        </Typography>
      )}

      {review.comment && (
        <Typography
          variant="body2"
          component="div"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <RichText text={review.comment} />
        </Typography>
      )}
    </GlassCard>
  </Link>
);
