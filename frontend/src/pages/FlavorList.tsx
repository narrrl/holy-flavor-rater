import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Box, 
  TextField, 
  Button, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Rating as MuiRating
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../api';
import RatingBadge from '../components/RatingBadge';

interface Rating {
    id: number;
    user: string;
    score: number;
    comment: string;
    created_at: string;
}

interface Flavor {
  id: number;
  name: string;
  category_name: string;
  description: string;
  average_rating: number;
  user_rating: number | null;
  ratings: Rating[];
  image_url: string | null;
  is_available: boolean;
  shop_url: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const FlavorList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingInput, setRatingInput] = useState<{[key: number]: {score: number, comment: string}}>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, flavRes] = await Promise.all([
          api.get('categories/'),
          api.get('flavors/')
        ]);
        setCategories(catRes.data);
        setFlavors(flavRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRate = async (flavorId: number) => {
    const input = ratingInput[flavorId];
    if (!input) return;

    try {
      await api.post('ratings/', {
        flavor: flavorId,
        score: input.score,
        comment: input.comment
      });
      // Refresh flavors
      const res = await api.get('flavors/');
      setFlavors(res.data);
      alert('Rating submitted!');
    } catch (err) {
      alert("Failed to submit rating. Make sure you are logged in and haven't rated this yet.");
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Holy Flavors</Typography>
      {categories.map(category => (
        <Box key={category.id} sx={{ mb: 4 }}>
          <Typography variant="h5" color="primary" gutterBottom>{category.name}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {flavors.filter(f => f.category_name === category.name).map(flavor => (
              <Box sx={{ flex: '1 1 30%', minWidth: 280 }} key={flavor.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {!flavor.is_available && (
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 10, 
                        right: 10, 
                        bgcolor: 'error.main', 
                        color: 'white', 
                        px: 1, 
                        borderRadius: 1, 
                        fontSize: '0.75rem',
                        zIndex: 1
                    }}>
                        Out of Stock
                    </Box>
                  )}
                  {flavor.image_url && (
                    <Box 
                        component="img" 
                        src={flavor.image_url} 
                        sx={{ 
                            width: '100%', 
                            height: 200, 
                            objectFit: 'contain', 
                            p: 2, 
                            bgcolor: 'rgba(255,255,255,0.05)' 
                        }} 
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{flavor.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {flavor.description}
                    </Typography>
                    {flavor.shop_url && (
                        <Button 
                            variant="outlined" 
                            size="small" 
                            component="a" 
                            href={flavor.shop_url} 
                            target="_blank" 
                            sx={{ mb: 2, fontSize: '0.7rem' }}
                        >
                            View in Shop
                        </Button>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>Avg:</Typography>
                      <RatingBadge score={flavor.average_rating || 0} size="small" />
                    </Box>

                    {flavor.ratings && flavor.ratings.length > 0 && (
                        <Accordion variant="outlined" sx={{ mt: 1, mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="caption">Comments ({flavor.ratings.filter(r => r.comment).length})</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
                                {flavor.ratings.filter(r => r.comment).map(r => (
                                    <Box key={r.id} sx={{ mb: 1, borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>{r.user} ({r.score}/10):</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{r.comment}</Typography>
                                    </Box>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    )}

                    {flavor.user_rating ? (
                      <Typography variant="body2" color="secondary">Your Rating: {flavor.user_rating}/10</Typography>
                    ) : (
                      <Accordion variant="outlined" sx={{ mt: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">Rate this flavor</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MuiRating 
                              max={10} 
                              value={ratingInput[flavor.id]?.score || 0} 
                              onChange={(_: any, val: number | null) => setRatingInput({...ratingInput, [flavor.id]: {...(ratingInput[flavor.id] || {comment: ''}), score: val || 0}})}
                            />
                            <TextField 
                              label="Comment (Optional)" 
                              variant="outlined" 
                              size="small" 
                              multiline
                              value={ratingInput[flavor.id]?.comment || ''}
                              onChange={(e) => setRatingInput({...ratingInput, [flavor.id]: {...(ratingInput[flavor.id] || {score: 0}), comment: e.target.value}})}
                            />
                            <Button variant="contained" size="small" onClick={() => handleRate(flavor.id)}>Submit</Button>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default FlavorList;
