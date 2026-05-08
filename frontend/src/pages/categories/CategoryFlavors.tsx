import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTitle } from '../../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import { useCategoryFlavors } from '../../api/queries/useCategoryFlavors';
import {
  PageShell,
  HeroBackdrop,
  SectionHeader,
  FlavorCard,
  EmptyState,
} from '../../components/ui';

const CategoryFlavors: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: flavors = [], isLoading: loading } = useCategoryFlavors(slug);
  const categoryName = flavors[0]?.category_name || '';

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

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
