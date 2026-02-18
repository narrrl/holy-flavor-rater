import React, { useState, useEffect } from 'react';
import api from '../api';
import GenerativeBanner from './GenerativeBanner';
import NebulaBanner from './NebulaBanner';

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

// Future expansion: Add more banner components here
const MatrixBanner: React.FC<DynamicBannerProps & { settings: any }> = ({ username, settings }) => {
    // Placeholder for a second model
    return (
        <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
            background: 'rgba(0,0,0,0.8)', color: '#0f0', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
            zIndex: 1, overflow: 'hidden', opacity: settings.opacity || 0.5
        }}>
            <div>
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} style={{ animation: `matrixFall ${2 + Math.random() * 3}s linear infinite` }}>
                        {username.split('').map((char, j) => (
                            <span key={j} style={{ display: 'block' }}>{char}</span>
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

const DynamicBanner: React.FC<DynamicBannerProps> = (props) => {
    const [banner, setBanner] = useState<Banner | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActiveBanner = async () => {
            try {
                const res = await api.get('banners/active/');
                setBanner(res.data);
            } catch (err) {
                console.error('Failed to fetch active banner:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveBanner();
    }, []);

    if (loading) return null;

    // Default to GenerativeBanner if no active banner or unrecognized slug
    if (!banner || banner.slug === 'generative-web') {
        return <GenerativeBanner {...props} settings={banner?.settings} />;
    }

    if (banner.slug === 'matrix') {
        return <MatrixBanner {...props} settings={banner.settings} />;
    }

    if (banner.slug === 'nebula') {
        return <NebulaBanner {...props} settings={banner.settings} />;
    }

    // Fallback
    return <GenerativeBanner {...props} />;
};

export default DynamicBanner;
