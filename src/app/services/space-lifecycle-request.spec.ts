import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { SpaceLifecycleService } from './space-lifecycle-service';
import { SPACE } from '../testing/space-fixtures';
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  body,
});
describe('Space lifecycle requests', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  let service: SpaceLifecycleService, auth: AuthService;
  beforeEach(() => {
    localStorage.clear();
    Object.values(api).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    auth = TestBed.inject(AuthService);
    auth.login('lifecycle');
    service = TestBed.inject(SpaceLifecycleService);
  });
  afterEach(() => localStorage.clear());
  it('uses returned UUID and sends sparse create and update payloads', async () => {
    api.post.mockResolvedValue(reply(SPACE, 201));
    api.patch.mockResolvedValue(reply(SPACE));
    expect(
      (await service.create({ name: '  Engineering ', description: '', profilePic: '' }))?.space
        ?.id,
    ).toBe(SPACE.id);
    expect(api.post).toHaveBeenCalledWith('spaces', { name: 'Engineering' });
    await service.update(SPACE.id, { name: SPACE.name, description: '', profilePic: '' }, SPACE);
    expect(api.patch).toHaveBeenCalledWith('spaces/' + SPACE.id, { description: null });
  });
  it('requires a valid response and accepts bodyless 204 deletion', async () => {
    api.post.mockResolvedValue(reply({ id: 'invalid' }, 201));
    expect((await service.create({ name: 'New', description: '', profilePic: '' }))?.ok).toBe(
      false,
    );
    api.delete.mockResolvedValue(reply(null, 204));
    expect((await service.remove(SPACE.id))?.ok).toBe(true);
    api.delete.mockResolvedValue(reply(null, 200));
    expect((await service.remove(SPACE.id))?.ok).toBe(false);
  });
  it.each([400, 403, 404, 500])(
    'preserves named field errors for %s without exposing unrelated server data',
    async (status) => {
      api.patch.mockResolvedValue(
        reply(
          {
            fieldErrors: { name: 'Name is unavailable.', description: 'Too long.' },
            message: 'internal stack detail',
          },
          status,
        ),
      );
      const result = await service.update(
        SPACE.id,
        { name: 'Updated', description: '', profilePic: '' },
        SPACE,
      );
      expect(result?.status).toBe(status);
      expect(result?.fieldErrors.name).toBe('Name is unavailable.');
      expect(result?.message).not.toContain('internal stack');
    },
  );
  it('logs out for a current 401', async () => {
    api.delete.mockResolvedValue(reply({}, 401));
    expect(await service.remove(SPACE.id)).toBeNull();
    expect(auth.isUserLoggedIn()).toBe(false);
  });
  it.each([200, 401])('ignores old-session %s responses', async (status) => {
    let resolve!: (value: unknown) => void;
    api.get.mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = service.read(SPACE.id);
    auth.logout();
    auth.login('replacement');
    resolve(reply(SPACE, status));
    expect(await pending).toBeNull();
    expect(auth.isUserLoggedIn()).toBe(true);
  });
  it('does not request malformed IDs', async () => {
    expect((await service.read('bad'))?.status).toBe(404);
    expect(api.get).not.toHaveBeenCalled();
  });
});
