import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  CardContent,
  Avatar,
  CircularProgress,
  Divider,
  Button,
  Grid,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Pagination,
  TextField,
  IconButton,
  Collapse,
  Link as MuiLink,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import { Link, useNavigate } from 'react-router-dom';
import {
  useCommunityFeed,
  useFollowedTopFlavors,
  useFollowingList,
  type FeedRating,
} from '../api/queries/useCommunityFeed';
import { useNotificationsQuery } from '../api/queries/useNotifications';
import { useCreateReply } from '../api/mutations/useRatingMutations';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../hooks/useAuth';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';
import { useTranslation } from 'react-i18next';
import MentionTextField from '../components/MentionTextField';
import RatingBadge from '../components/RatingBadge';
import {
  PageShell,
  HeroBackdrop,
  SectionHeader,
  GlassCard,
  EmptyState,
  BackButton,
} from '../components/ui';
import { useToast } from '../hooks/useToast';

const SidebarCard: React.FC<{
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <GlassCard intensity="subtle">
    <Box
      sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {icon}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
    </Box>
    {children}
  </GlassCard>
);

const CommunityFeed: React.FC = () => {
  const { t } = useTranslation();
  useTitle(t('community.title'));
  const navigate = useNavigate();
  const { notify } = useToast();
  const [page, setPage] = useState(1);
  const [followingSearch, setFollowingSearch] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  const { user } = useAuth();
  const isAuthed = !!user;
  const { data: feed, isLoading: feedLoading, error: feedError } = useCommunityFeed(page);
  const { data: following = [] } = useFollowingList();
  const { data: notificationsAll = [] } = useNotificationsQuery(isAuthed);
  const { data: topFollowed = [] } = useFollowedTopFlavors();
  const createReply = useCreateReply();

  const ratings: FeedRating[] = feed?.ratings ?? [];
  const totalPages = feed?.totalPages ?? 1;
  const notifications = notificationsAll.slice(0, 5);
  const loading = feedLoading;

  const filteredFollowing = following.filter((user) =>
    user.username.toLowerCase().includes(followingSearch.toLowerCase()),
  );

  useEffect(() => {
    if (!isAuthed) navigate('/login');
  }, [isAuthed, navigate]);

  useEffect(() => {
    const status = (feedError as { response?: { status?: number } } | null)?.response?.status;
    if (status === 401) navigate('/login');
  }, [feedError, navigate]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReplyToggle = (ratingId: number) => {
    setExpandedReplies((prev) => ({ ...prev, [ratingId]: !prev[ratingId] }));
  };

  const handleReplySubmit = async (ratingId: number) => {
    const text = replyInputs[ratingId];
    if (!text) return;
    try {
      await createReply.mutateAsync({ ratingId, text });
      setReplyInputs((prev) => ({ ...prev, [ratingId]: '' }));
    } catch {
      notify({ message: t('common.replyFailed'), severity: 'error' });
    }
  };

  if (loading && ratings.length === 0)
    return (
      <PageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <BackButton />

      <SectionHeader title={t('community.title')} subtitle={t('community.subtitle')} />

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {ratings.length === 0 ? (
            <EmptyState
              title={t('community.quietFeed')}
              subtitle={t('community.followMore')}
              action={
                <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                  {t('home.exploreFlavors')}
                </Button>
              }
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {ratings.map((rating) => (
                <GlassCard key={rating.id} intensity="default">
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none' }}>
                          <Avatar
                            src={rating.user_avatar || undefined}
                            sx={{
                              width: 48,
                              height: 48,
                              border: '2px solid',
                              borderColor: 'divider',
                            }}
                          >
                            {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                          </Avatar>
                        </Link>
                        <Box>
                          <Link
                            to={`/profile/${rating.user}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
                            >
                              {rating.user}
                            </Typography>
                          </Link>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            {formatDate(rating.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                      <RatingBadge score={rating.score} />
                    </Box>

                    {user?.is_superuser && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={() => navigate(`/admin-panel/rating/${rating.id}`)}
                        sx={{ mb: 2, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                      >
                        {t('admin.manageRating')}
                      </Button>
                    )}

                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {t('community.rated')}{' '}
                          <MuiLink
                            component={Link}
                            to={`/flavor/${rating.flavor}`}
                            sx={{
                              color: 'primary.main',
                              fontWeight: 'bold',
                              textDecoration: 'none',
                            }}
                          >
                            {rating.flavor_name}
                          </MuiLink>
                        </Typography>
                        {rating.comment ? (
                          <Typography
                            variant="body1"
                            sx={{ lineHeight: 1.6, fontStyle: 'italic', color: 'text.primary' }}
                          >
                            <RichText text={rating.comment} />
                          </Typography>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: 'italic' }}
                          >
                            {t('common.noComment')}
                          </Typography>
                        )}
                      </Box>
                      <Link to={`/flavor/${rating.flavor}`} style={{ flexShrink: 0 }}>
                        <Box
                          sx={{
                            width: 70,
                            height: 70,
                            borderRadius: 1,
                            overflow: 'hidden',
                            bgcolor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            component="img"
                            src={rating.flavor_image || undefined}
                            alt={rating.flavor_name}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                      </Link>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Button
                      size="small"
                      startIcon={<CommentIcon fontSize="small" />}
                      onClick={() => handleReplyToggle(rating.id)}
                      sx={{ textTransform: 'none', color: 'text.secondary' }}
                    >
                      {rating.replies.length > 0
                        ? `${rating.replies.length} ${t('common.replies')}`
                        : t('common.reply')}
                    </Button>

                    <Collapse in={expandedReplies[rating.id]}>
                      <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                        {rating.replies.map((reply) => (
                          <Box key={reply.id} sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}
                              >
                                {reply.user}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(reply.created_at)}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography variant="body2">
                                <RichText text={reply.text} />
                              </Typography>
                              {user?.is_superuser && (
                                <Button
                                  size="small"
                                  sx={{ minWidth: 0, py: 0, fontSize: '0.7rem' }}
                                  onClick={() => navigate(`/admin-panel/reply/${reply.id}`)}
                                >
                                  {t('admin.manageReply')}
                                </Button>
                              )}
                            </Box>
                          </Box>
                        ))}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <MentionTextField
                            placeholder={t('community.writeReply')}
                            value={replyInputs[rating.id] || ''}
                            onChange={(val) =>
                              setReplyInputs((prev) => ({ ...prev, [rating.id]: val }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                handleReplySubmit(rating.id);
                              }
                            }}
                          />
                          <IconButton
                            color="primary"
                            onClick={() => handleReplySubmit(rating.id)}
                            disabled={!replyInputs[rating.id]}
                          >
                            <SendIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </GlassCard>
              ))}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SidebarCard
              icon={<NotificationsIcon color="primary" fontSize="small" />}
              title={t('community.notifications')}
            >
              <List disablePadding>
                {notifications.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('community.noNotifications')}
                    </Typography>
                  </Box>
                ) : (
                  notifications.map((n) => {
                    const handleClick = () => {
                      if (n.notification_type === 'follow') {
                        navigate(`/profile/${n.actor_username}`);
                      } else if (n.flavor_id) {
                        navigate(`/flavor/${n.flavor_id}`);
                      }
                    };
                    return (
                      <ListItemButton key={n.id} onClick={handleClick} sx={{ py: 1.5 }}>
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar
                            src={n.actor_avatar || undefined}
                            sx={{ width: 30, height: 30, fontSize: '0.8rem' }}
                          >
                            {n.actor_username.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              <strong>{n.actor_username}</strong>{' '}
                              {n.notification_type === 'reply'
                                ? t('community.notifReply')
                                : n.notification_type === 'mention'
                                  ? t('community.notifMention')
                                  : n.notification_type === 'follow'
                                    ? t('community.notifFollow')
                                    : n.notification_type}
                            </Typography>
                          }
                          secondary={formatDate(n.created_at)}
                          secondaryTypographyProps={{ sx: { fontSize: '0.7rem' } }}
                        />
                      </ListItemButton>
                    );
                  })
                )}
              </List>
            </SidebarCard>

            <SidebarCard
              icon={<PeopleIcon color="primary" fontSize="small" />}
              title={t('nav.following')}
            >
              <Box sx={{ p: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('community.searchFriends')}
                  value={followingSearch}
                  onChange={(e) => setFollowingSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      ),
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
              </Box>
              <List disablePadding sx={{ maxHeight: 250, overflowY: 'auto' }}>
                {filteredFollowing.map((user) => (
                  <ListItemButton key={user.id} component={Link} to={`/profile/${user.username}`}>
                    <Avatar
                      src={user.avatar || undefined}
                      sx={{ width: 28, height: 28, mr: 2, fontSize: '0.8rem' }}
                    >
                      {user.username.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={user.username}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </SidebarCard>

            <SidebarCard
              icon={<WhatshotIcon color="error" fontSize="small" />}
              title={t('community.topRated')}
            >
              <List disablePadding>
                {topFollowed.map((flavor, idx) => (
                  <ListItemButton key={flavor.id} component={Link} to={`/flavor/${flavor.id}`}>
                    <Box sx={{ mr: 2, fontWeight: 'bold', color: 'text.secondary', width: 15 }}>
                      {idx + 1}
                    </Box>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        mr: 2,
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 0.5,
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        component="img"
                        src={flavor.image_url || undefined}
                        alt={flavor.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <ListItemText
                      primary={flavor.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 'bold',
                        noWrap: true,
                      }}
                    />
                    <RatingBadge score={flavor.average_rating || 0} size="small" />
                  </ListItemButton>
                ))}
              </List>
            </SidebarCard>
          </Box>
        </Grid>
      </Grid>
    </PageShell>
  );
};

export default CommunityFeed;
