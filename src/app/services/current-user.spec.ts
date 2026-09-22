import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth-service';
import { ApiService } from './api-service';

const user = { id: 'user-1', name: 'Ada Example', email: 'ada@example.test' };
const response = (status = 200, body: unknown = user) => ({ ok: status === 200, status, body });
describe('Current-user identity', () => {
  let auth: AuthService;
  const get = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    get.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { get } }] });
    auth = TestBed.inject(AuthService);
    auth.login('test-token');
  });
  afterEach(() => localStorage.clear());
  it('retains the identity returned by session restoration', async () => {
    get.mockResolvedValue(response());
    expect(await auth.loginStatus()).toBe(true);
    expect(auth.currentUser()).toEqual(user);
    await auth.ensureCurrentUser();
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('shares a pending request and exposes loading without stale identity', async () => {
    get.mockResolvedValueOnce(response());
    await auth.refreshCurrentUser();
    let finish!: (result: unknown) => void;
    get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = auth.refreshCurrentUser();
    const second = auth.refreshCurrentUser();
    expect(auth.currentUser()).toBeNull();
    expect(auth.profileState().status).toBe('loading');
    expect(get).toHaveBeenCalledTimes(2);
    finish(response());
    await Promise.all([first, second]);
    expect(auth.currentUser()).toEqual(user);
  });
  for (const status of [0, 403, 404, 500]) {
    it(`clears identity and allows retry after ${status}`, async () => {
      get.mockResolvedValueOnce(response());
      await auth.refreshCurrentUser();
      get.mockResolvedValueOnce(response(status, { message: 'private server detail' }));
      await auth.refreshCurrentUser();
      expect(auth.currentUser()).toBeNull();
      expect(auth.profileState().status).toBe('error');
      expect(auth.profileState().message).not.toContain('private server detail');
      expect(auth.isUserLoggedIn()).toBe(true);
      get.mockResolvedValueOnce(response());
      await auth.refreshCurrentUser();
      expect(auth.currentUser()).toEqual(user);
    });
  }
  for (const body of [null, {}, { ...user, name: '' }, { ...user, email: 12 }]) {
    it(`rejects malformed identity ${JSON.stringify(body)}`, async () => {
      get.mockResolvedValue(response(200, body));
      await auth.refreshCurrentUser();
      expect(auth.currentUser()).toBeNull();
      expect(auth.profileState().status).toBe('error');
    });
  }
  it('clears an expired session', async () => {
    get.mockResolvedValue(response(401));
    await auth.refreshCurrentUser();
    expect(auth.currentUser()).toBeNull();
    expect(auth.accessToken()).toBeNull();
    expect(auth.isUserLoggedIn()).toBe(false);
  });
  for (const status of [200, 401]) {
    it(`ignores old-account ${status} after switching users`, async () => {
      let finish!: (result: unknown) => void;
      get.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      const old = auth.refreshCurrentUser();
      auth.login('new-token');
      expect(auth.currentUser()).toBeNull();
      const next = { id: 'user-2', name: 'Grace', email: 'grace@example.test' };
      get.mockResolvedValueOnce(response(200, next));
      await auth.refreshCurrentUser();
      finish(response(status));
      await old;
      expect(auth.currentUser()).toEqual(next);
      expect(auth.accessToken()).toBe('new-token');
      auth.logout();
      expect(auth.currentUser()).toBeNull();
    });
  }
  it('hides identity on cross-tab account replacement', async () => {
    get.mockResolvedValue(response());
    await auth.refreshCurrentUser();
    localStorage.setItem('accessToken', 'new-token');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
    expect(auth.currentUser()).toBeNull();
    expect(auth.isUserLoggedIn()).toBe(false);
  });
});
