import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { ProjectBoardService } from './project-board-service';
import { PROJECT } from '../testing/space-fixtures';
import { boardPage, task, STAGES } from '../testing/board-fixtures';
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  body,
});
describe('Project board API', () => {
  const api = { get: vi.fn(), post: vi.fn() };
  let service: ProjectBoardService;
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    TestBed.inject(AuthService).login('board');
    service = TestBed.inject(ProjectBoardService);
  });
  afterEach(() => localStorage.clear());
  it('requests grouped pages of 25 and preserves global totals, empty groups and custom completion', async () => {
    const data = boardPage([task(25, STAGES[1])], 1, 26);
    api.get.mockResolvedValue(reply(data));
    expect((await service.read(PROJECT.id, 1))?.data).toEqual(data);
    const [path, params] = api.get.mock.calls[0];
    expect(path).toBe(`projects/${PROJECT.id}/work-items`);
    expect(params.get('groupBy')).toBe('stage');
    expect(params.get('page')).toBe('1');
    expect(params.get('size')).toBe('25');
  });
  it('accepts a genuinely empty board', async () => {
    api.get.mockResolvedValue(reply(boardPage([])));
    expect((await service.read(PROJECT.id))?.data?.totalItems).toBe(0);
  });
  it.each([
    { data: { ...boardPage(), totalPages: 99 } },
    { data: boardPage([task(), task()]) },
    { data: boardPage([{ ...task(), projectId: STAGES[0].id }]) },
    { data: { ...boardPage(), groups: [] } },
    {
      data: {
        ...boardPage(),
        groups: [{ stage: STAGES[0], items: [{ ...task(), title: 'Wrong' }] }],
      },
    },
  ])('rejects inconsistent page shape $data', async ({ data }) => {
    api.get.mockResolvedValue(reply(data));
    expect((await service.read(PROJECT.id))?.ok).toBe(false);
  });
  it('appends same or cross-column moves, never transmitting a visible page index', async () => {
    for (const stage of STAGES.slice(0, 2)) {
      api.post.mockResolvedValue(
        reply({ ...task(), stageId: stage.id, stageName: stage.name, complete: stage.complete }),
      );
      expect((await service.move(task(), stage.id))?.ok).toBe(true);
      expect(api.post).toHaveBeenLastCalledWith(`work-items/${task().id}/move`, {
        stageId: stage.id,
      });
    }
  });
  it('rejects a wrong returned task or destination', async () => {
    api.post.mockResolvedValue(reply(task(2)));
    expect((await service.move(task(), STAGES[1].id))?.ok).toBe(false);
  });
  it('rejects invalid identifiers and page numbers without HTTP', async () => {
    expect((await service.read('bad'))?.ok).toBe(false);
    expect((await service.read(PROJECT.id, -1))?.ok).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });
  it.each([400, 403, 404, 409, 500])('exposes safe error status %s', async (status) => {
    api.post.mockResolvedValue(reply({ message: 'secret internals' }, status));
    const result = await service.move(task(), STAGES[1].id);
    expect(result?.status).toBe(status);
    expect(result?.message).not.toContain('secret');
  });
  it('ignores replaced-session responses and expires the current session', async () => {
    let resolve!: (v: unknown) => void;
    api.get.mockReturnValue(new Promise((r) => (resolve = r)));
    const p = service.read(PROJECT.id);
    TestBed.inject(AuthService).login('new');
    resolve(reply(null, 401));
    expect(await p).toBeNull();
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(true);
    api.get.mockResolvedValue(reply(null, 401));
    await service.read(PROJECT.id);
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(false);
  });
});
