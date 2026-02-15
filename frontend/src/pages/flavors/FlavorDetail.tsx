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
  Avatar
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
  shop_url: string | null;
}

const FlavorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyInputs, setReplyInputs] = useState<{[key: number]: string}>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    const getUser = async () => {
        try {
            const res = await api.get('users/me/');
            setCurrentUser(res.data.username);
        } catch (e) { /* ignore */ }
    };
    getUser();
  }, []);

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
    fetchFlavor();
  }, [id]);

  useTitle(flavor?.name || 'Flavor Detail');

  const handleReplySubmit = async (ratingId: number) => {
      const text = replyInputs[ratingId];
      if (!text) return;

      try {
          await api.post(`ratings/${ratingId}/reply/`, { text });
          setReplyInputs({ ...replyInputs, [ratingId]: '' });
          fetchFlavor(); // Refresh to show new reply
      } catch (err) {
          alert('Failed to submit reply');
      }
  };

  const handleDeleteRating = async (ratingId: number) => {
      if (!confirm('Are you sure you want to delete your review?')) return;
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

  if (loading) return <Typography>Loading...</Typography>;
  if (!flavor) return <Typography>Flavor not found</Typography>;

  return (
    <Box>
      <Button component={Link} to={`/category/${flavor.category_slug}`} sx={{ mb: 2 }}>
        &larr; Back to {flavor.category_name}
      </Button>

      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 4, overflow: 'visible' }}>
        {flavor.image_url && (
            <Box 
                sx={{ 
                    width: { xs: '100%', md: 400 }, 
                    height: 400, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    p: 4
                }}
            >
                <Box 
                    component="img" 
                    src={flavor.image_url} 
                    sx={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.3))'
                    }} 
                />
            </Box>
        )}
        <CardContent sx={{ flex: 1, p: 4 }}>
            {!flavor.is_available && (
                <Box sx={{ 
                    display: 'inline-block',
                    bgcolor: 'error.main', 
                    color: 'white', 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1, 
                    mb: 2,
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                }}>
                    Out of Stock
                </Box>
            )}
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>{flavor.name}</Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>{flavor.category_name}</Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} size="large" />
                <Typography variant="h5" sx={{ ml: 2 }}>{(flavor.average_rating || 0).toFixed(1)} / 10</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>({flavor.ratings.length} ratings)</Typography>
            </Box>

            <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.8 }}>
                {flavor.description}
            </Typography>

            {flavor.shop_url && (
                <Button 
                    variant="contained" 
                    size="large" 
                    component="a" 
                    href={flavor.shop_url} 
                    target="_blank" 
                    sx={{ px: 4, py: 1.5 }}
                >
                    Buy Now
                </Button>
            )}
        </CardContent>
      </Card>

      <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3 }}>Community Reviews</Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {flavor.ratings.length === 0 ? (
            <Typography color="text.secondary">No reviews yet. Be the first to rate this flavor!</Typography>
        ) : (
            flavor.ratings.map((rating: Rating) => (
                <Card key={rating.id} variant="outlined">
                    <CardContent>
                        {editMode === rating.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="h6">Edit Review</Typography>
                                <MuiRating max={10} value={editScore} onChange={(_, val) => setEditScore(val || 0)} />
                                <TextField 
                                    multiline 
                                    fullWidth 
                                    label="Comment" 
                                    value={editComment} 
                                    onChange={(e) => setEditComment(e.target.value)} 
                                />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" onClick={() => handleUpdateRating(rating.id)}>Save</Button>
                                    <Button onClick={() => setEditMode(null)}>Cancel</Button>
                                </Box>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{ width: 32, height: 32, mr: 1.5, fontSize: '0.875rem' }}>
                                        {rating.user.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{rating.user}</Typography>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <MuiRating value={rating.score} readOnly size="small" />
                                    <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>{rating.score}/10</Typography>
                                </Box>
                                
                                {rating.comment && (
                                    <Typography variant="body1" sx={{ mb: 2 }}>{rating.comment}</Typography>
                                )}
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(rating.created_at).toLocaleDateString()}
                                    </Typography>
                                    {currentUser === rating.user && (
                                        <Box>
                                            <Button size="small" onClick={() => startEdit(rating)}>Edit</Button>
                                            <Button size="small" color="error" onClick={() => handleDeleteRating(rating.id)}>Delete</Button>
                                        </Box>
                                    )}
                                </Box>
                            </>
                        )}

                        {/* Replies Section */}
                        {(rating.replies.length > 0 || true) && ( // Always show reply section essentially
                            <Box sx={{ mt: 2, ml: 4, pl: 2, borderLeft: '2px solid rgba(0,0,0,0.1)' }}>
                                {rating.replies.map((reply: Reply) => (
                                    <Box key={reply.id} sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                            {reply.user}
                                        </Typography>
                                        <Typography variant="body2">{reply.text}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(reply.created_at).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                ))}
                                
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <TextField 
                                        size="small" 
                                        placeholder="Write a reply..." 
                                        fullWidth 
                                        value={replyInputs[rating.id] || ''}
                                        onChange={(e) => setReplyInputs({ ...replyInputs, [rating.id]: e.target.value })}
                                    />
                                    <Button 
                                        variant="text" 
                                        disabled={!replyInputs[rating.id]}
                                        onClick={() => handleReplySubmit(rating.id)}
                                    >
                                        Reply
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            ))
        )}
      </Box>
    </Box>
  );
};

export default FlavorDetail;
