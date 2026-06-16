import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useTitle } from '../../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import { useCategoryFlavors } from '../../api/queries/useCategoryFlavors';
import {
  PageShell,
  HeroBackdrop,
  SectionHeader,
  FlavorCard,
  FlavorGrid,
  EmptyState,
  BackButton,
} from '../../components/ui';

const CategoryFlavors: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data: flavors = [], isLoading: loading } = useCategoryFlavors(slug);
  const categoryName = flavors[0]?.category_name || '';

  useTitle(categoryName || t('home.flavorsFallback'));

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
      <BackButton />

      <SectionHeader title={categoryName || t('home.flavorsFallback')} />

      {flavors.length === 0 ? (
        <EmptyState title={t('home.noCategoryFlavors')} subtitle={t('home.noCategoryFlavorsSub')} />
      ) : (
        <FlavorGrid>
          {flavors.map((flavor) => (
            <FlavorCard
              key={flavor.id}
              flavor={flavor}
              showCategory={false}
              caption={`${flavor.ratings.length} ${t('common.reviews')}`}
            />
          ))}
        </FlavorGrid>
      )}
    </PageShell>
  );
};

export default CategoryFlavors;
