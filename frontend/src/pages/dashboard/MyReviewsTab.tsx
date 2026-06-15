import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import type { RatedItem } from '../../api/types';
import { GlassSurface, EmptyState } from '../../components/ui';
import MyReviewCard from './MyReviewCard';

export interface MyReviewsTabProps {
  ratings: RatedItem[];
  currentUsername: string;
  /** Empty-state CTA: jump the user to the explore/discover view. */
  onExplore: () => void;
}

type RatedSort = 'date' | 'rating';

const MyReviewsTab: React.FC<MyReviewsTabProps> = ({ ratings, currentUsername, onExplore }) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<RatedSort>('date');

  const categories = useMemo(() => {
    const cats = new Set(ratings.map((r) => r.category_name));
    return ['All', ...Array.from(cats).sort()];
  }, [ratings]);

  const filtered = useMemo(() => {
    const items = ratings.filter((r) => {
      const matchCat = category === 'All' || r.category_name === category;
      const matchSearch = r.flavor_name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
    if (sort === 'rating') {
      items.sort(
        (a, b) =>
          b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return items;
  }, [ratings, category, search, sort]);

  return (
    <Box>
      <GlassSurface intensity="subtle" sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Grid container spacing={{ xs: 1.5, lg: 1.5 }} alignItems="center">
          <Grid size={{ xs: 8, sm: 12, lg: 4, xl: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('dashboard.searchRated')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 4, sm: 12, lg: 'auto' }} order={{ xs: 2, sm: 3, lg: 3 }}>
            <Select
              size="small"
              fullWidth
              value={sort}
              onChange={(e) => setSort(e.target.value as RatedSort)}
              startAdornment={
                <InputAdornment position="start">
                  <SortIcon fontSize="small" />
                </InputAdornment>
              }
              sx={{ minWidth: { lg: 140 }, fontWeight: 'bold' }}
            >
              <MenuItem value="date">{t('dashboard.date')}</MenuItem>
              <MenuItem value="rating">{t('dashboard.rating')}</MenuItem>
            </Select>
          </Grid>

          <Grid
            size={{ xs: 12, lg: 'auto' }}
            order={{ xs: 3, sm: 2, lg: 2 }}
            sx={{ flexGrow: 1, overflow: 'hidden' }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                py: 0.5,
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={
                    cat === 'All'
                      ? t('common.all')
                      : t(
                          `categories.${ratings.find((r) => r.category_name === cat)?.category_slug}`,
                          {
                            defaultValue: cat,
                          },
                        )
                  }
                  onClick={() => setCategory(cat)}
                  color={category === cat ? 'primary' : 'default'}
                  variant={category === cat ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 'bold', flexShrink: 0 }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </GlassSurface>

      <Stack spacing={3}>
        {filtered.length === 0 ? (
          <EmptyState
            title={t('dashboard.noRatings')}
            action={
              <Button onClick={onExplore} variant="contained" sx={{ borderRadius: 2 }}>
                {t('dashboard.exploreFlavors')}
              </Button>
            }
          />
        ) : (
          filtered.map((rating) => (
            <MyReviewCard key={rating.id} rating={rating} currentUsername={currentUsername} />
          ))
        )}
      </Stack>
    </Box>
  );
};

export default MyReviewsTab;
