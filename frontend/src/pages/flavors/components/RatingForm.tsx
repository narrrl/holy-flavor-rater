import React, { useState } from 'react';
import { Box, Button, CardContent, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../../components/ui';
import ScoreInput from '../../../components/ui/ScoreInput';
import MentionTextField from '../../../components/MentionTextField';
import { useCreateRating } from '../../../api/mutations/useRatingMutations';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';

export interface RatingFormProps {
  flavorId: number;
}

const RatingForm: React.FC<RatingFormProps> = ({ flavorId }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { user } = useAuth();
  const createRating = useCreateRating();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score) {
      notify({ message: t('flavorDetail.selectScore'), severity: 'warning' });
      return;
    }
    try {
      await createRating.mutateAsync({
        flavor: flavorId,
        score,
        comment,
        optimistic: user ? { user: user.username, user_avatar: user.avatar } : undefined,
      });
      setScore(null);
      setComment('');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      notify({ message: msg || t('flavorDetail.submitFailed'), severity: 'error' });
    }
  };

  return (
    <GlassCard intensity="default">
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          {t('flavorDetail.rateThisFlavor')}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <ScoreInput
              value={score}
              onChange={setScore}
              size="large"
              ariaLabel={t('flavorDetail.scoreLabel')}
            />
          </Box>
          <MentionTextField
            multiline
            rows={3}
            placeholder={t('flavorDetail.shareThoughts')}
            value={comment}
            onChange={setComment}
          />
          <Button
            variant="contained"
            type="submit"
            disabled={!score || createRating.isPending}
            sx={{ mt: 2, borderRadius: 2, fontWeight: 'bold' }}
          >
            {t('flavorDetail.submitReview')}
          </Button>
        </form>
      </CardContent>
    </GlassCard>
  );
};

export default RatingForm;
