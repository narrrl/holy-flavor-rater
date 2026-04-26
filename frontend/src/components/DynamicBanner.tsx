import React from 'react';
import { useActiveBanner } from '../api/queries/useActiveBanner';
import type { BannerConfig } from '../api/types';
import {
  BannerPerformanceWrapper,
  FirefliesBanner,
  GenerativeBanner,
  GenerativeFlowBanner,
  HextechBanner,
  HextechCorruptionBanner,
  MatrixBanner,
  NebulaBanner,
} from './banners';

interface DynamicBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
}

const pickBanner = (
  banner: BannerConfig | null | undefined,
  props: DynamicBannerProps,
): React.ReactElement => {
  const settings = banner?.settings ?? undefined;
  if (!banner || banner.slug === 'generative-web') {
    return <GenerativeBanner {...props} settings={settings} />;
  }
  if (banner.slug === 'matrix') return <MatrixBanner {...props} settings={settings} />;
  if (banner.slug === 'nebula') return <NebulaBanner {...props} settings={settings} />;
  if (banner.slug === 'fireflies') return <FirefliesBanner {...props} settings={settings} />;
  if (banner.slug === 'hextech') return <HextechBanner {...props} settings={settings} />;
  if (banner.slug === 'hextech-corruption')
    return <HextechCorruptionBanner {...props} settings={settings} />;
  if (banner.slug === 'generative-flow')
    return <GenerativeFlowBanner {...props} settings={settings} />;
  return <GenerativeBanner {...props} />;
};

const DynamicBanner: React.FC<DynamicBannerProps> = (props) => {
  const { data: banner, isLoading } = useActiveBanner(props.username);

  if (isLoading) return null;

  return <BannerPerformanceWrapper>{pickBanner(banner, props)}</BannerPerformanceWrapper>;
};

export default DynamicBanner;
