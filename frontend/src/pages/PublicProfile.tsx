import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Avatar,
  Chip,
  Container,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface Rating {
    id: number;
    flavor: number;
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

  const RatingGrid = ({ ratings, title, chip }: { ratings: Rating[], title: string, chip?: React.ReactNode }) => (
    <Box sx={{ mb: 8 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 'bold' }}>
            {title} {chip}
        </Typography>
        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(6, 1fr)',
                xl: 'repeat(8, 1fr)'
            }, 
            gap: 2 
        }}>
            {ratings.map(rating => (
                <Tooltip key={rating.id} title={rating.comment ? `"${rating.comment}"` : rating.flavor_name} arrow>
                    <Card sx={{ 
                        transition: 'all 0.3s ease',
                        '&:hover': { transform: 'scale(1.05)', boxShadow: 6, zIndex: 1 }
                    }}>
                        <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Box sx={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
                                <Box 
                                    component="img" 
                                    src={rating.flavor_image || undefined} 
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                                <Box sx={{ 
                                    position: 'absolute', 
                                    bottom: 0, 
                                    left: 0, 
                                    right: 0, 
                                    bgcolor: 'rgba(0,0,0,0.7)', 
                                    color: 'white', 
                                    p: 0.5, 
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{rating.score}/10</Typography>
                                </Box>
                            </Box>
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="caption" sx={{ 
                                    fontWeight: 'bold', 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    fontSize: '0.75rem'
                                }}>
                                    {rating.flavor_name}
                                </Typography>
                            </CardContent>
                        </Link>
                    </Card>
                </Tooltip>
            ))}
        </Box>
    </Box>
  );

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 8, gap: 3 }}>
        <Avatar src={data.avatar || undefined} sx={{ width: 100, height: 100, border: '4px solid', borderColor: 'primary.main', fontSize: '2.5rem' }}>
            {!data.avatar && data.username.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
            <Typography variant="h2" sx={{ fontWeight: 'bold' }}>{data.username}</Typography>
            <Typography variant="h6" color="text.secondary">
                Taste Profile • {data.ratings.length} Flavors
            </Typography>
        </Box>
      </Box>

      {favorites.length > 0 && (
          <RatingGrid 
            ratings={favorites} 
            title="Elite Selection" 
            chip={<Chip label="S-Tier" color="secondary" sx={{ fontWeight: 'bold' }} />} 
          />
      )}

      {others.length > 0 && (
          <RatingGrid 
            ratings={others} 
            title="The Collection" 
          />
      )}
    </Container>
  );
};

export default PublicProfile;
