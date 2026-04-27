import { describe, it, expect } from 'vitest';
import { clearLegacyToken } from './api';

describe('clearLegacyToken', () => {
  it('removes legacy DRF and JWT localStorage tokens', () => {
    localStorage.setItem('token', 'old-drf');
    localStorage.setItem('access', 'old-jwt');
    localStorage.setItem('refresh', 'old-refresh');
    clearLegacyToken();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('access')).toBeNull();
    expect(localStorage.getItem('refresh')).toBeNull();
  });
});
