import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../services/auth-service';
import { ApiService } from '../services/api-service';

describe('Session restoration races', () => {
  it('invalidates visible state when another tab replaces the account token', () => {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: {} }] });
    const auth = TestBed.inject(AuthService);
    auth.login('old-token');
    const epoch = auth.sessionEpoch();
    localStorage.setItem('accessToken', 'other-account-token');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'accessToken',
        oldValue: 'old-token',
        newValue: 'other-account-token',
        storageArea: localStorage,
      }),
    );
    expect(auth.isUserLoggedIn()).toBe(false);
    expect(auth.sessionEpoch()).toBeGreaterThan(epoch);
    expect(auth.accessToken()).toBe('other-account-token');
  });

  afterEach(() => localStorage.clear());
  it('a prior session failure does not sign out a new login', async () => {
    let resolve!: (value: unknown) => void;
    const api = {
      get: vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    const auth = TestBed.inject(AuthService);
    auth.login('old-token');
    const restoring = auth.loginStatus();
    auth.login('new-token');
    resolve({ ok: false, status: 401, body: null });
    await restoring;
    expect(auth.accessToken()).toBe('new-token');
    expect(auth.isUserLoggedIn()).toBe(true);
  });
});
