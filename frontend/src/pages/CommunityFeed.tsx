import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  CardContent,
  Avatar,
  Divider,
  Button,
  Grid,
  List,
  ListItemText,
  ListItemButton,
  Pagination,
  IconButton,
  Collapse,
  Link as MuiLink,
  Tabs,
  Tab,
  Skeleton,
  Chip,
  Stack,
} from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ExploreIcon from '@mui/icons-material/Explore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BoltIcon from '@mui/icons-material/Bolt';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Link, useNavigate } from 'react-router-dom';
import {
  useCommunityFeed,
  useFollowedTopFlavors,
  useDiscoverFeed,
  useSuggestedUsers,
  useActivityFeed,
  type FeedRating,
  type DiscoverSort,
  type ActivityItem,
} from '../api/queries/useCommunityFeed';
import { useCategories } from '../api/queries/useCategories';
import { useFollowToggle } from '../api/mutations/useSocialMutations';
import { useCreateReply } from '../api/mutations/useRatingMutations';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../hooks/useAuth';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';
import { useTranslation } from 'react-i18next';
import MentionTextField from '../components/MentionTextField';
import RatingBadge from '../components/RatingBadge';
import ReactionBar from '../components/ReactionBar';
import {
  PageShell,
  HeroBackdrop,
  SectionHeader,
  GlassCard,
  FlavorThumb,
  EmptyState,
  BackButton,
} from '../components/ui';
import { useToast } from '../hooks/useToast';

type FeedTab = 'following' | 'discover' | 'activity';

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
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    </Box>
    {children}
  </GlassCard>
);

/** Who-to-follow sidebar card. Optimistically drops a user from the list once
 *  the caller follows them; reverts + toasts on failure. */
const SuggestedFollows: React.FC = () => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { data: suggestions = [] } = useSuggestedUsers();
  const followToggle = useFollowToggle();
  const [followed, setFollowed] = useState<Set<number>>(new Set());

  const visible = suggestions.filter((u) => !followed.has(u.id));
  if (visible.length === 0) return null;

  const handleFollow = async (userId: number) => {
    setFollowed((prev) => new Set(prev).add(userId));
    try {
      await followToggle.mutateAsync({ userId, currentlyFollowing: false });
    } catch {
      setFollowed((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      notify({ message: t('community.followFailed'), severity: 'error' });
    }
  };

  return (
    <SidebarCard
      icon={<PersonAddIcon color="primary" fontSize="small" />}
      title={t('community.whoToFollow')}
    >
      <List disablePadding>
        {visible.map((u) => (
          <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25 }}>
            <Link to={`/profile/${u.username}`} style={{ textDecoration: 'none' }}>
              <Avatar src={u.avatar || undefined} sx={{ width: 36, height: 36 }}>
                {!u.avatar && u.username.charAt(0).toUpperCase()}
              </Avatar>
            </Link>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <MuiLink
                component={Link}
                to={`/profile/${u.username}`}
                sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
              >
                <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                  {u.username}
                </Typography>
              </MuiLink>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {t('community.followerCount', { count: u.followers_count })}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleFollow(u.id)}
              sx={{ textTransform: 'none', borderRadius: 2, flexShrink: 0, fontWeight: 700 }}
            >
              {t('community.follow')}
            </Button>
          </Box>
        ))}
      </List>
    </SidebarCard>
  );
};

const FeedSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    {[0, 1, 2].map((i) => (
      <GlassCard key={i} intensity="default">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Box>
                <Skeleton variant="text" width={120} height={24} />
                <Skeleton variant="text" width={80} height={16} />
              </Box>
            </Box>
            <Skeleton variant="rounded" width={48} height={28} />
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
            </Box>
            <Skeleton variant="rounded" width={70} height={70} />
          </Box>
        </CardContent>
      </GlassCard>
    ))}
  </Box>
);

