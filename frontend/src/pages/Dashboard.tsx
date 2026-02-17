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
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  useTitle(t('nav.dashboard'));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Filtering states
  const [exploreCategory, setExploreCategory] = useState<string>('All');
  const [exploreSearch, setExploreSearch] = useState('');

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

  // Performance Optimization: Memoize grouped missing flavors
  const categories = useMemo(() => {
      if (!data) return ['All'];
      const cats = new Set(data.missing_flavors.map(f => f.category_name));
      return ['All', ...Array.from(cats).sort()];
  }, [data]);

  const filteredMissing = useMemo(() => {
      if (!data) return [];
      return data.missing_flavors.filter(f => {
          const matchCat = exploreCategory === 'All' || f.category_name === exploreCategory;
          const matchSearch = f.name.toLowerCase().includes(exploreSearch.toLowerCase());
          return matchCat && matchSearch;
      });
  }, [data, exploreCategory, exploreSearch]);

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
          <Stack spacing={3}>
              {data.my_ratings.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="h6" color="text.secondary">{t('dashboard.noRatings')}</Typography>
                      <Button onClick={() => setActiveTab(1)} sx={{ mt: 2 }}>{t('dashboard.exploreFlavors')}</Button>
                  </Box>
              ) : (
                  data.my_ratings.map(rating => (
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
                                              <Avatar src={rating.flavor_image || undefined} variant="rounded" sx={{ width: 60, height: 60, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', p: 0.5 }}>
                                                  F
                                              </Avatar>
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
                                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>{t('dashboard.noRatings')}</Typography>
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
      )}

      {/* TAB 1: EXPLORE NEW */}
      {activeTab === 1 && (
          <Box>
              {/* Filter Controls */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  <Box sx={{ flexGrow: 1 }}>
                      <TextField 
                        fullWidth placeholder={t('dashboard.searchMissing')} 
                        value={exploreSearch} onChange={e => setExploreSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                      />
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                      {categories.map(cat => (
                          <Chip 
                            key={cat} label={cat === 'All' ? t('nav.home').replace('Home', 'All') : t(`categories.${data.missing_flavors.find(f => f.category_name === cat)?.category_slug}`, { defaultValue: cat })} 
                            onClick={() => setExploreCategory(cat)}
                            color={exploreCategory === cat ? 'primary' : 'default'}
                            variant={exploreCategory === cat ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 'bold', height: 40, px: 1 }}
                          />
                      ))}
                  </Stack>
              </Stack>

              {filteredMissing.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: '900' }}>{t('dashboard.allRated')}</Typography>
                  </Box>
              ) : (
                  <Grid container spacing={2}>
                      {filteredMissing.map(flavor => (
                          <Grid key={flavor.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card elevation={0} sx={{ 
                                  height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider',
                                  transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main', boxShadow: 4 }
                              }}>
                                  <Link to={`/flavor/${flavor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                      <Box sx={{ position: 'relative', aspectRatio: '16/10', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                                          <Box component="img" src={flavor.image_url || undefined} sx={{ height: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }} />
                                          <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
                                              <RatingBadge score={flavor.average_rating || 0} size="small" />
                                          </Box>
                                          {flavor.followed_average_rating && (
                                              <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                                                  <Tooltip title={t('dashboard.circleAvg')}>
                                                      <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.9), color: 'white', px: 1, py: 0.2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
