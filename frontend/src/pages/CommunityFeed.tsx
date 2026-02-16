import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Avatar, 
  Container, 
  CircularProgress, 
  Divider,
  Rating as MuiRating,
  Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface FeedRating {
    id: number;
    user: string;
    user_id: number;
    user_avatar: string | null;
    flavor: number;
    flavor_name: string;
    flavor_image: string | null;
    category_name: string;
    category_slug: string;
    score: number;
    comment: string;
    created_at: string;
}

const CommunityFeed: React.FC = () => {
  useTitle('Community Feed');
  const [ratings, setRatings] = useState<FeedRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await api.get('ratings/feed/');
        // Handle pagination if results is present
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setRatings(data);
      } catch (err) {
        console.error('Failed to fetch feed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Community Feed</Typography>
      
      {ratings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom>Your feed is quiet...</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Follow other Holy Energy fans to see their latest flavor ratings and reviews here!
            </Typography>
            <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                Find flavors and reviewers
            </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {ratings.map(rating => (
            <Card key={rating.id} sx={{ borderRadius: 3, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                    <Avatar src={rating.user_avatar || undefined} sx={{ width: 40, height: 40, mr: 2 }}>
                      {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                            {rating.user}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {new Date(rating.created_at).toLocaleDateString()}
                        </Typography>
                    </Box>
                  </Link>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none' }}>
                        <Box sx={{ width: { xs: '100%', sm: 120 }, aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                            <Box 
                                component="img" 
                                src={rating.flavor_image || undefined} 
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                        </Box>
                    </Link>
                    <Box sx={{ flex: 1 }}>
                        <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5, '&:hover': { color: 'primary.main' } }}>
                                {rating.flavor_name}
                            </Typography>
                        </Link>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            {rating.category_name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                            <MuiRating value={rating.score} readOnly max={10} size="small" />
                            <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>{rating.score}/10</Typography>
                        </Box>

                        {rating.comment && (
                            <Typography variant="body2" sx={{ 
                                fontStyle: 'italic', 
                                color: 'text.secondary',
                                borderLeft: '3px solid',
                                borderColor: 'divider',
                                pl: 2,
                                py: 0.5
                            }}>
                                "{rating.comment}"
                            </Typography>
                        )}
                    </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

// Internal helper for empty state
const Paper = ({ children, sx }: any) => (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', ...sx }}>
        {children}
    </Box>
);

export default CommunityFeed;
