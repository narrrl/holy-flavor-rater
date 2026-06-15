/**
 * Central query-key factory. Keys live here so mutations can invalidate the
 * right slices without grepping. Convention: scope first, then identifying
 * params (URL-stable, not the full args object).
 */
export const queryKeys = {
  categories: () => ['categories'] as const,
  dashboard: () => ['dashboard'] as const,
  recommendations: () => ['recommendations'] as const,
  publicProfile: (username: string) => ['publicProfile', username] as const,
  publicProfileAll: () => ['publicProfile'] as const,
  flavors: (params: Record<string, unknown>) => ['flavors', params] as const,
  flavorsAll: () => ['flavors'] as const,
  flavorDetail: (id: number | string) => ['flavorDetail', String(id)] as const,
  similarFlavors: (id: number | string) => ['similarFlavors', String(id)] as const,
  activeBanner: (username: string) => ['activeBanner', username] as const,
  notifications: () => ['notifications'] as const,
  communityFeed: (params: Record<string, unknown>) => ['communityFeed', params] as const,
};
