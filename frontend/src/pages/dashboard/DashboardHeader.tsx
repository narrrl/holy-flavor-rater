import React from 'react';
import {
  Avatar,
  Box,
  Button,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import { useTranslation } from 'react-i18next';
import type { DashboardStats } from '../../api/types';
import { GlassCard, GlassSurface } from '../../components/ui';

export interface DashboardHeaderProps {
  user: { username: string; avatar: string | null };
  ratedCount: number;
  missingCount: number;
  stats: DashboardStats;
  onBack: () => void;
  onShare: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  ratedCount,
  missingCount,
  stats,
  onBack,
  onShare,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  // Theme-derived gradient (replaced the avatar-sampled ColorThief palette).
  const grad = [theme.palette.primary.main, theme.palette.secondary.main];

  const statTiles = [
    { label: t('dashboard.myRatings'), val: ratedCount },
    {
      label: t('dashboard.avgScore'),
      val: stats.average_score != null ? stats.average_score.toFixed(1) : '–',
    },
    { label: t('dashboard.thisMonth'), val: stats.ratings_this_month },
    { label: t('dashboard.missing'), val: missingCount },
  ];
  const fav = stats.favorite_category;

  return (
    <>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isXs ? (
            <IconButton
              onClick={onBack}
              aria-label={t('common.back')}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : (
            <Button
              variant="outlined"
              onClick={onBack}
              startIcon={<ArrowBackIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
            >
              {t('common.back')}
            </Button>
          )}
          <Typography variant="h5" sx={{ fontWeight: '900', display: { xs: 'none', md: 'block' } }}>
            {t('dashboard.title')}
          </Typography>
        </Box>

        {isXs ? (
          <Tooltip title={t('dashboard.shareProfile')}>
            <IconButton
              color="primary"
              onClick={onShare}
              aria-label={t('dashboard.shareProfile')}
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="contained"
            onClick={onShare}
            startIcon={<ShareIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            {t('dashboard.shareProfile')}
          </Button>
        )}
      </Box>

      {/* Profile Header — theme-derived gradient (ColorThief dropped in the redesign) */}
      <GlassCard intensity="strong" sx={{ overflow: 'hidden' }}>
        {!isXs && (
          <Box sx={{ height: 100, position: 'relative', overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(at 0% 0%, ${alpha(grad[0], 0.6)} 0px, transparent 55%),
                  radial-gradient(at 100% 0%, ${alpha(grad[1], 0.5)} 0px, transparent 55%),
                  radial-gradient(at 50% 100%, ${alpha(theme.palette.primary.main, 0.3)} 0px, transparent 55%),
                  linear-gradient(135deg, ${alpha(grad[0], 0.1)} 0%, ${alpha(grad[1], 0.1)} 100%)
                `,
              }}
            />
          </Box>
        )}

        <CardContent
          sx={{
            pt: { xs: 2, sm: 0 },
            px: { xs: 2, sm: 4 },
            pb: { xs: 2, sm: 4 },
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'row', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-end' },
              gap: { xs: 2, sm: 4 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                mt: { xs: 0, sm: -6 },
                p: 0.5,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
                boxShadow: { xs: 'none', sm: '0 12px 48px rgba(0,0,0,0.25)' },
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <Avatar
                src={user.avatar || undefined}
                sx={{
                  width: { xs: 56, sm: 110 },
                  height: { xs: 56, sm: 110 },
                  border: { xs: '2px solid', sm: '4px solid' },
                  borderColor: theme.palette.background.paper,
                  fontSize: { xs: '1.5rem', sm: '3rem' },
                  bgcolor: theme.palette.background.paper,
                  color: 'primary.main',
                }}
              >
                {!user.avatar && user.username.charAt(0).toUpperCase()}
              </Avatar>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                textAlign: { xs: 'left', sm: 'left' },
                mt: { xs: 0, sm: 4 },
              }}
            >
              <Typography
                variant={isXs ? 'h5' : 'h3'}
                sx={{
                  fontWeight: '900',
                  mb: 0.25,
                  letterSpacing: -1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.username}
              </Typography>
              {!isXs && (
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {t('dashboard.welcome', { username: user.username })}
                </Typography>
              )}
              {fav && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: { xs: 0.5, sm: 0 } }}>
                  {t('dashboard.favoriteCategory', {
                    category: t(`categories.${fav.slug}`, { defaultValue: fav.name }),
                    count: fav.count,
                  })}
                </Typography>
              )}

              <Box sx={{ mt: { xs: 1, sm: 2 } }}>
                <GlassSurface
                  intensity="subtle"
                  sx={{
                    display: 'inline-flex',
                    borderRadius: 1,
                    overflow: 'hidden',
                    flexWrap: 'wrap',
                  }}
                >
                  {statTiles.map((stat, i) => (
                    <React.Fragment key={stat.label}>
                      <Box
                        sx={{
                          py: { xs: 0.5, sm: 1 },
                          width: { xs: 80, sm: 140 },
                          textAlign: 'center',
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: '900', lineHeight: 1, color: 'text.primary' }}
                        >
                          {stat.val}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            opacity: 0.5,
                            fontSize: '0.6rem',
                            letterSpacing: 1,
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                      {i < statTiles.length - 1 && (
                        <Divider
                          orientation="vertical"
                          flexItem
                          sx={{ borderStyle: 'solid', opacity: 0.1 }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </GlassSurface>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </GlassCard>
    </>
  );
};

export default DashboardHeader;
