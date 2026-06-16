import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { useTranslation } from 'react-i18next';
import { GlassCard, SectionHeader } from '../ui';

export interface CategoryBrowseGridProps {
  categories: { name: string; slug: string }[];
}

/**
 * Desktop-only category browser for the home page. Mirrors the new top-bar
 * category emphasis with a tappable tile grid, so categories are reachable
 * from the content area, not just the nav.
 */
export const CategoryBrowseGrid = ({ categories }: CategoryBrowseGridProps) => {
  const { t } = useTranslation();
  if (categories.length === 0) return null;

  return (
    <Box>
      <SectionHeader
        title={t('home.browseCategories', { defaultValue: 'Browse Categories' })}
        subtitle={t('home.browseCategoriesSubtitle', {
          defaultValue: 'Jump straight into a flavor line',
        })}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2,
        }}
      >
        {categories.map((cat) => (
          <GlassCard
            key={cat.slug}
            intensity="subtle"
            sx={{
              overflow: 'hidden',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: (theme) => theme.tokens.elevation.md,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: (theme) => theme.tokens.accent.gradient,
              },
            }}
          >
            <Box
              component={Link}
              to={`/category/${cat.slug}`}
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, pl: 1 }}>
                {t(`categories.${cat.slug}`, { defaultValue: cat.name })}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
            </Box>
          </GlassCard>
        ))}
      </Box>
    </Box>
  );
};

export interface QuickStatsStripProps {
  topName?: string;
  topScore?: number;
  newestName?: string;
  categoryCount: number;
}

/** Desktop-only featured strip — fills the wider canvas with at-a-glance picks. */
export const QuickStatsStrip = ({
  topName,
  topScore,
  newestName,
  categoryCount,
}: QuickStatsStripProps) => {
  const { t } = useTranslation();

  const items = [
    {
      icon: <EmojiEventsOutlinedIcon />,
      label: t('home.statTopRated', { defaultValue: 'Top Rated' }),
      value: topName,
      sub: topScore != null ? `${topScore.toFixed(1)} / 10` : undefined,
    },
    {
      icon: <FiberNewOutlinedIcon />,
      label: t('home.statNewest', { defaultValue: 'Newest Arrival' }),
      value: newestName,
    },
    {
      icon: <CategoryOutlinedIcon />,
      label: t('home.statCategories', { defaultValue: 'Categories' }),
      value: String(categoryCount),
    },
  ].filter((i) => i.value);

  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 2,
      }}
    >
      {items.map((item) => (
        <GlassCard
          key={item.label}
          intensity="subtle"
          sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              bgcolor: 'action.hover',
            }}
          >
            {item.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {item.label}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
              {item.value}
            </Typography>
            {item.sub && (
              <Typography variant="caption" color="text.secondary">
                {item.sub}
              </Typography>
            )}
          </Box>
        </GlassCard>
      ))}
    </Box>
  );
};