const CommunityFeed: React.FC = () => {
  const { t } = useTranslation();
  useTitle(t('community.title'));
  const navigate = useNavigate();
  const { notify } = useToast();
  const [tab, setTab] = useState<FeedTab>('following');
  const [page, setPage] = useState(1);
  const [discoverSort, setDiscoverSort] = useState<DiscoverSort>('recent');
  const [discoverCategory, setDiscoverCategory] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  const { user } = useAuth();
  const isAuthed = !!user;
  const { data: feed, isLoading: feedLoading, error: feedError } = useCommunityFeed(page);
  const {
    data: discover,
    isLoading: discoverLoading,
    error: discoverError,
  } = useDiscoverFeed({
    page,
    sort: discoverSort,
    category: discoverCategory,
    enabled: tab === 'discover',
  });
  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
  } = useActivityFeed(page, tab === 'activity');
  const { data: categories = [] } = useCategories();
  const { data: topFollowed = [] } = useFollowedTopFlavors();
  const createReply = useCreateReply();

  const followingRatings: FeedRating[] = feed?.ratings ?? [];
  const discoverRatings: FeedRating[] = discover?.ratings ?? [];
  const activityItems: ActivityItem[] = activity?.items ?? [];
  const ratings = tab === 'discover' ? discoverRatings : followingRatings;
  const totalPages =
    (tab === 'following'
      ? feed?.totalPages
      : tab === 'discover'
        ? discover?.totalPages
        : activity?.totalPages) ?? 1;
  const loading =
    tab === 'following' ? feedLoading : tab === 'discover' ? discoverLoading : activityLoading;

  const handleTabChange = (next: FeedTab) => {
    setTab(next);
    setPage(1);
  };

  const handleSortChange = (next: DiscoverSort) => {
    setDiscoverSort(next);
    setPage(1);
  };

  const handleCategoryChange = (slug: string | null) => {
    setDiscoverCategory(slug);
    setPage(1);
  };

  useEffect(() => {
    if (!isAuthed) navigate('/login');
  }, [isAuthed, navigate]);

  useEffect(() => {
    const err =
      tab === 'following' ? feedError : tab === 'discover' ? discoverError : activityError;
    const status = (err as { response?: { status?: number } } | null)?.response?.status;
    if (status === 401) navigate('/login');
  }, [feedError, discoverError, activityError, tab, navigate]);

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

  const renderCard = (rating: FeedRating) => {
    const expanded = !!expandedReplies[rating.id];
    const latestReply = rating.replies[rating.replies.length - 1];
    return (
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {rating.user}
                  </Typography>
                </Link>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
              sx={{ mb: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
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
                    fontWeight: 700,
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
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {t('common.noComment')}
                </Typography>
              )}
            </Box>
            <Link to={`/flavor/${rating.flavor}`} style={{ flexShrink: 0 }}>
              <FlavorThumb
                src={rating.flavor_image}
                name={rating.flavor_name}
                size={70}
                radius={1}
              />
            </Link>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <ReactionBar
              ratingId={rating.id}
              reactions={rating.reactions}
              myReactions={rating.my_reactions}
            />
            <Button
              size="small"
              startIcon={<CommentIcon fontSize="small" />}
              onClick={() => handleReplyToggle(rating.id)}
              sx={{ textTransform: 'none', color: 'text.secondary', flexShrink: 0 }}
            >
              {rating.replies.length > 0
                ? `${rating.replies.length} ${t('common.replies')}`
                : t('common.reply')}
            </Button>
          </Box>

          {!expanded && latestReply && (
            <Box
              onClick={() => handleReplyToggle(rating.id)}
              sx={{
                mt: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                bgcolor: 'action.hover',
                cursor: 'pointer',
                display: 'flex',
                gap: 1,
                alignItems: 'baseline',
                minWidth: 0,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}
              >
                {latestReply.user}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                <RichText text={latestReply.text} />
              </Typography>
            </Box>
          )}

          <Collapse in={expanded}>
            <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
              {rating.replies.map((reply) => (
                <Box key={reply.id} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
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
                  multiline
                  rows={2}
                  value={replyInputs[rating.id] || ''}
                  onChange={(val) => setReplyInputs((prev) => ({ ...prev, [rating.id]: val }))}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
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
    );
  };

  const renderActivityCard = (item: ActivityItem) => {
    const isMilestone = item.kind === 'milestone';
    return (
      <GlassCard key={item.id} intensity="default">
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                flexShrink: 0,
                color: isMilestone ? 'warning.main' : 'success.main',
                bgcolor: isMilestone ? 'warning.main' : 'success.main',
                opacity: 0.9,
              }}
            >
              {isMilestone ? (
                <EmojiEventsIcon sx={{ color: 'common.white' }} />
              ) : (
                <NewReleasesIcon sx={{ color: 'common.white' }} />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {isMilestone ? t('community.milestoneLabel') : t('community.newDropLabel')}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {isMilestone
                  ? t('community.milestoneText', {
                      flavor: item.flavor_name,
                      count: item.milestone,
                    })
                  : item.flavor_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(item.created_at)}
              </Typography>
            </Box>
            <Link to={`/flavor/${item.flavor_id}`} style={{ flexShrink: 0 }}>
              <FlavorThumb src={item.flavor_image} name={item.flavor_name} size={56} radius={1} />
            </Link>
          </Box>
        </CardContent>
      </GlassCard>
    );
  };

  const subtitle =
    tab === 'discover'
      ? t('community.discoverSubtitle')
      : tab === 'activity'
        ? t('community.activitySubtitle')
        : t('community.subtitle');

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <BackButton />

      <SectionHeader title={t('community.title')} subtitle={subtitle} />

      <Tabs
        value={tab}
        onChange={(_, v: FeedTab) => handleTabChange(v)}
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 } }}
      >
        <Tab
          value="following"
          icon={<PeopleAltIcon fontSize="small" />}
          iconPosition="start"
          label={t('community.tabFollowing')}
        />
        <Tab
          value="discover"
          icon={<ExploreIcon fontSize="small" />}
          iconPosition="start"
          label={t('community.tabDiscover')}
        />
        <Tab
          value="activity"
          icon={<BoltIcon fontSize="small" />}
          iconPosition="start"
          label={t('community.tabActivity')}
        />
      </Tabs>

      {tab === 'discover' && (
        <Box
          sx={{
            position: 'sticky',
            top: 8,
            zIndex: 2,
            mb: 3,
            py: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={1}>
            <Chip
              label={t('community.sortRecent')}
              color={discoverSort === 'recent' ? 'primary' : 'default'}
              variant={discoverSort === 'recent' ? 'filled' : 'outlined'}
              onClick={() => handleSortChange('recent')}
            />
            <Chip
              label={t('community.sortTop')}
              color={discoverSort === 'top' ? 'primary' : 'default'}
              variant={discoverSort === 'top' ? 'filled' : 'outlined'}
              onClick={() => handleSortChange('top')}
            />
          </Stack>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label={t('community.allCategories')}
              color={discoverCategory === null ? 'secondary' : 'default'}
              variant={discoverCategory === null ? 'filled' : 'outlined'}
              onClick={() => handleCategoryChange(null)}
            />
            {categories.map((cat) => (
              <Chip
                key={cat.slug}
                label={t(`categories.${cat.slug}`, { defaultValue: cat.name })}
                color={discoverCategory === cat.slug ? 'secondary' : 'default'}
                variant={discoverCategory === cat.slug ? 'filled' : 'outlined'}
                onClick={() => handleCategoryChange(cat.slug)}
              />
            ))}
          </Box>
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {tab === 'activity' ? (
            loading && activityItems.length === 0 ? (
              <FeedSkeleton />
            ) : activityItems.length === 0 ? (
              <EmptyState
                title={t('community.activityEmpty')}
                subtitle={t('community.activityEmptyHint')}
                action={
                  <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                    {t('home.exploreFlavors')}
                  </Button>
                }
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {activityItems.map(renderActivityCard)}
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
            )
          ) : loading && ratings.length === 0 ? (
            <FeedSkeleton />
          ) : ratings.length === 0 ? (
            tab === 'following' ? (
              <EmptyState
                title={t('community.quietFeed')}
                subtitle={t('community.followMore')}
                action={
                  <Button
                    variant="contained"
                    startIcon={<ExploreIcon />}
                    onClick={() => handleTabChange('discover')}
                    sx={{ borderRadius: 2 }}
                  >
                    {t('community.browseDiscover')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title={t('community.discoverEmpty')}
                subtitle={t('community.discoverEmptyHint')}
                action={
                  <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                    {t('home.exploreFlavors')}
                  </Button>
                }
              />
            )
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {ratings.map(renderCard)}
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
            <SuggestedFollows />
            <SidebarCard
              icon={<WhatshotIcon color="error" fontSize="small" />}
              title={t('community.topRated')}
            >
              <List disablePadding>
                {topFollowed.map((flavor, idx) => (
                  <ListItemButton key={flavor.id} component={Link} to={`/flavor/${flavor.id}`}>
                    <Box sx={{ mr: 2, fontWeight: 700, color: 'text.secondary', width: 15 }}>
                      {idx + 1}
                    </Box>
                    <FlavorThumb
                      src={flavor.image_url}
                      name={flavor.name}
                      size={32}
                      radius={0.5}
                      sx={{ mr: 2 }}
                    />
                    <ListItemText
                      primary={flavor.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 700,
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
