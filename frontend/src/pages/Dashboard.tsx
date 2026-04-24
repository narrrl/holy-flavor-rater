import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography,
  CardContent,
  Box,
  Button,
  CircularProgress,
  Avatar,
  Tabs,
  Tab,
  Grid,
  alpha,
  useTheme,
  Divider,
  Stack,
  Chip,
  Collapse,
  TextField,
  Rating as MuiRating,
  InputAdornment,
  Tooltip,
  useMediaQuery,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SortIcon from '@mui/icons-material/Sort';
import ShareIcon from '@mui/icons-material/Share';
import CommentIcon from '@mui/icons-material/Comment';
import VerifiedIcon from '@mui/icons-material/Verified';
import SearchIcon from '@mui/icons-material/Search';
import ColorThief from 'colorthief';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import RatingBadge from '../components/RatingBadge';
import StatusBadge from '../components/StatusBadge';
import MentionTextField from '../components/MentionTextField';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';
import { PageShell, GlassCard, GlassSurface, EmptyState } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

interface Reply {
  id: number;
  user: string;
  text: string;
  created_at: string;
}

interface RatedItem {
  id: number;
  flavor: number;
  flavor_name: string;
  flavor_image: string | null;
  category_name: string;
  category_slug: string;
  score: number;
  comment: string | null;
  created_at: string;
  replies: Reply[];
  is_legacy?: boolean;
  is_available?: boolean;
}

interface MissingFlavor {
  id: number;
  name: string;
  image_url: string | null;
  category_name: string;
  category_slug: string;
  average_rating: number;
  followed_average_rating?: number;
  is_legacy?: boolean;
  is_available?: boolean;
}

interface DashboardData {
  user: { username: string; avatar: string | null };
  rated_count: number;
  missing_count: number;
  missing_flavors: MissingFlavor[];
  my_ratings: RatedItem[];
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  useTitle(t('dashboard.title'));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [palette, setPalette] = useState<string[]>([]);

