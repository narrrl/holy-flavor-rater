import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';

export interface SearchResult {
  id: number;
  name: string;
  type: 'flavor' | 'category' | 'user';
  subtitle: string;
  image_url: string | null;
  slug: string | null;
}

export const useGlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`flavors/search/?q=${encodeURIComponent(query)}`);
        const results = Array.isArray(res.data) ? res.data : res.data.results || [];
        setOptions(results);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) setQuery(q);
  }, [location.search]);

  return { query, setQuery, options, loading };
};
