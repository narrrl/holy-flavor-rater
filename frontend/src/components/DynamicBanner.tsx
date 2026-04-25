import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import GenerativeBanner from './GenerativeBanner';
import NebulaBanner from './NebulaBanner';
import FirefliesBanner from './FirefliesBanner';
import HextechBanner from './HextechBanner';
import HextechCorruptionBanner from './HextechCorruptionBanner';
import GenerativeFlowBanner from './GenerativeFlowBanner';
import { BannerPerformanceWrapper } from './BannerPerformanceWrapper';

interface Banner {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  settings: any;
}

interface DynamicBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
}

const MatrixBanner: React.FC<DynamicBannerProps & { settings: Banner['settings'] | null }> = ({
  username,
  settings,
}) => {
  const [durations] = useState(() => Array.from({ length: 20 }, () => 2 + Math.random() * 3));
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        zIndex: 0,
        overflow: 'hidden',
        opacity: settings?.opacity || 0.5,
      }}
    >
      <div>
        {durations.map((dur, i) => (
          <div key={i} style={{ animation: `matrixFall ${dur}s linear infinite` }}>
            {username.split('').map((char, j) => (
              <span key={j} style={{ display: 'block' }}>
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>
      <style>
        {`
                    @keyframes matrixFall {
                        0% { transform: translateY(-100%); }
                        100% { transform: translateY(100%); }
                    }
                `}
      </style>
    </div>
  );
};

const pickBanner = (banner: Banner | null, props: DynamicBannerProps): React.ReactElement => {
  if (!banner || banner.slug === 'generative-web') {
    return <GenerativeBanner {...props} settings={banner?.settings} />;
  }
  if (banner.slug === 'matrix') return <MatrixBanner {...props} settings={banner.settings} />;
  if (banner.slug === 'nebula') return <NebulaBanner {...props} settings={banner.settings} />;
  if (banner.slug === 'fireflies') return <FirefliesBanner {...props} settings={banner.settings} />;
  if (banner.slug === 'hextech') return <HextechBanner {...props} settings={banner.settings} />;
  if (banner.slug === 'hextech-corruption')
    return <HextechCorruptionBanner {...props} settings={banner.settings} />;
  if (banner.slug === 'generative-flow')
    return <GenerativeFlowBanner {...props} settings={banner.settings} />;
  return <GenerativeBanner {...props} />;
};

const DynamicBanner: React.FC<DynamicBannerProps> = (props) => {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveBanner = async () => {
      try {
        const res = await api.get('banners/active/', {
          params: { username: props.username },
        });
        setBanner(res.data);
      } catch (err) {
        console.error('Failed to fetch active banner:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveBanner();
  }, [props.username]);

  if (loading) return null;

  return <BannerPerformanceWrapper>{pickBanner(banner, props)}</BannerPerformanceWrapper>;
};

export default DynamicBanner;
