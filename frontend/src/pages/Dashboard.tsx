import React, { useEffect, useState, useMemo } from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Box, 
  Button, 
  Container, 
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
    InputAdornment, 
    Tooltip,
    useMediaQuery
  } from '@mui/material';import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import CommentIcon from '@mui/icons-material/Comment';
import VerifiedIcon from '@mui/icons-material/Verified';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import RatingBadge from '../components/RatingBadge';
import MentionTextField from '../components/MentionTextField';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';

interface DashboardData {
    user: { username: string, avatar: string | null };
    rated_count: number;
    missing_count: number;
    missing_flavors: any[];
    my_ratings: any[];
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  useTitle(t('nav.dashboard'));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Filtering states for Explore New
  const [exploreCategory, setExploreCategory] = useState<string>('All');
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreSort, setExploreSort] = useState<'community' | 'circle'>('community');

  // Filtering states for My Reviews
  const [ratedCategory, setRatedCategory] = useState<string>('All');
  const [ratedSearch, setRatedSearch] = useState('');
  const [ratedSort, setRatedSort] = useState<'date' | 'rating'>('date');

  // Inline Review Edit state
  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  // Inline Reply state
  const [replyInputs, setReplyInputs] = useState<{[key: number]: string}>({});
  const [expandedReplies, setExpandedReplies] = useState<{[key: number]: boolean}>({});

  const shareUrl = data ? `${window.location.origin}/profile/${data.user.username}` : '';

  const handleCopyLink = () => {
      navigator.clipboard.writeText(shareUrl);
      alert(t('dashboard.copySuccess'));
  };

  const handleGoBack = () => {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
  };

  const fetchData = async () => {
    try {
      const res = await api.get('users/dashboard/');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update Review Logic
  const handleUpdateRating = async (ratingId: number) => {
      try {
          await api.patch(`ratings/${ratingId}/`, { score: editScore, comment: editComment });
          setEditingRatingId(null);
          fetchData();
      } catch (err) { alert('Failed to update review'); }
  };

  const handleDeleteRating = async (ratingId: number) => {
      if (!confirm('Delete this review?')) return;
      try {
          await api.delete(`ratings/${ratingId}/`);
          fetchData();
      } catch (err) { alert('Failed to delete review'); }
  };

  // Reply Logic
  const handleReplySubmit = async (ratingId: number) => {
      const text = replyInputs[ratingId];
      if (!text) return;
      try {
          await api.post(`ratings/${ratingId}/reply/`, { text });
          setReplyInputs({ ...replyInputs, [ratingId]: '' });
          setExpandedReplies({ ...expandedReplies, [ratingId]: true });
          fetchData();
      } catch (err) { alert('Failed to send reply'); }
  };

  const handleDeleteReply = async (replyId: number) => {
      if (!confirm('Delete this reply?')) return;
      try {
          await api.delete(`replies/${replyId}/`);
          fetchData();
      } catch (err) { alert('Failed to delete reply'); }
  };

  // Performance Optimization: Memoize categories and filtered lists
  const exploreCategories = useMemo(() => {
      if (!data) return ['All'];
      const cats = new Set(data.missing_flavors.map(f => f.category_name));
      return ['All', ...Array.from(cats).sort()];
  }, [data]);

  const ratedCategories = useMemo(() => {
      if (!data) return ['All'];
      const cats = new Set(data.my_ratings.map(r => r.category_name));
      return ['All', ...Array.from(cats).sort()];
  }, [data]);

  const filteredMissing = useMemo(() => {
      if (!data) return [];
      let items = data.missing_flavors.filter(f => {
          const matchCat = exploreCategory === 'All' || f.category_name === exploreCategory;
          const matchSearch = f.name.toLowerCase().includes(exploreSearch.toLowerCase());
          return matchCat && matchSearch;
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
      let items = [...data.my_ratings].filter(r => {
          const matchCat = ratedCategory === 'All' || r.category_name === ratedCategory;
          const matchSearch = r.flavor_name.toLowerCase().includes(ratedSearch.toLowerCase());
          return matchCat && matchSearch;
      });

      if (ratedSort === 'rating') {
          items.sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
          items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return items;
  }, [data, ratedCategory, ratedSearch, ratedSort]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Please login to view dashboard.</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Action Bar */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', color: 'text.secondary', borderColor: 'divider' }}
          >
            {window.history.length > 1 ? t('common.back') : t('common.backToHome')}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleCopyLink}
            startIcon={<ShareIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            {t('dashboard.shareProfile')}
          </Button>
      </Box>

      {/* Header Profile Info */}
      <Card elevation={0} sx={{ 
          borderRadius: 4, 
          mb: 4, 
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: 'divider'
      }}>
          <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, sm: 'auto' }}>
                      <Avatar src={data.user.avatar || undefined} sx={{ width: 100, height: 100, border: '4px solid', borderColor: 'primary.main' }}>
                          {!data.user.avatar && data.user.username.charAt(0).toUpperCase()}
                      </Avatar>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                      <Typography variant="h3" sx={{ fontWeight: '900', mb: 0.5 }}>{data.user.username}</Typography>
                      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                          {t('dashboard.welcome', { username: data.user.username })}
                      </Typography>
                      
                      <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                          <Box>
                              <Typography variant="h5" sx={{ fontWeight: '900', color: 'primary.main' }}>{data.rated_count}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{t('dashboard.myRatings')}</Typography>
                          </Box>
                          <Divider orientation="vertical" flexItem />
                          <Box>
                              <Typography variant="h5" sx={{ fontWeight: '900' }}>{data.missing_count}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{t('dashboard.missing')}</Typography>
                          </Box>
                      </Stack>
                  </Grid>
              </Grid>
          </CardContent>
      </Card>

      {/* Tabs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
          <Tab label={t('dashboard.myReviews')} sx={{ fontWeight: '900', textTransform: 'none', fontSize: '1.1rem' }} />
          <Tab label={t('dashboard.exploreNew')} sx={{ fontWeight: '900', textTransform: 'none', fontSize: '1.1rem' }} />
        </Tabs>
      </Box>

      {/* TAB 0: MY REVIEWS */}
      {activeTab === 0 && (
          <Box>
              {/* Filter Controls for Reviews */}
              <Grid container spacing={2} sx={{ mb: 4, alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 4, lg: 5 }}>
                      <TextField 
                        fullWidth size="small" placeholder={t('dashboard.searchRated')} 
                        value={ratedSearch} onChange={e => setRatedSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                        sx={{ 
                            bgcolor: 'background.paper', 
                            borderRadius: 1, 
                            '& .MuiOutlinedInput-root': { borderRadius: 1, height: 44 } 
                        }}
                      />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 'auto' }} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5, px: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
                          {ratedCategories.map(cat => (
                              <Chip 
                                key={cat} label={cat === 'All' ? t('nav.home').replace('Home', 'All') : t(`categories.${data.my_ratings.find(r => r.category_name === cat)?.category_slug}`, { defaultValue: cat })} 
                                onClick={() => setRatedCategory(cat)}
                                color={ratedCategory === cat ? 'primary' : 'default'}
                                variant={ratedCategory === cat ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 'bold', height: 36, px: 0.5, borderRadius: 1, fontSize: '0.85rem' }}
                              />
                          ))}
                      </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 'auto' }}>
                      <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: 44, width: { xs: '100%', md: 'auto' } }}>
                          <Button 
                            fullWidth={isMobile}
                            size="small" variant={ratedSort === 'date' ? 'contained' : 'text'} 
                            onClick={() => setRatedSort('date')}
                            sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 0.8, height: 34, fontSize: '0.85rem' }}
                          >
                              {t('dashboard.date')}
                          </Button>
                          <Button 
                            fullWidth={isMobile}
                            size="small" variant={ratedSort === 'rating' ? 'contained' : 'text'} 
                            onClick={() => setRatedSort('rating')}
                            sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 0.8, height: 34, fontSize: '0.85rem' }}
                          >
                              {t('dashboard.rating')}
                          </Button>
                      </Stack>
                  </Grid>
              </Grid>

              <Stack spacing={3}>
                  {filteredAndSortedRated.length === 0 ? (
                      <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                          <Typography variant="h6" color="text.secondary">{t('dashboard.noRatings')}</Typography>
                          <Button onClick={() => setActiveTab(1)} sx={{ mt: 2 }}>{t('dashboard.exploreFlavors')}</Button>
                      </Box>
                  ) : (
                      filteredAndSortedRated.map(rating => (
                          <Card key={rating.id} elevation={0} sx={{ 
                              borderRadius: 4, 
                              border: '1px solid', 
                              borderColor: 'divider',
                              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                              transition: 'border-color 0.2s',
                              '&:hover': { borderColor: 'primary.main' }
                          }}>
                              <CardContent sx={{ p: 3 }}>
                                  {editingRatingId === rating.id ? (
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('dashboard.editingReview', { flavor: rating.flavor_name })}</Typography>
                                          <Stack direction="row" spacing={2} alignItems="center">
                                              <Typography variant="body2">{t('dashboard.newScore')}</Typography>
                                              <TextField 
                                                type="number" size="small" 
                                                slotProps={{ input: { inputProps: { min: 1, max: 10 } } }}
                                                value={editScore} onChange={(e) => setEditScore(Number(e.target.value))} 
                                                sx={{ width: 80 }}
                                              />
                                          </Stack>
                                          <MentionTextField 
                                            multiline rows={3} value={editComment} 
                                            onChange={setEditComment} 
                                          />
                                          <Stack direction="row" spacing={1}>
                                              <Button variant="contained" size="small" onClick={() => handleUpdateRating(rating.id)}>{t('common.save')}</Button>
                                              <Button variant="outlined" size="small" onClick={() => setEditingRatingId(null)}>{t('common.cancel')}</Button>
                                          </Stack>
                                      </Box>
                                  ) : (
                                      <>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                              <Box sx={{ display: 'flex', gap: 2 }}>
                                                  <Box sx={{ width: 64, height: 64, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
                                                      <Box component="img" src={rating.flavor_image || undefined} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                  </Box>
                                                  <Box>
                                                      <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                                          <Link to={`/flavor/${rating.flavor}`} style={{ color: 'inherit', textDecoration: 'none' }}>{rating.flavor_name}</Link>
                                                      </Typography>
                                                      <Typography variant="caption" color="text.secondary" display="block">
                                                          {t(`categories.${rating.category_slug}`, { defaultValue: rating.category_name })} • {formatDate(rating.created_at)}
                                                      </Typography>
                                                  </Box>
                                              </Box>
                                              <RatingBadge score={rating.score} size="large" />
                                          </Box>

                                          <Box sx={{ mb: 2, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: 2 }}>
                                              {rating.comment ? (
                                                  <RichText text={rating.comment} />
                                              ) : (
                                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>{t('dashboard.noComment')}</Typography>
                                              )}
                                          </Box>

                                          <Stack direction="row" spacing={2} alignItems="center">
                                              <Button 
                                                size="small" 
                                                startIcon={<CommentIcon fontSize="small" />} 
                                                onClick={() => setExpandedReplies(prev => ({ ...prev, [rating.id]: !prev[rating.id] }))}
                                                sx={{ textTransform: 'none', fontWeight: 'bold', color: 'text.secondary' }}
                                              >
                                                  {rating.replies.length} {t('common.replies')}
                                              </Button>
                                              <Box sx={{ flexGrow: 1 }} />
                                              <Button size="small" sx={{ fontWeight: 'bold' }} onClick={() => { setEditingRatingId(rating.id); setEditScore(rating.score); setEditComment(rating.comment || ''); }}>{t('common.edit')}</Button>
                                              <Button size="small" color="error" sx={{ fontWeight: 'bold' }} onClick={() => handleDeleteRating(rating.id)}>{t('common.delete')}</Button>
                                          </Stack>

                                          {/* Replies Inline */}
                                          <Collapse in={expandedReplies[rating.id]}>
                                              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                                  {rating.replies.map((reply: any) => (
                                                      <Box key={reply.id} sx={{ mb: 2, pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                  {reply.user}
                                                                  {reply.user === data.user.username && <VerifiedIcon sx={{ fontSize: '0.8rem', color: 'primary.main', ml: 0.5 }} />}
                                                              </Typography>
                                                              <Stack direction="row" spacing={1} alignItems="center">
                                                                  <Typography variant="caption" color="text.secondary">{formatDate(reply.created_at)}</Typography>
                                                                  {reply.user === data.user.username && (
                                                                      <Button size="small" color="error" sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }} onClick={() => handleDeleteReply(reply.id)}>{t('common.delete')}</Button>
                                                                  )}
                                                              </Stack>
                                                          </Box>
                                                          <Typography variant="body2"><RichText text={reply.text} /></Typography>
                                                      </Box>
                                                  ))}
                                                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                                      <MentionTextField 
                                                        placeholder={t('community.writeReply')} 
                                                        value={replyInputs[rating.id] || ''} 
                                                        onChange={val => setReplyInputs({ ...replyInputs, [rating.id]: val })} 
                                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReplySubmit(rating.id)}
                                                      />
                                                      <Button variant="contained" size="small" onClick={() => handleReplySubmit(rating.id)} disabled={!replyInputs[rating.id]} sx={{ height: 40, px: 3 }}>{t('common.reply')}</Button>
                                                  </Stack>
                                              </Box>
                                          </Collapse>
                                      </>
                                  )}
                              </CardContent>
                          </Card>
                      ))
                  )}
              </Stack>
          </Box>
      )}

      {/* TAB 1: EXPLORE NEW */}
      {activeTab === 1 && (
          <Box>
              {/* Filter Controls for Explore */}
              <Grid container spacing={2} sx={{ mb: 4, alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 4, lg: 5 }}>
                      <TextField 
                        fullWidth size="small" placeholder={t('dashboard.searchMissing')} 
                        value={exploreSearch} onChange={e => setExploreSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                        sx={{ 
                            bgcolor: 'background.paper', 
                            borderRadius: 1, 
                            '& .MuiOutlinedInput-root': { borderRadius: 1, height: 44 } 
                        }}
                      />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 'auto' }} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5, px: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
                          {exploreCategories.map(cat => (
                              <Chip 
                                key={cat} label={cat === 'All' ? t('nav.home').replace('Home', 'All') : t(`categories.${data.missing_flavors.find(f => f.category_name === cat)?.category_slug}`, { defaultValue: cat })} 
                                onClick={() => setExploreCategory(cat)}
                                color={exploreCategory === cat ? 'primary' : 'default'}
                                variant={exploreCategory === cat ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 'bold', height: 36, px: 0.5, borderRadius: 1, fontSize: '0.85rem' }}
                              />
                          ))}
                      </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 'auto' }}>
                      <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: 44, width: { xs: '100%', md: 'auto' } }}>
                          <Button 
                            fullWidth={isMobile}
                            size="small" variant={exploreSort === 'community' ? 'contained' : 'text'} 
                            onClick={() => setExploreSort('community')}
                            sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 0.8, height: 34, px: 2, fontSize: '0.85rem' }}
                          >
                              {t('dashboard.communityRating')}
                          </Button>
                          <Button 
                            fullWidth={isMobile}
                            size="small" variant={exploreSort === 'circle' ? 'contained' : 'text'} 
                            onClick={() => setExploreSort('circle')}
                            sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 0.8, height: 34, px: 2, fontSize: '0.85rem' }}
                          >
                              {t('dashboard.circleRating')}
                          </Button>
                      </Stack>
                  </Grid>
              </Grid>

              {filteredMissing.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: '900' }}>{t('dashboard.allRated')}</Typography>
                  </Box>
              ) : (
                  <Grid container spacing={2}>
                      {filteredMissing.map(flavor => (
                          <Grid key={flavor.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                              <Card elevation={0} sx={{ 
                                  height: '100%', borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                                  transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main', boxShadow: 4 },
                                  overflow: 'hidden'
                              }}>
                                  <Link to={`/flavor/${flavor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                      <Box sx={{ 
                                          position: 'relative', 
                                          aspectRatio: '1/1', 
                                          bgcolor: 'background.default', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center',
                                          borderBottom: '1px solid',
                                          borderColor: 'divider',
                                          overflow: 'hidden'
                                      }}>
                                          <Box 
                                            component="img" 
                                            src={flavor.image_url || undefined} 
                                            sx={{ 
                                                width: '100%', 
                                                height: '100%', 
                                                objectFit: 'cover',
                                                transition: 'transform 0.5s ease',
                                                '&:hover': { transform: 'scale(1.1)' }
                                            }} 
                                          />
                                          <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
                                              <RatingBadge score={flavor.average_rating || 0} size="small" />
                                          </Box>
                                          {flavor.followed_average_rating && (
                                              <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                                                  <Tooltip title={t('dashboard.circleAvg')}>
                                                      <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.9), color: 'white', px: 1, py: 0.2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, boxShadow: 2 }}>
                                                          <VerifiedIcon sx={{ fontSize: '0.8rem' }} />
                                                          <Typography variant="caption" sx={{ fontWeight: '900' }}>{flavor.followed_average_rating.toFixed(1)}</Typography>
                                                      </Box>
                                                  </Tooltip>
                                              </Box>
                                          )}
                                      </Box>
                                      <CardContent sx={{ p: 2 }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                              {flavor.name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">{t(`categories.${flavor.category_slug}`, { defaultValue: flavor.category_name })}</Typography>
                                      </CardContent>
                                  </Link>
                              </Card>
                          </Grid>
                      ))}
                  </Grid>
              )}
          </Box>
      )}
    </Container>
  );
};

export default Dashboard;
