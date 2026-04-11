import { describe, it, expect, beforeEach } from 'vitest';
import { clearTokens, getAccessToken, setTokens } from './api';

describe('token helpers', () => {
  beforeEach(() => {
    clearTokens();
  });

  it('returns null when no access token is stored', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and retrieves the access token', () => {
    setTokens('access-123', 'refresh-abc');
    expect(getAccessToken()).toBe('access-123');
    expect(localStorage.getItem('refresh')).toBe('refresh-abc');
  });

  it('updates access without clobbering refresh when refresh is omitted', () => {
    setTokens('first-access', 'first-refresh');
    setTokens('second-access');
    expect(getAccessToken()).toBe('second-access');
    expect(localStorage.getItem('refresh')).toBe('first-refresh');
  });

  it('clearTokens removes both access and refresh', () => {
    setTokens('a', 'b');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('refresh')).toBeNull();
  });
});
