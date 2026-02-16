import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Rating as MuiRating, 
  Button, 
  TextField,
  Avatar,
  Alert,
  Paper,
  CircularProgress,
  Container
} from '@mui/material';
import api from '../../api';
import { useTitle } from '../../hooks/useTitle';

interface Reply {
    id: number;
    user: string;
    text: string;
    created_at: string;
}

interface Rating {
    id: number;
    user: string;
    user_avatar: string | null;
    score: number;
    comment: string;
    created_at: string;
    replies: Reply[];
}

interface Flavor {
  id: number;
  name: string;
  category_name: string;
  category_slug: string;
  description: string;
  average_rating: number;
  user_rating: number | null;
  ratings: Rating[];
  image_url: string | null;
  is_available: boolean;
  is_legacy: boolean;
  shop_url: string | null;
}

const FlavorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyInputs, setReplyInputs] = useState<{[key: number]: string}>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Rating form state
  const [newScore, setNewScore] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  
  // Edit state
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  const fetchFlavor = async () => {
    try {
      const res = await api.get(`flavors/${id}/`);
      setFlavor(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getUser = async () => {
        try {
            const res = await api.get('users/me/');
            setCurrentUser(res.data.username);
        } catch (e) { /* ignore */ }
    };
    getUser();
    fetchFlavor();
  }, [id]);

  useTitle(flavor?.name || 'Flavor Detail');

  const handleRatingSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newScore) {
          alert('Please select a score');
          return;
      }
      try {
          await api.post('ratings/', { flavor: flavor?.id, score: newScore, comment: newComment });
          setNewScore(null);
          setNewComment('');
          fetchFlavor();
      } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to submit rating');
      }
  };

  const handleReplySubmit = async (ratingId: number) => {
      const text = replyInputs[ratingId];
      if (!text) return;
      try {
          await api.post(`ratings/${ratingId}/reply/`, { text });
          setReplyInputs({ ...replyInputs, [ratingId]: '' });
          fetchFlavor();
      } catch (err) {
          alert('Failed to submit reply');
      }
  };

  const handleDeleteRating = async (ratingId: number) => {
      if (!confirm('Are you sure?')) return;
      try {
          await api.delete(`ratings/${ratingId}/`);
          fetchFlavor();
      } catch (err) {
          alert('Failed to delete review');
      }
  };

  const startEdit = (rating: Rating) => {
      setEditMode(rating.id);
      setEditScore(rating.score);
      setEditComment(rating.comment || '');
  };

  const handleUpdateRating = async (ratingId: number) => {
      try {
          await api.patch(`ratings/${ratingId}/`, { score: editScore, comment: editComment });
          setEditMode(null);
          fetchFlavor();
      } catch (err) {
          alert('Failed to update review');
      }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!flavor) return <Typography>Flavor not found</Typography>;

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Button component={Link} to={`/category/${flavor.category_slug}`} sx={{ mb: 2 }}>
        &larr; Back to {flavor.category_name}
      </Button>

      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 4, overflow: 'hidden' }}>
        {flavor.image_url && (
            <Box 
                sx={{ 
                    width: { xs: '100%', md: 400 }, 
                    aspectRatio: '1/1', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    bgcolor: 'action.hover', 
                    p: { xs: 4, md: 6 } 
                }}
            >
                <Box 
                    component="img" 
                    src={flavor.image_url} 
                    sx={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0px 12px 24px rgba(0,0,0,0.15))'
                    }} 
                />
            </Box>
        )}
        <CardContent sx={{ flex: 1, p: 4 }}>
            {!flavor.is_available && (
                <Alert severity={flavor.is_legacy ? "warning" : "error"} sx={{ mb: 2 }}>
                    {flavor.is_legacy ? "Unavailable (Legacy Flavor)" : "Out of Stock"}
                </Alert>
            )}
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>{flavor.name}</Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>{flavor.category_name}</Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} size="large" max={10} />
                <Typography variant="h5" sx={{ ml: 2 }}>{(flavor.average_rating || 0).toFixed(1)} / 10</Typography>
            </Box>

            <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.8 }}>{flavor.description}</Typography>

            {flavor.shop_url && (
                <Button variant="contained" size="large" component="a" href={flavor.shop_url} target="_blank">
                    Buy Now
                </Button>
            )}
        </CardContent>
      </Card>

      {/* New Rating Form */}
      {currentUser && flavor.user_rating === null && (
          <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom>Rate this flavor</Typography>
              <form onSubmit={handleRatingSubmit}>
                  <Box sx={{ mb: 2 }}>
                      <Typography component="legend">Score (1-10)</Typography>
                      <MuiRating max={10} value={newScore} onChange={(_, val) => setNewScore(val)} size="large" />
                  </Box>
                  <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Your Comment (Optional)"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      sx={{ mb: 2 }}
                  />
                  <Button variant="contained" type="submit" disabled={!newScore}>Submit Rating</Button>
              </form>
          </Paper>
      )}

      <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3 }}>Community Reviews</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {flavor.ratings.length === 0 ? (
            <Typography color="text.secondary">No reviews yet.</Typography>
        ) : (
            flavor.ratings.map((rating: Rating) => (
                <Card key={rating.id} variant="outlined">
                    <CardContent>
                        {editMode === rating.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <MuiRating max={10} value={editScore} onChange={(_, val) => setEditScore(val || 0)} />
                                <TextField multiline fullWidth value={editComment} onChange={(e) => setEditComment(e.target.value)} />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" onClick={() => handleUpdateRating(rating.id)}>Save</Button>
                                    <Button onClick={() => setEditMode(null)}>Cancel</Button>
                                </Box>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar src={rating.user_avatar || undefined} sx={{ width: 32, height: 32, mr: 1.5 }}>
                                        {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{rating.user}</Typography>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <MuiRating value={rating.score} readOnly size="small" max={10} />
                                    <Typography variant="body2" sx={{ ml: 1 }}>{rating.score}/10</Typography>
                                </Box>
                                {rating.comment && <Typography variant="body1" sx={{ mb: 2 }}>{rating.comment}</Typography>}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">{new Date(rating.created_at).toLocaleDateString()}</Typography>
                                    {currentUser === rating.user && (
                                        <Box>
                                            <Button size="small" onClick={() => startEdit(rating)}>Edit</Button>
                                            <Button size="small" color="error" onClick={() => handleDeleteRating(rating.id)}>Delete</Button>
                                        </Box>
                                    )}
                                </Box>
                            </>
                        )}

                        <Box sx={{ mt: 2, ml: { xs: 2, md: 4 }, pl: 2, borderLeft: '2px solid rgba(0,0,0,0.1)' }}>
                            {rating.replies.map((reply: any) => (
                                <Box key={reply.id} sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{reply.user}</Typography>
                                    <Typography variant="body2">{reply.text}</Typography>
                                    <Typography variant="caption" color="text.secondary">{new Date(reply.created_at).toLocaleDateString()}</Typography>
                                </Box>
                            ))}
                            {currentUser && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <TextField size="small" placeholder="Write a reply..." fullWidth value={replyInputs[rating.id] || ''} onChange={(e) => setReplyInputs({ ...replyInputs, [rating.id]: e.target.value })} />
                                    <Button size="small" disabled={!replyInputs[rating.id]} onClick={() => handleReplySubmit(rating.id)}>Reply</Button>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            ))
        )}
      </Box>
    </Container>
  );
};

export default FlavorDetail;
