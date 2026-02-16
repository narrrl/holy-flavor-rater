import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Rating as MuiRating, 
  Avatar,
  Chip,
  Container,
  CircularProgress
} from '@mui/material';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface Rating {
    id: number;
    flavor_name: string;
    flavor_image: string | null;
    score: number;
    comment: string;
    created_at: string;
}

interface ProfileData {
    username: string;
    theme: string;
    avatar: string | null;
    ratings: Rating[];
}

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`users/profile/${username}/`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  useTitle(data ? `${data.username}'s Ratings` : 'Profile');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Profile not found.</Typography>;

  const favorites = data.ratings.filter(r => r.score >= 8);
  const others = data.ratings.filter(r => r.score < 8);

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 6, gap: 3 }}>
        <Avatar src={data.avatar || undefined} sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: 'primary.main' }}>
            {!data.avatar && data.username.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{data.username}</Typography>
            <Typography variant="h6" color="text.secondary">
                Shared {data.ratings.length} flavor ratings
            </Typography>
        </Box>
      </Box>

      {favorites.length > 0 && (
          <Box sx={{ mb: 6 }}>
              <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  Top Favorites <Chip label="8-10 Score" color="secondary" />
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {favorites.map(rating => (
                      <Card key={rating.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%', xl: '1 1 18%' }, minWidth: 280 }}>
                          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {rating.flavor_image && (
                                  <Box 
                                    sx={{ 
                                        width: 80, 
                                        height: 80, 
                                        minWidth: 80,
                                        aspectRatio: '1/1', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        bgcolor: 'background.default',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        overflow: 'hidden'
                                    }}
                                  >
                                    <Box 
                                        component="img" 
                                        src={rating.flavor_image} 
                                        sx={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover'
                                        }} 
                                    />
                                  </Box>
                              )}
                              <Box>
                                  <Typography variant="h6">{rating.flavor_name}</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                      <MuiRating value={rating.score} readOnly max={10} size="small" />
                                      <Typography sx={{ ml: 1, fontWeight: 'bold' }}>{rating.score}/10</Typography>
                                  </Box>
                                  {rating.comment && (
                                      <Typography variant="body2" color="text.secondary">"{rating.comment}"</Typography>
                                  )}
                              </Box>
                          </CardContent>
                      </Card>
                  ))}
              </Box>
          </Box>
      )}

      {others.length > 0 && (
          <Box>
              <Typography variant="h4" gutterBottom>Other Ratings</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {others.map(rating => (
                      <Card key={rating.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 23%', lg: '1 1 18%' }, minWidth: 200 }} variant="outlined">
                          <CardContent>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{rating.flavor_name}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                                  <MuiRating value={rating.score} readOnly max={10} size="small" />
                                  <Typography variant="body2" sx={{ ml: 1 }}>{rating.score}/10</Typography>
                              </Box>
                              {rating.comment && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      "{rating.comment}"
                                  </Typography>
                              )}
                          </CardContent>
                      </Card>
                  ))}
              </Box>
          </Box>
      )}
    </Container>
  );
};

export default PublicProfile;
