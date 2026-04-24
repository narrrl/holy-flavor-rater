import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../lib/api';
import { useTitle } from '../../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import {
  PageShell,
  HeroBackdrop,
  SectionHeader,
  FlavorCard,
  EmptyState,
} from '../../components/ui';

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
  is_legacy: boolean;
  shop_url: string | null;
}

const CategoryFlavors: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const fetchFlavors = async () => {
      setLoading(true);
      try {
        const res = await api.get(`flavors/?category__slug=${slug}`);
        const data: Flavor[] = Array.isArray(res.data) ? res.data : res.data.results || [];
        setFlavors(data);
        if (data.length > 0) {
          setCategoryName(data[0].category_name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlavors();
  }, [slug]);

  useTitle(categoryName || 'Flavors');

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
      <Button
        variant="outlined"
        onClick={handleGoBack}
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start', borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
      >
        {window.history.length > 1 ? t('common.back') : t('common.backToHome')}
      </Button>

      <SectionHeader title={categoryName || 'Flavors'} />

      {flavors.length === 0 ? (
        <EmptyState title="No flavors here yet" subtitle="Check back soon." />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(260px, 1fr))',
              lg: 'repeat(auto-fill, minmax(240px, 1fr))',
            },
            gap: 3,
          }}
        >
          {flavors.map((flavor) => (
            <FlavorCard
              key={flavor.id}
              flavor={flavor}
              showCategory={false}
              caption={`${flavor.ratings.length} reviews`}
            />
          ))}
        </Box>
      )}
    </PageShell>
  );
};

export default CategoryFlavors;