  const [exploreCategory, setExploreCategory] = useState<string>('All');
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreSort, setExploreSort] = useState<'community' | 'circle'>('community');

  const [ratedCategory, setRatedCategory] = useState<string>('All');
  const [ratedSearch, setRatedSearch] = useState('');
  const [ratedSort, setRatedSort] = useState<'date' | 'rating'>('date');

  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const shareUrl = data ? `${window.location.origin}/profile/${data.user.username}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    notify({ message: t('dashboard.copySuccess'), severity: 'success' });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('users/dashboard/');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data?.user?.avatar) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = data.user.avatar;
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
          const vibrant = processed.filter((c) => c.l > 0.2 && c.l < 0.85).sort((a, b) => b.s - a.s);
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
  }, [data?.user?.avatar]);

  const handleUpdateRating = async (ratingId: number) => {
    try {
      await api.patch(`ratings/${ratingId}/`, { score: editScore, comment: editComment });
      setEditingRatingId(null);
      fetchData();
    } catch {
      notify({ message: 'Failed to update review', severity: 'error' });
    }
  };

  const handleDeleteRating = async (ratingId: number) => {
    if (!(await confirm({ message: 'Delete this review?', danger: true }))) return;
    try {
      await api.delete(`ratings/${ratingId}/`);
      fetchData();
    } catch {
      notify({ message: 'Failed to delete review', severity: 'error' });
    }
  };

  const handleReplySubmit = async (ratingId: number) => {
    const text = replyInputs[ratingId];
    if (!text) return;
    try {
      await api.post(`ratings/${ratingId}/reply/`, { text });
      setReplyInputs({ ...replyInputs, [ratingId]: '' });
      setExpandedReplies({ ...expandedReplies, [ratingId]: true });
      fetchData();
    } catch {
      notify({ message: 'Failed to send reply', severity: 'error' });
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!(await confirm({ message: 'Delete this reply?', danger: true }))) return;
    try {
      await api.delete(`replies/${replyId}/`);
      fetchData();
    } catch {
      notify({ message: 'Failed to delete reply', severity: 'error' });
    }
  };

  const exploreCategories = useMemo(() => {
    if (!data) return ['All'];
    const cats = new Set(
      data.missing_flavors.filter((f) => f.category_name !== 'Packs and other').map((f) => f.category_name),
    );
    return ['All', ...Array.from(cats).sort()];
  }, [data]);

  const ratedCategories = useMemo(() => {
    if (!data) return ['All'];
    const cats = new Set(data.my_ratings.map((r) => r.category_name));
    return ['All', ...Array.from(cats).sort()];
  }, [data]);

  const filteredMissing = useMemo(() => {
    if (!data) return [];
    const items = data.missing_flavors.filter((f) => {
      const isNotPack = f.category_name !== 'Packs and other';
      const matchCat = exploreCategory === 'All' || f.category_name === exploreCategory;
      const matchSearch = f.name.toLowerCase().includes(exploreSearch.toLowerCase());
      return isNotPack && matchCat && matchSearch;
    });

    if (exploreSort === 'community') {
      items.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else {
      items.sort((a, b) => (b.followed_average_rating || 0) - (a.followed_average_rating || 0));
    }
    return items;
  }, [data, exploreCategory, exploreSearch, exploreSort]);

  const filteredAndSortedRated = useMemo(() => {
    if (!data) return [];
    const items = [...data.my_ratings].filter((r) => {
      const matchCat = ratedCategory === 'All' || r.category_name === ratedCategory;
      const matchSearch = r.flavor_name.toLowerCase().includes(ratedSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    if (ratedSort === 'rating') {
      items.sort(
        (a, b) =>
          b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return items;
  }, [data, ratedCategory, ratedSearch, ratedSort]);

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
        <Typography>Please login to view dashboard.</Typography>
      </PageShell>
    );

  return (
    <PageShell>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            {t('common.back')}
          </Button>
          <Typography variant="h5" sx={{ fontWeight: '900', display: { xs: 'none', md: 'block' } }}>
            {t('dashboard.title')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleCopyLink}
          startIcon={<ShareIcon />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
        >
          {t('dashboard.shareProfile')}
        </Button>
      </Box>

      {/* Profile Header — keeps inline ColorThief gradient per Phase-2 risk fallback */}
      <GlassCard intensity="strong" sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: { xs: 80, sm: 100 }, position: 'relative', overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(at 0% 0%, ${alpha(palette[0] || theme.palette.primary.main, 0.6)} 0px, transparent 55%),
                radial-gradient(at 100% 0%, ${alpha(palette[1] || theme.palette.secondary.main, 0.5)} 0px, transparent 55%),
                radial-gradient(at 50% 100%, ${alpha(theme.palette.primary.main, 0.3)} 0px, transparent 55%),
                linear-gradient(135deg, ${alpha(palette[0] || theme.palette.primary.main, 0.1)} 0%, ${alpha(palette[1] || theme.palette.secondary.main, 0.1)} 100%)
              `,
            }}
          />
        </Box>

        <CardContent sx={{ pt: 0, px: { xs: 2, sm: 4 }, pb: 4, position: 'relative' }}>
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
                mt: { xs: -5, sm: -6 },
                p: 0.5,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${palette[0] || theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
                display: 'flex',
              }}
            >
              <Avatar
                src={data.user.avatar || undefined}
                sx={{
                  width: { xs: 90, sm: 110 },
                  height: { xs: 90, sm: 110 },
                  border: '4px solid',
                  borderColor: theme.palette.background.paper,
                  fontSize: '3rem',
                  bgcolor: theme.palette.background.paper,
                  color: palette[0] || 'primary.main',
                }}
              >
                {!data.user.avatar && data.user.username.charAt(0).toUpperCase()}
              </Avatar>
            </Box>

            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' }, mt: { xs: 1, sm: 4 } }}>
              <Typography variant="h3" sx={{ fontWeight: '900', mb: 0.5, letterSpacing: -1 }}>
                {data.user.username}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {t('dashboard.welcome', { username: data.user.username })}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <GlassSurface
                  intensity="subtle"
                  sx={{ display: 'inline-flex', borderRadius: 1, overflow: 'hidden' }}
                >
                  {[
                    { label: t('dashboard.myRatings'), val: data.rated_count },
                    { label: t('dashboard.missing'), val: data.missing_count },
                  ].map((stat, i) => (
                    <React.Fragment key={stat.label}>
                      <Box sx={{ py: 1, width: { xs: 100, sm: 140 }, textAlign: 'center' }}>
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
                      {i < 1 && (
                        <Divider orientation="vertical" flexItem sx={{ borderStyle: 'solid', opacity: 0.1 }} />
                      )}
                    </React.Fragment>
                  ))}
                </GlassSurface>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </GlassCard>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
        >
          <Tab
            label={t('dashboard.myReviews')}
            sx={{ fontWeight: '900', textTransform: 'none', fontSize: '1.1rem' }}
          />
          <Tab
            label={t('dashboard.exploreNew')}
            sx={{ fontWeight: '900', textTransform: 'none', fontSize: '1.1rem' }}
          />
        </Tabs>
      </Box>

      {/* TAB 0: MY REVIEWS */}
      {activeTab === 0 && (
        <Box>
          <GlassSurface intensity="subtle" sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={{ xs: 2, lg: 1.5 }} alignItems="center">
              <Grid size={{ xs: 12, lg: 4, xl: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('dashboard.searchRated')}
                  value={ratedSearch}
                  onChange={(e) => setRatedSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, lg: 'auto' }} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    py: 0.5,
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {ratedCategories.map((cat) => (
                    <Chip
                      key={cat}
                      label={
                        cat === 'All'
                          ? t('nav.home').replace('Home', 'All')
                          : t(
                              `categories.${data.my_ratings.find((r) => r.category_name === cat)?.category_slug}`,
                              { defaultValue: cat },
                            )
                      }
                      onClick={() => setRatedCategory(cat)}
                      color={ratedCategory === cat ? 'primary' : 'default'}
                      variant={ratedCategory === cat ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 'bold', flexShrink: 0 }}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, lg: 'auto' }}>
                <Select
                  size="small"
                  value={ratedSort}
                  onChange={(e) => setRatedSort(e.target.value as 'date' | 'rating')}
                  startAdornment={
                    <InputAdornment position="start">
                      <SortIcon fontSize="small" />
                    </InputAdornment>
                  }
                  sx={{ minWidth: { xs: '100%', lg: 140 }, fontWeight: 'bold' }}
                >
                  <MenuItem value="date">{t('dashboard.date')}</MenuItem>
                  <MenuItem value="rating">{t('dashboard.rating')}</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </GlassSurface>

          <Stack spacing={3}>
            {filteredAndSortedRated.length === 0 ? (
              <EmptyState
                title={t('dashboard.noRatings')}
                action={
                  <Button onClick={() => setActiveTab(1)} variant="contained" sx={{ borderRadius: 2 }}>
                    {t('dashboard.exploreFlavors')}
                  </Button>
                }
              />
            ) : (
              filteredAndSortedRated.map((rating) => (
                <GlassCard key={rating.id}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {editingRatingId === rating.id ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {t('dashboard.editingReview', { flavor: rating.flavor_name })}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body2">{t('dashboard.newScore')}</Typography>
                          <MuiRating
                            max={10}
                            value={editScore}
                            onChange={(_, val) => setEditScore(val || 0)}
                          />
                        </Stack>
                        <MentionTextField
                          multiline
                          rows={3}
                          value={editComment}
                          onChange={setEditComment}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" size="small" onClick={() => handleUpdateRating(rating.id)}>
                            {t('common.save')}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setEditingRatingId(null)}
                          >
                            {t('common.cancel')}
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box
                              sx={{
                                width: 64,
                                height: 64,
                                bgcolor: 'background.default',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              <Box
                                component="img"
                                src={rating.flavor_image || undefined}
                                alt={rating.flavor_name}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                <Link
                                  to={`/flavor/${rating.flavor}`}
                                  style={{ color: 'inherit', textDecoration: 'none' }}
                                >
                                  {rating.flavor_name}
                                </Link>
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {t(`categories.${rating.category_slug}`, {
                                    defaultValue: rating.category_name,
                                  })}{' '}
                                  • {formatDate(rating.created_at)}
                                </Typography>
                                <StatusBadge
                                  isLegacy={rating.is_legacy}
                                  isAvailable={rating.is_available}
                                  size="small"
                                />
                              </Stack>
                            </Box>
                          </Box>
                          <RatingBadge score={rating.score} size={isMobile ? 'medium' : 'large'} />
                        </Box>

                        <Box sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2 }}>
                          {rating.comment ? (
                            <RichText text={rating.comment} />
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {t('dashboard.noComment')}
                            </Typography>
                          )}
                        </Box>

                        <Stack direction="row" spacing={2} alignItems="center">
                          <Button
                            size="small"
                            startIcon={<CommentIcon fontSize="small" />}
                            onClick={() =>
                              setExpandedReplies((prev) => ({ ...prev, [rating.id]: !prev[rating.id] }))
                            }
                            sx={{ textTransform: 'none', fontWeight: 'bold', color: 'text.secondary' }}
                          >
                            {rating.replies.length} {t('common.replies')}
                          </Button>
                          <Box sx={{ flexGrow: 1 }} />
                          <Button
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                            onClick={() => {
                              setEditingRatingId(rating.id);
                              setEditScore(rating.score);
                              setEditComment(rating.comment || '');
                            }}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            sx={{ fontWeight: 'bold' }}
                            onClick={() => handleDeleteRating(rating.id)}
                          >
                            {t('common.delete')}
                          </Button>
                        </Stack>

                        <Collapse in={expandedReplies[rating.id]}>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            {rating.replies.map((reply) => (
                              <Box
                                key={reply.id}
                                sx={{
                                  mb: 2,
                                  pl: 2,
                                  borderLeft: '3px solid',
                                  borderColor: 'primary.main',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                                  >
                                    {reply.user}
                                    {reply.user === data.user.username && (
                                      <VerifiedIcon
                                        sx={{ fontSize: '0.8rem', color: 'primary.main', ml: 0.5 }}
                                      />
                                    )}
                                  </Typography>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDate(reply.created_at)}
                                    </Typography>
                                    {reply.user === data.user.username && (
                                      <Button
                                        size="small"
                                        color="error"
                                        sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }}
                                        onClick={() => handleDeleteReply(reply.id)}
                                      >
                                        {t('common.delete')}
                                      </Button>
                                    )}
                                  </Stack>
                                </Box>
                                <Typography variant="body2">
                                  <RichText text={reply.text} />
                                </Typography>
                              </Box>
                            ))}
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                              <MentionTextField
                                placeholder={t('community.writeReply')}
                                value={replyInputs[rating.id] || ''}
                                onChange={(val) =>
                                  setReplyInputs({ ...replyInputs, [rating.id]: val })
                                }
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && !e.shiftKey && handleReplySubmit(rating.id)
                                }
                              />
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleReplySubmit(rating.id)}
                                disabled={!replyInputs[rating.id]}
                                sx={{ height: 40, px: 3 }}
                              >
                                {t('common.reply')}
                              </Button>
                            </Stack>
                          </Box>
                        </Collapse>
                      </>
                    )}
                  </CardContent>
                </GlassCard>
              ))
            )}
          </Stack>
        </Box>
      )}

      {/* TAB 1: EXPLORE NEW */}
      {activeTab === 1 && (
        <Box>
          <GlassSurface intensity="subtle" sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={{ xs: 2, lg: 1.5 }} alignItems="center">
              <Grid size={{ xs: 12, lg: 4, xl: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('dashboard.searchMissing')}
                  value={exploreSearch}
                  onChange={(e) => setExploreSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, lg: 'auto' }} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    py: 0.5,
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {exploreCategories.map((cat) => (
                    <Chip
                      key={cat}
                      label={
                        cat === 'All'
                          ? t('nav.home').replace('Home', 'All')
                          : t(
                              `categories.${data.missing_flavors.find((f) => f.category_name === cat)?.category_slug}`,
                              { defaultValue: cat },
                            )
                      }
                      onClick={() => setExploreCategory(cat)}
                      color={exploreCategory === cat ? 'primary' : 'default'}
                      variant={exploreCategory === cat ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 'bold', flexShrink: 0 }}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, lg: 'auto' }}>
                <Select
                  size="small"
                  value={exploreSort}
                  onChange={(e) => setExploreSort(e.target.value as 'community' | 'circle')}
                  startAdornment={
                    <InputAdornment position="start">
                      <SortIcon fontSize="small" />
                    </InputAdornment>
                  }
                  sx={{ minWidth: { xs: '100%', lg: 180 }, fontWeight: 'bold' }}
                >
                  <MenuItem value="community">{t('dashboard.communityRating')}</MenuItem>
                  <MenuItem value="circle">{t('dashboard.circleRating')}</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </GlassSurface>

          {filteredMissing.length === 0 ? (
            <EmptyState title={t('dashboard.allRated')} />
          ) : (
            <Grid container spacing={2}>
              {filteredMissing.map((flavor) => (
                <Grid key={flavor.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <GlassCard
                    intensity="subtle"
                    sx={{
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: 'primary.main',
                        boxShadow: (th) => th.tokens.elevation.md,
                      },
                      overflow: 'hidden',
                    }}
                  >
                    <Link
                      to={`/flavor/${flavor.id}`}
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
                          src={flavor.image_url || undefined}
                          alt={flavor.name}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.5s ease',
                            '&:hover': { transform: 'scale(1.1)' },
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <Tooltip
                            title={
                              exploreSort === 'community'
                                ? t('dashboard.communityRating')
                                : t('dashboard.circleRating')
                            }
                          >
                            <Box>
                              <RatingBadge
                                score={
                                  exploreSort === 'community'
                                    ? flavor.average_rating || 0
                                    : flavor.followed_average_rating || 0
                                }
                                size="small"
                                sx={{
                                  height: 24,
                                  bgcolor: exploreSort === 'circle' ? 'secondary.main' : 'primary.main',
                                }}
                              />
                            </Box>
                          </Tooltip>
                          <StatusBadge
                            isLegacy={flavor.is_legacy}
                            isAvailable={flavor.is_available}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <CardContent sx={{ p: 2 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 'bold',
                            mb: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {flavor.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t(`categories.${flavor.category_slug}`, {
                            defaultValue: flavor.category_name,
                          })}
                        </Typography>
                      </CardContent>
                    </Link>
                  </GlassCard>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </PageShell>
  );
};

export default Dashboard;
