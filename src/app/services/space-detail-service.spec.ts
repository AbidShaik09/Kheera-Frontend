import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth-service';
import { ApiService } from './api-service';
import { SpaceDetailService } from './space-detail-service';
import { SPACE, PROJECT, projectPage } from '../testing/space-fixtures';
const reply = (body: unknown, status = 200) => ({ ok: status === 200, status, body });
const deferred = () => {
  let resolve!: (v: ReturnType<typeof reply>) => void;
  const promise = new Promise<ReturnType<typeof reply>>((r) => (resolve = r));
  return { promise, resolve };
};
describe('SpaceDetailService', () => {
  let service: SpaceDetailService;
  let auth: AuthService;
  const get = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    get.mockReset();
    TestBed.configureTestingModule({
      providers: [SpaceDetailService, { provide: ApiService, useValue: { get } }],
    });
    auth = TestBed.inject(AuthService);
    auth.login('space-test-token');
    service = TestBed.inject(SpaceDetailService);
    get.mockImplementation((path: string) =>
      Promise.resolve(reply(path.endsWith('/projects') ? projectPage() : SPACE)),
    );
  });
  afterEach(() => localStorage.clear());
  it('loads independent metadata and typed paginated projects', async () => {
    await service.load(SPACE.id, 0);
    expect(service.state().detail.data).toEqual(SPACE);
    expect(service.state().projects.data?.items).toEqual([PROJECT]);
    expect(get.mock.calls[1][1].get('page')).toBe('0');
    expect(get.mock.calls[1][1].get('size')).toBe('12');
  });
  it('retains readable metadata while projects are pending or unavailable', async () => {
    const pending = deferred();
    get.mockImplementation((path: string) =>
      path.endsWith('/projects') ? pending.promise : Promise.resolve(reply(SPACE)),
    );
    const loading = service.load(SPACE.id, 0);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.state().detail.data?.name).toBe(SPACE.name);
    expect(service.state().projects.status).toBe('loading');
    pending.resolve(reply({}, 503));
    await loading;
    expect(service.state().detail.status).toBe('ready');
    expect(service.state().projects.status).toBe('error');
    expect(service.state().projects.data).toBeNull();
  });
  it('distinguishes zero projects from failure', async () => {
    get.mockImplementation((path: string) =>
      Promise.resolve(reply(path.endsWith('/projects') ? projectPage([]) : SPACE)),
    );
    await service.load(SPACE.id, 0);
    expect(service.state().projects.data?.totalItems).toBe(0);
  });
  it.each([0, 403, 404, 500])('clears metadata and descendants after detail %s', async (status) => {
    await service.load(SPACE.id, 0);
    get.mockResolvedValue(reply(null, status));
    await service.load(SPACE.id, 0);
    expect(service.state().detail.data).toBeNull();
    expect(service.state().projects.data).toBeNull();
  });
  it('revalidates space after project 404 and clears descendants if access was lost', async () => {
    let reads = 0;
    get.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('/projects')
          ? reply(null, 404)
          : ++reads === 1
            ? reply(SPACE)
            : reply(null, 404),
      ),
    );
    await service.load(SPACE.id, 0);
    expect(service.state().detail.status).toBe('unavailable');
    expect(service.state().projects.data).toBeNull();
  });
  it('project 404 with readable metadata remains a project error, not a zero count', async () => {
    get.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('/projects') ? reply(null, 404) : reply(SPACE)),
    );
    await service.load(SPACE.id, 0);
    expect(service.state().detail.data).toEqual(SPACE);
    expect(service.state().projects.status).toBe('error');
  });
  it.each([null, {}, { ...SPACE, id: PROJECT.id }, { ...SPACE, capabilities: {} }])(
    'rejects malformed/mismatched detail',
    async (body) => {
      get.mockResolvedValue(reply(body));
      await service.load(SPACE.id, 0);
      expect(service.state().detail.data).toBeNull();
    },
  );
  it.each([
    {},
    projectPage([{ ...PROJECT, spaceId: PROJECT.id }]),
    { ...projectPage(), totalItems: -1 },
    projectPage([{ ...PROJECT, progressPercent: 101 }]),
  ])('rejects invalid project pages', async (body) => {
    get.mockImplementation((path: string) =>
      Promise.resolve(reply(path.endsWith('/projects') ? body : SPACE)),
    );
    await service.load(SPACE.id, 0);
    expect(service.state().projects.status).toBe('error');
  });
  it('rejects invalid route IDs without sending requests', async () => {
    await service.load('../users', 0);
    expect(get).not.toHaveBeenCalled();
    expect(service.state().detail.status).toBe('unavailable');
  });
  it('ignores old-space responses after navigation', async () => {
    const old = deferred();
    get.mockReturnValue(old.promise);
    const load = service.load(SPACE.id, 0);
    service.clear();
    old.resolve(reply(SPACE));
    await load;
    expect(service.state().detail.data).toBeNull();
    expect(service.state().projects.data).toBeNull();
  });
  it('ignores an old session 401 and hides identity immediately on logout', async () => {
    await service.load(SPACE.id, 0);
    const old = deferred();
    get.mockReturnValue(old.promise);
    const loading = service.load(SPACE.id, 1);
    auth.login('replacement-token');
    expect(service.state().detail.data).toBeNull();
    old.resolve(reply(null, 401));
    await loading;
    expect(auth.accessToken()).toBe('replacement-token');
    auth.logout();
    expect(service.state().projects.data).toBeNull();
  });
  it('expires the current session on 401', async () => {
    get.mockResolvedValue(reply(null, 401));
    await service.load(SPACE.id, 0);
    expect(auth.isUserLoggedIn()).toBe(false);
  });
});
