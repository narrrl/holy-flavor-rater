import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Box,
  CardContent,
  Avatar,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Button,
  Stack,
  alpha,
  useTheme,
  Grid,
  TextField,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import ColorThief from 'colorthief';
import {
  usePublicProfile,
  type MiniUser,
  type PublicProfileRating,
} from '../api/queries/usePublicProfile';
import { useCurrentUserLite } from '../api/queries/useCurrentUserLite';
import {
  useAddProfileComment,
  useDeleteProfileComment,
  useFollowToggle,
} from '../api/mutations/useSocialMutations';
import { useTitle } from '../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import RatingBadge from '../components/RatingBadge';
import RichText from '../components/RichText';
import DynamicBanner from '../components/DynamicBanner';
import { formatDate } from '../utils/date';
import { PageShell, GlassCard, GlassSurface, FormCard, EmptyState } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

const PublicProfile: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { data, isLoading: loading } = usePublicProfile(username);
  const { data: currentUser } = useCurrentUserLite();
  const followToggle = useFollowToggle();
  const addComment = useAddProfileComment();
  const deleteCommentMutation = useDeleteProfileComment();
  const [activeTab, setActiveTab] = useState(0);
  const [categoryTab, setCategoryTab] = useState(0);
  const [palette, setPalette] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const { notify } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (data?.avatar) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = data.avatar;
      img.onload = () => {
        const colorThief = new ColorThief();
        try {
          const rawPalette = colorThief.getPalette(img, 10);
          const processed = rawPalette.map((c) => {
            const r = c[0] / 255,
              g = c[1] / 255,
              b = c[2] / 255;
            const max = Math.max(r, g, b),
              min = Math.min(r, g, b);
            const l = (max + min) / 2;
            const s =
              max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
            return { rgb: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, l, s };
          });
          const vibrant = processed
            .filter((c) => c.l > 0.2 && c.l < 0.85)
            .sort((a, b) => b.s - a.s);
          if (vibrant.length >= 2) setPalette([vibrant[0].rgb, vibrant[1].rgb]);
          else if (vibrant.length === 1) setPalette([vibrant[0].rgb, vibrant[0].rgb]);
          else setPalette([]);
        } catch {
          setPalette([]);
        }
      };
    } else {
      setPalette([]);
    }
  }, [data?.avatar]);

  const handleFollowToggle = async () => {
    if (!data) return;
    try {
      await followToggle.mutateAsync({
        userId: data.id,
        currentlyFollowing: data.is_following,
      });
    } catch {
      notify({ message: 'Failed to update follow status. Please login.', severity: 'error' });
    }
  };

  const handleMiniFollowToggle = async (user: MiniUser) => {
    try {
      await followToggle.mutateAsync({
        userId: user.id,
        currentlyFollowing: !!user.is_following,
      });
    } catch {
      notify({ message: 'Failed', severity: 'error' });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !data) return;
    try {
      await addComment.mutateAsync({ userId: data.id, text: newComment });
      setNewComment('');
    } catch {
      notify({ message: 'Failed to add comment', severity: 'error' });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!data) return;
    if (!(await confirm({ message: 'Delete this comment?', danger: true }))) return;
    try {
      await deleteCommentMutation.mutateAsync({ userId: data.id, commentId });
    } catch {
      notify({ message: 'Failed to delete comment', severity: 'error' });
    }
  };

  useTitle(data ? `${data.username}'s Ratings` : 'Profile');

  if (loading)
    return (
      <PageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  if (!data)
    return (
      <PageShell>
        <Typography>Profile not found.</Typography>
      </PageShell>
    );

  const categoryGroups = data.ratings.reduce<Record<string, PublicProfileRating[]>>(
    (acc, rating) => {
      const cat = rating.category_name || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(rating);
      return acc;
    },
    {},
  );

  const ratingCategories = ['All', ...Object.keys(categoryGroups)];
  const currentRatings: PublicProfileRating[] =
    categoryTab === 0 ? data.ratings : categoryGroups[ratingCategories[categoryTab]];

  const tiers = [
    { key: 'S', title: 'S-Tier', color: '#ff7f7f' },
    { key: 'A', title: 'A-Tier', color: '#ffbf7f' },
    { key: 'B', title: 'B-Tier', color: '#ffff7f' },
    { key: 'C', title: 'C-Tier', color: '#bfff7f' },
    { key: 'D', title: 'D-Tier', color: '#7fff7f' },
  ];

  const bannerColors = [
    palette[0] || theme.palette.primary.main,
    palette[1] || theme.palette.secondary.main,
    theme.palette.secondary.main,
    theme.palette.primary.main,
  ];

  const abstractBanner = `
    radial-gradient(at 0% 0%, ${alpha(bannerColors[0], 0.6)} 0px, transparent 55%),
    radial-gradient(at 100% 0%, ${alpha(bannerColors[1], 0.5)} 0px, transparent 55%),
    radial-gradient(at 100% 100%, ${alpha(bannerColors[2], 0.4)} 0px, transparent 55%),
    radial-gradient(at 0% 100%, ${alpha(bannerColors[3], 0.3)} 0px, transparent 55%),
    radial-gradient(at 50% 50%, ${alpha(bannerColors[0], 0.3)} 0px, transparent 60%),
    linear-gradient(135deg, ${alpha(bannerColors[0], 0.1)} 0%, ${alpha(bannerColors[1], 0.1)} 100%)
  `;

  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const renderUserCard = (user: MiniUser) => (
    <Grid key={user.id} size={{ xs: 12, sm: 6, lg: 4 }}>
      <GlassCard
        intensity="subtle"
        sx={{
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
          <Avatar
            component={Link}
            to={`/profile/${user.username}`}
            src={user.avatar || undefined}
            sx={{
              width: 56,
              height: 56,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: 'divider',
            }}
          >
            {user.username.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component={Link}
              to={`/profile/${user.username}`}
              variant="subtitle1"
              sx={{
                fontWeight: '900',
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
              Community Member
            </Typography>
          </Box>
          {currentUser && currentUser.username !== user.username && (
            <IconButton
              color={user.is_following ? 'secondary' : 'primary'}
              onClick={() => handleMiniFollowToggle(user)}
              sx={{
                bgcolor: alpha(
                  user.is_following ? theme.palette.secondary.main : theme.palette.primary.main,
                  0.1,
                ),
                '&:hover': {
                  bgcolor: alpha(
                    user.is_following ? theme.palette.secondary.main : theme.palette.primary.main,
                    0.2,
                  ),
                },
              }}
            >
              {user.is_following ? <PersonRemoveIcon /> : <PersonAddIcon />}
            </IconButton>
          )}
        </Box>
      </GlassCard>
    </Grid>
  );

  return (
    <PageShell>
      <Button
        variant="outlined"
        onClick={handleGoBack}
        startIcon={<ArrowBackIcon />}
        sx={{
          alignSelf: 'flex-start',
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 'bold',
          color: 'text.secondary',
        }}
      >
        {t('common.back')}
      </Button>

      {/* Profile Header */}
      <GlassCard intensity="strong" sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: { xs: 120, sm: 180 }, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0, background: abstractBanner }} />
          <DynamicBanner
            username={data.username}
            palette={palette}
            ratingsCount={data.ratings.length}
            followersCount={data.followers_count}
          />
        </Box>

        <CardContent
          sx={{ pt: 0, px: { xs: 2, md: 5 }, pb: { xs: 2, md: 4 }, position: 'relative' }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-end' },
              gap: { xs: 2, sm: 4 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                mt: { xs: -7, sm: -10 },
                p: 0.75,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${bannerColors[0]}, ${bannerColors[2]})`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
                display: 'flex',
              }}
            >
              <Avatar
                src={data.avatar || undefined}
                sx={{
                  width: { xs: 140, sm: 180 },
                  height: { xs: 140, sm: 180 },
                  border: '6px solid',
                  borderColor: theme.palette.background.paper,
                  fontSize: '4.5rem',
                  bgcolor: theme.palette.background.paper,
                  color: bannerColors[0],
                }}
              >
                {!data.avatar && data.username.charAt(0).toUpperCase()}
              </Avatar>
              {data.ratings.length > 50 && (
                <Tooltip title="Master Collector">
                  <VerifiedIcon
                    color="primary"
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      bgcolor: 'background.paper',
                      borderRadius: '50%',
                      fontSize: '2.2rem',
                      p: 0.2,
                      border: '3px solid',
                      borderColor: bannerColors[0],
                    }}
                  />
                </Tooltip>
              )}
            </Box>

            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' }, mt: { xs: 2, sm: 6 } }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: '900',
                  letterSpacing: -2,
                  fontSize: { xs: '2.8rem', sm: '4.2rem' },
                  lineHeight: 0.9,
                  color: 'text.primary',
                  display: 'inline-block',
                  mb: 2,
                }}
              >
                {data.username}
              </Typography>

              <Box>
                <GlassSurface
                  intensity="subtle"
                  sx={{ display: 'inline-flex', borderRadius: 1, overflow: 'hidden' }}
                >
                  {[
                    { label: 'Rated', val: data.ratings.length },
                    { label: 'Followers', val: data.followers_count },
                    { label: 'Following', val: data.following_count },
                  ].map((stat, i) => (
                    <React.Fragment key={stat.label}>
                      <Box sx={{ py: 1.2, width: { xs: 90, sm: 120 }, textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: '900', lineHeight: 1 }}>
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
                      {i < 2 && (
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

            <Stack
              direction="row"
              spacing={1.5}
              sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'center', mb: 1 }}
            >
              {currentUser?.username !== data.username && (
                <Button
                  variant={data.is_following ? 'outlined' : 'contained'}
                  onClick={handleFollowToggle}
                  startIcon={data.is_following ? <PersonRemoveIcon /> : <PersonAddIcon />}
                  sx={{
                    borderRadius: 1,
                    px: 4,
                    fontWeight: '900',
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                >
                  {data.is_following ? 'Unfollow' : 'Follow'}
                </Button>
              )}
              {currentUser?.is_superuser && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate(`/admin-panel/user/${data.id}`)}
                  sx={{ borderRadius: 1, px: 2.5, fontWeight: 'bold', textTransform: 'none' }}
                >
                  {t('admin.manageUser')}
                </Button>
              )}
            </Stack>
          </Box>
        </CardContent>
      </GlassCard>

      {/* Tabs */}
      <GlassSurface
        intensity="subtle"
        sx={{
          position: 'sticky',
          top: 72,
          zIndex: 10,
          py: 1,
          borderRadius: 1,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              fontWeight: '900',
              textTransform: 'none',
              fontSize: '1rem',
              borderRadius: 1,
            },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          <Tab label="Ratings" />
          <Tab label="Guestbook" />
          <Tab label="Followers" />
          <Tab label="Following" />
        </Tabs>
      </GlassSurface>

      <Box sx={{ minHeight: 400 }}>
        {activeTab === 0 && (
          <Box>
            <Box
              sx={{
                mb: 5,
                display: 'flex',
                overflowX: 'auto',
                pb: 1,
                gap: 1.5,
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {ratingCategories.map((cat, idx) => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setCategoryTab(idx)}
                  color={categoryTab === idx ? 'primary' : 'default'}
                  variant={categoryTab === idx ? 'filled' : 'outlined'}
                  sx={{ fontWeight: '900', px: 1.5, borderRadius: 1 }}
                />
              ))}
            </Box>

            {currentRatings.length === 0 ? (
              <EmptyState title="No ratings in this category" />
            ) : (
              <Stack spacing={10}>
                {tiers.map((tier) => {
                  const items = currentRatings.filter((r) => {
                    const s = r.score;
                    if (tier.key === 'S') return s >= 9;
                    if (tier.key === 'A') return s >= 7 && s < 9;
                    if (tier.key === 'B') return s >= 5 && s < 7;
                    if (tier.key === 'C') return s >= 3 && s < 5;
                    return s < 3;
                  });

                  if (items.length === 0) return null;

                  return (
                    <Box key={tier.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3 }}>
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: tier.color,
                            color: 'black',
                            fontWeight: '900',
                            fontSize: '2rem',
                            borderRadius: 0.5,
                            boxShadow: `0 0 20px ${alpha(tier.color, 0.6)}`,
                          }}
                        >
                          {tier.key}
                        </Box>
                        <Box>
                          <Typography
                            variant="h4"
                            sx={{ fontWeight: '900', lineHeight: 1.1, letterSpacing: -0.5 }}
                          >
                            {tier.title}
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ fontWeight: 'bold', opacity: 0.7 }}
                          >
                            {items.length} items
                          </Typography>
                        </Box>
                        <Divider sx={{ flexGrow: 1, borderStyle: 'dashed', opacity: 0.3 }} />
                      </Box>

                      <Grid container spacing={3}>
                        {items.map((rating) => (
                          <Grid key={rating.id} size={{ xs: 6, sm: 4, lg: 2.4 }}>
                            <GlassCard
                              intensity="subtle"
                              sx={{
                                height: '100%',
                                transition: 'all 0.3s ease',
                                overflow: 'hidden',
                                '&:hover': {
                                  transform: 'translateY(-8px)',
                                  borderColor: 'primary.main',
                                  boxShadow: (th) => th.tokens.elevation.md,
                                },
                              }}
                            >
                              <Link
                                to={`/flavor/${rating.flavor}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                              >
                                <Box
                                  sx={{
                                    position: 'relative',
                                    aspectRatio: '1/1',
                                    bgcolor: 'background.default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={rating.flavor_image || undefined}
                                    alt={rating.flavor_name}
                                    loading="lazy"
                                    sx={{
                                      height: '100%',
                                      width: '100%',
                                      objectFit: 'cover',
                                      transition: 'transform 0.5s ease',
                                      '&:hover': { transform: 'scale(1.1)' },
                                    }}
                                  />
                                  <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                                    <RatingBadge score={rating.score} size="small" />
                                  </Box>
                                </Box>
                                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: '900',
                                      fontSize: '0.85rem',
                                      lineHeight: 1.2,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {rating.flavor_name}
                                  </Typography>
                                </CardContent>
                              </Link>
                              {currentUser?.is_superuser && (
                                <Box sx={{ px: 1, pb: 1 }}>
                                  <Button
                                    size="small"
                                    fullWidth
                                    variant="outlined"
                                    color="secondary"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      navigate(`/admin-panel/rating/${rating.id}`);
                                    }}
                                    sx={{
                                      borderRadius: 1,
                                      textTransform: 'none',
                                      fontSize: '0.6rem',
                                      py: 0,
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    Manage
                                  </Button>
                                </Box>
                              )}
                            </GlassCard>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ maxWidth: 900, mx: 'auto', width: '100%' }}>
            {currentUser && (
              <Box sx={{ mb: 5 }}>
                <FormCard
                  title="Leave a message"
                  onSubmit={handleAddComment}
                  actions={
                    <Button
                      variant="contained"
                      type="submit"
                      endIcon={<SendIcon />}
                      sx={{ borderRadius: 2, px: 5, fontWeight: '900', textTransform: 'none' }}
                    >
                      Send Message
                    </Button>
                  }
                >
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Say something about their taste..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                </FormCard>
              </Box>
            )}

            <Stack spacing={2.5}>
              {data.comments.length === 0 ? (
                <EmptyState
                  title="No entries in the guestbook yet."
                  subtitle="Be the first to leave a message!"
                />
              ) : (
                data.comments.map((comment) => (
                  <GlassCard key={comment.id} intensity="subtle">
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Stack direction="row" spacing={2.5} alignItems="center">
                          <Link
                            to={`/profile/${comment.author_username}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <Avatar
                              src={comment.author_avatar || undefined}
                              sx={{
                                width: 48,
                                height: 48,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                border: '2px solid white',
                              }}
                            >
                              {comment.author_username.charAt(0).toUpperCase()}
                            </Avatar>
                          </Link>
                          <Box>
                            <Link
                              to={`/profile/${comment.author_username}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: '900', lineHeight: 1.2 }}
                              >
                                {comment.author_username}
                              </Typography>
                            </Link>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontWeight: 'bold' }}
                            >
                              {formatDate(comment.created_at)}
                            </Typography>
                          </Box>
                        </Stack>
                        {(currentUser?.username === comment.author_username ||
                          currentUser?.username === data.username ||
                          currentUser?.is_superuser) && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{ mt: 3, pl: { xs: 0, sm: 9.5 }, lineHeight: 1.7, fontSize: '1rem' }}
                      >
                        <RichText text={comment.text} />
                      </Typography>
                    </CardContent>
                  </GlassCard>
                ))
              )}
            </Stack>
          </Box>
        )}

        {activeTab === 2 && (
          <Grid container spacing={3}>
            {data.followers.length === 0 ? (
              <Grid size={12}>
                <EmptyState title="No followers yet." />
              </Grid>
            ) : (
              data.followers.map(renderUserCard)
            )}
          </Grid>
        )}

        {activeTab === 3 && (
          <Grid container spacing={3}>
            {data.following.length === 0 ? (
              <Grid size={12}>
                <EmptyState title="Not following anyone yet." />
              </Grid>
            ) : (
              data.following.map(renderUserCard)
            )}
          </Grid>
        )}
      </Box>
    </PageShell>
  );
};

export default PublicProfile;
