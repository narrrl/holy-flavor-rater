import React, { useState } from 'react';
import {
  Typography,
  CardContent,
  Box,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating as MuiRating,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCategories, useFlavorsList } from '../api/queries/useFlavorsList';
import { useCreateRating } from '../api/mutations/useRatingMutations';
import RatingBadge from '../components/RatingBadge';
import StatusBadge from '../components/StatusBadge';
import { PageShell, HeroBackdrop, GlassCard, SectionHeader } from '../components/ui';
import { useToast } from '../hooks/useToast';

interface RatingInput {
  score: number;
  comment: string;
}

const FlavorList: React.FC = () => {
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: flavors = [], isLoading: flavLoading } = useFlavorsList();
  const createRating = useCreateRating();
  const [ratingInput, setRatingInput] = useState<Record<number, RatingInput>>({});
  const { notify } = useToast();

  const loading = catLoading || flavLoading;

  const handleRate = async (flavorId: number) => {
    const input = ratingInput[flavorId];
    if (!input) return;
    try {
      await createRating.mutateAsync({
        flavor: flavorId,
        score: input.score,
        comment: input.comment,
      });
      notify({ message: 'Rating submitted!', severity: 'success' });
    } catch {
      notify({
        message: "Failed to submit rating. Make sure you are logged in and haven't rated this yet.",
        severity: 'error',
      });
    }
  };

  if (loading)
    return (
      <PageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );

  return (
    <PageShell hero={<HeroBackdrop variant="mesh" />}>
      <SectionHeader title="Holy Flavors" />

      {categories.map((category) => (
        <Box key={category.id}>
          <SectionHeader title={category.name} compact />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(auto-fill, minmax(280px, 1fr))',
              },
              gap: 3,
            }}
          >
            {flavors
              .filter((f) => f.category_name === category.name)
              .map((flavor) => (
                <GlassCard
                  key={flavor.id}
                  intensity="subtle"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
                    <StatusBadge
                      isLegacy={flavor.is_legacy}
                      isAvailable={flavor.is_available}
                      size="small"
                    />
                  </Box>

                  {flavor.image_url && (
                    <Box
                      component="img"
                      src={flavor.image_url}
                      alt={flavor.name}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: 200,
                        objectFit: 'contain',
                        p: 2,
                        bgcolor: (theme) => theme.tokens.surface.sunken,
                      }}
                    />
                  )}

                  <CardContent
                    sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    <Typography variant="h6">{flavor.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {flavor.description}
                    </Typography>
                    {flavor.shop_url && (
                      <Button
                        variant="outlined"
                        size="small"
                        component="a"
                        href={flavor.shop_url}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ alignSelf: 'flex-start', fontSize: '0.7rem' }}
                      >
                        View in Shop
                      </Button>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">Avg:</Typography>
                      <RatingBadge score={flavor.average_rating || 0} size="small" />
                    </Box>

                    {flavor.ratings && flavor.ratings.length > 0 && (
                      <Accordion variant="outlined" sx={{ mt: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="caption">
                            Comments ({flavor.ratings.filter((r) => r.comment).length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
                          {flavor.ratings
                            .filter((r) => r.comment)
                            .map((r) => (
                              <Box
                                key={r.id}
                                sx={{
                                  mb: 1,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  pb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 'bold', display: 'block' }}
                                >
                                  {r.user} ({r.score}/10):
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {r.comment}
                                </Typography>
                              </Box>
                            ))}
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {flavor.user_rating ? (
                      <Typography variant="body2" color="secondary">
                        Your Rating: {flavor.user_rating}/10
                      </Typography>
                    ) : (
                      <Accordion variant="outlined" sx={{ mt: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">Rate this flavor</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MuiRating
                              max={10}
                              value={ratingInput[flavor.id]?.score || 0}
                              onChange={(_, val) =>
                                setRatingInput({
                                  ...ratingInput,
                                  [flavor.id]: {
                                    ...(ratingInput[flavor.id] || { comment: '' }),
                                    score: val || 0,
                                  },
                                })
                              }
                            />
                            <TextField
                              label="Comment (Optional)"
                              variant="outlined"
                              size="small"
                              multiline
                              value={ratingInput[flavor.id]?.comment || ''}
                              onChange={(e) =>
                                setRatingInput({
                                  ...ratingInput,
                                  [flavor.id]: {
                                    ...(ratingInput[flavor.id] || { score: 0 }),
                                    comment: e.target.value,
                                  },
                                })
                              }
                            />
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleRate(flavor.id)}
                            >
                              Submit
                            </Button>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </CardContent>
                </GlassCard>
              ))}
          </Box>
        </Box>
      ))}
    </PageShell>
  );
};

export default FlavorList;
