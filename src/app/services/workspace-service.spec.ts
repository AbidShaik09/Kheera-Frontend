import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { WorkspaceService } from './workspace-service';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';

const SPACE = { id: '00000000-0000-4000-8000-000000000001', name: 'Engineering' };
const reply = (body: unknown, status = 200) => ({ ok: status === 200, status, body });
function deferred() {
  let resolve!: (value: ReturnType<typeof reply>) => void;
  const promise = new Promise<ReturnType<typeof reply>>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let api: { get: ReturnType<typeof vi.fn> };
  let auth: {
    isUserLoggedIn: ReturnType<typeof signal<boolean>>;
    sessionEpoch: ReturnType<typeof signal<number>>;
    accessToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    api = { get: vi.fn() };
    auth = {
      isUserLoggedIn: signal(true),
      sessionEpoch: signal(1),
      accessToken: vi.fn(() => 'token-one'),
      logout: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
    service = TestBed.inject(WorkspaceService);
  });

  it('loads the real array through the service and exposes loading', async () => {
    const pending = deferred();
    api.get.mockReturnValue(pending.promise);
    const load = service.refresh();
    expect(service.state().status).toBe('loading');
    pending.resolve(reply([SPACE]));
    await load;
    expect(api.get).toHaveBeenCalledWith('spaces');
    expect(service.state()).toEqual({ status: 'ready', spaces: [SPACE], message: null });
  });
  it('treats an empty array as a genuine empty workspace', async () => {
    api.get.mockResolvedValue(reply([]));
    await service.refresh();
    expect(service.state()).toEqual({ status: 'ready', spaces: [], message: null });
  });
  it('rejects malformed response data instead of exposing misleading spaces', async () => {
    api.get.mockResolvedValue(reply({ items: [SPACE] }));
    await service.refresh();
    expect(service.state().status).toBe('error');
    expect(service.state().spaces).toEqual([]);
  });
  it('rejects invalid space identifiers', async () => {
    api.get.mockResolvedValue(reply([{ id: '../elsewhere', name: 'Bad' }]));
    await service.refresh();
    expect(service.state().status).toBe('error');
  });
  it.each([403, 404, 500, 0])(
    'clears stale spaces on HTTP %s and supports retry',
    async (status) => {
      api.get
        .mockResolvedValueOnce(reply([SPACE]))
        .mockResolvedValueOnce(reply(null, status))
        .mockResolvedValueOnce(reply([]));
      await service.refresh();
      await service.refresh();
      expect(service.state().status).toBe('error');
      expect(service.state().spaces).toEqual([]);
      await service.refresh();
      expect(service.state().status).toBe('ready');
    },
  );
  it('expires the session on 401', async () => {
    api.get.mockResolvedValue(reply(null, 401));
    await service.refresh();
    expect(auth.logout).toHaveBeenCalledOnce();
    expect(service.state().spaces).toEqual([]);
  });
  it('latest refresh wins when requests finish out of order', async () => {
    const first = deferred();
    const second = deferred();
    api.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = service.refresh();
    const latest = service.refresh();
    second.resolve(reply([]));
    await latest;
    first.resolve(reply([SPACE]));
    await old;
    expect(service.state().spaces).toEqual([]);
    expect(service.state().status).toBe('ready');
  });
  it('hides loaded spaces synchronously on logout', async () => {
    api.get.mockResolvedValue(reply([SPACE]));
    await service.refresh();
    auth.isUserLoggedIn.set(false);
    expect(service.state().spaces).toEqual([]);
  });
  it('hides prior-account spaces and ignores its late unauthorized response', async () => {
    const pending = deferred();
    api.get.mockReturnValue(pending.promise);
    const old = service.refresh();
    auth.sessionEpoch.update((n) => n + 1);
    auth.accessToken.mockReturnValue('token-two');
    pending.resolve(reply(null, 401));
    await old;
    expect(auth.logout).not.toHaveBeenCalled();
    expect(service.state().spaces).toEqual([]);
  });
  it('does not issue requests when signed out', async () => {
    auth.isUserLoggedIn.set(false);
    await service.refresh();
    expect(api.get).not.toHaveBeenCalled();
  });
});
