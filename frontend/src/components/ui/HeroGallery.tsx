import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, IconButton, Modal, Typography, alpha, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import useEmblaCarousel from 'embla-carousel-react';
import { GlassCard, GlassSurface } from './Glass';

export interface HeroGalleryProps {
  images: string[];
  alt: string;
  badge?: React.ReactNode;
  enableLightbox?: boolean;
}

interface CarouselProps {
  images: string[];
  alt: string;
  onMainClick?: () => void;
  variant: 'inline' | 'lightbox';
}

const Carousel: React.FC<CarouselProps> = ({ images, alt, onMainClick, variant }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [counterVisible, setCounterVisible] = useState(true);
  const counterTimeoutRef = useRef<number | null>(null);

  const updateState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const flashCounter = useCallback(() => {
    setCounterVisible(true);
    if (counterTimeoutRef.current) window.clearTimeout(counterTimeoutRef.current);
    counterTimeoutRef.current = window.setTimeout(() => setCounterVisible(false), 1500);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    updateState();
    emblaApi.on('select', updateState);
    emblaApi.on('reInit', updateState);
    emblaApi.on('select', flashCounter);
    flashCounter();
    return () => {
      if (counterTimeoutRef.current) window.clearTimeout(counterTimeoutRef.current);
    };
  }, [emblaApi, updateState, flashCounter]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const scrollTo = (idx: number) => emblaApi?.scrollTo(idx);

  const isLightbox = variant === 'lightbox';

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box
        ref={emblaRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={t('flavorDetail.galleryLabel', { name: alt })}
        sx={{
          overflow: 'hidden',
          aspectRatio: isLightbox ? 'auto' : '1 / 1',
          height: isLightbox ? '80vh' : 'auto',
          bgcolor: isLightbox ? 'transparent' : 'action.hover',
          borderRadius: isLightbox ? 0 : 0,
        }}
      >
        <Box sx={{ display: 'flex', height: '100%' }}>
          {images.map((src, i) => (
            <Box
              key={`${src}-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={t('flavorDetail.imageOf', { current: i + 1, total: images.length })}
              sx={{
                flex: '0 0 100%',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: isLightbox ? 4 : 4,
                cursor: onMainClick ? 'zoom-in' : 'default',
              }}
              onClick={onMainClick}
            >
              <Box
                component="img"
                src={src}
                alt={`${alt} — ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: isLightbox
                    ? 'drop-shadow(0px 24px 48px rgba(0,0,0,0.5))'
                    : 'drop-shadow(0px 10px 20px rgba(0,0,0,0.15))',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Counter pill */}
      {images.length > 1 && (
        <GlassSurface
          intensity="strong"
          sx={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 1.25,
            py: 0.4,
            borderRadius: theme.tokens.radius.pill + 'px',
            opacity: counterVisible ? 0.95 : 0,
            transition: 'opacity 300ms ease',
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.primary',
            }}
          >
            {selectedIndex + 1} / {images.length}
          </Typography>
        </GlassSurface>
      )}

      {/* Chevrons (desktop only) */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1,
            '@media (hover: none)': { display: 'none' },
          }}
        >
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              scrollPrev();
            }}
            disabled={!canPrev}
            aria-label={t('flavorDetail.previousImage')}
            sx={{
              pointerEvents: 'auto',
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: theme.tokens.glass.blur,
              opacity: canPrev ? 1 : 0,
              transition: 'opacity 200ms ease',
              '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.85) },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              scrollNext();
            }}
            disabled={!canNext}
            aria-label={t('flavorDetail.nextImage')}
            sx={{
              pointerEvents: 'auto',
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: theme.tokens.glass.blur,
              opacity: canNext ? 1 : 0,
              transition: 'opacity 200ms ease',
              '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.85) },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      {/* Thumbnails */}
      {images.length > 1 && !isLightbox && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            mt: 1.5,
            mx: 2,
            mb: 1.5,
            overflowX: 'auto',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: alpha(theme.palette.text.primary, 0.2),
              borderRadius: 4,
            },
          }}
        >
          {images.map((src, i) => {
            const active = selectedIndex === i;
            return (
              <ButtonBase
                key={`thumb-${src}-${i}`}
                onClick={() => scrollTo(i)}
                aria-label={t('flavorDetail.showImage', { n: i + 1 })}
                aria-current={active ? 'true' : undefined}
                sx={{
                  flex: '0 0 auto',
                  width: 44,
                  height: 44,
                  borderRadius: theme.tokens.radius.sm + 'px',
                  border: '2px solid',
                  borderColor: active ? 'primary.main' : alpha(theme.palette.text.primary, 0.12),
                  overflow: 'hidden',
                  bgcolor: 'action.hover',
                  transition: 'border-color 160ms ease, transform 160ms ease',
                  '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
                  '&:focus-visible': {
                    outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt=""
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }}
                />
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

const HeroGallery: React.FC<HeroGalleryProps> = ({ images, alt, badge, enableLightbox = true }) => {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasImages = images.length > 0;
  const single = images.length === 1;

  return (
    <>
      <GlassCard intensity="strong" sx={{ overflow: 'hidden', position: 'relative' }}>
        {badge && <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>{badge}</Box>}

        {!hasImages ? (
          <Box
            sx={{
              p: 4,
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <Typography color="text.secondary">{t('flavorDetail.noImage')}</Typography>
          </Box>
        ) : single ? (
          <Box
            onClick={enableLightbox ? () => setLightboxOpen(true) : undefined}
            sx={{
              p: 4,
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              cursor: enableLightbox ? 'zoom-in' : 'default',
            }}
          >
            <Box
              component="img"
              src={images[0]}
              alt={alt}
              loading="eager"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.15))',
              }}
            />
          </Box>
        ) : (
          <Carousel
            images={images}
            alt={alt}
            variant="inline"
            onMainClick={enableLightbox ? () => setLightboxOpen(true) : undefined}
          />
        )}
      </GlassCard>

      {enableLightbox && hasImages && (
        <Modal
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          aria-label={t('flavorDetail.galleryLabel', { name: alt })}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
          slotProps={{
            backdrop: {
              sx: { bgcolor: alpha('#000', 0.85) },
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: { xs: '100vw', sm: '90vw' },
              maxWidth: 1200,
              outline: 'none',
            }}
          >
            <IconButton
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 3,
                color: 'common.white',
                bgcolor: alpha('#000', 0.4),
                '&:hover': { bgcolor: alpha('#000', 0.6) },
              }}
            >
              <CloseIcon />
            </IconButton>
            {single ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '80vh',
                  p: 4,
                }}
              >
                <Box
                  component="img"
                  src={images[0]}
                  alt={alt}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0px 24px 48px rgba(0,0,0,0.5))',
                  }}
                />
              </Box>
            ) : (
              <Carousel images={images} alt={alt} variant="lightbox" />
            )}
          </Box>
        </Modal>
      )}
    </>
  );
};

export default HeroGallery;
