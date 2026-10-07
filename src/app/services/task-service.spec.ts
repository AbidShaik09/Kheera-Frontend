import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { TaskService, taskDraft, taskPayload, validateTask } from './task-service';
import { TASK, MEMBER } from '../testing/task-fixtures';
import { PROJECT, SPACE } from '../testing/space-fixtures';
const reply = (body: unknown, status = 200) => ({
  body,
  status,
  ok: status >= 200 && status < 300,
});
describe('Task contract', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  let service: TaskService;
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    TestBed.inject(AuthService).login('task-tests');
    service = TestBed.inject(TaskService);
  });
  afterEach(() => localStorage.clear());
  it('keeps original instant precision and sends only changed fields or explicit clearing', () => {
    const draft = taskDraft(TASK);
    expect(draft.title).toBe(TASK.title);
    expect(taskPayload(draft, TASK)).toEqual({});
    expect(
      taskPayload(
        { ...draft, description: '', parentId: '', assigneeMemberId: '', plannedStartDate: '' },
        TASK,
      ),
    ).toEqual({ description: null, assigneeMemberId: null, plannedStartDate: null });
    expect(taskPayload({ ...draft, title: '  Changed  ' }, TASK)).toEqual({ title: 'Changed' });
  });
  it('validates Unicode lengths, nonnegative integer effort, hierarchy and date ranges', () => {
    const draft = taskDraft(TASK);
    expect(validateTask({ ...draft, title: '😀'.repeat(255) }, TASK)).toEqual({});
    expect(validateTask({ ...draft, title: '😀'.repeat(256) }, TASK).title).toBeTruthy();
    for (const efforts of ['-1', '1.5', '2147483648', ''])
      expect(validateTask({ ...draft, efforts }, TASK).efforts).toBeTruthy();
    expect(validateTask({ ...draft, parentId: TASK.id }, TASK).parentId).toBeTruthy();
    expect(
      validateTask({ ...draft, plannedEndDate: '2026-10-06T10:00' }, TASK).plannedEndDate,
    ).toBeTruthy();
    expect(
      validateTask({ ...draft, description: '😀'.repeat(501) }, TASK).description,
    ).toBeTruthy();
  });
  it('uses scoped CRUD with membership UUID and a 204 delete', async () => {
    api.get.mockResolvedValue(reply(TASK));
    api.post.mockResolvedValue(reply(TASK, 201));
    api.patch.mockResolvedValue(reply(TASK));
    api.delete.mockResolvedValue(reply(null, 204));
    expect((await service.read(TASK.id))?.data).toEqual(TASK);
    await service.create(PROJECT.id, {
      ...taskDraft(),
      title: ' New ',
      assigneeMemberId: MEMBER.id,
    });
    expect(api.post).toHaveBeenCalledWith(`projects/${PROJECT.id}/work-items`, {
      title: 'New',
      efforts: 1,
      assigneeMemberId: MEMBER.id,
    });
    await service.update(TASK, { ...taskDraft(TASK), description: '' });
    expect(api.patch).toHaveBeenCalledWith(`work-items/${TASK.id}`, { description: null });
    expect((await service.remove(TASK.id))?.ok).toBe(true);
  });
  it('rejects mismatched response identity, malformed data and wrong delete status', async () => {
    for (const body of [
      { ...TASK, id: SPACE.id },
      { ...TASK, efforts: -1 },
      { ...TASK, assigneeActive: 'true' },
      { ...TASK, plannedStartDate: 'invalid' },
    ]) {
      api.get.mockResolvedValue(reply(body));
      expect((await service.read(TASK.id))?.ok).toBe(false);
    }
    api.delete.mockResolvedValue(reply(null));
    expect((await service.remove(TASK.id))?.ok).toBe(false);
  });
  it('preserves server validation and the child deletion conflict', async () => {
    api.patch.mockResolvedValue(reply({ fieldErrors: { parentId: 'Cycle rejected' } }, 400));
    expect((await service.update(TASK, taskDraft(TASK)))?.fieldErrors.parentId).toBe(
      'Cycle rejected',
    );
    api.delete.mockResolvedValue(reply({ code: 'TASK_HAS_CHILDREN' }, 409));
    expect((await service.remove(TASK.id))?.message).toContain('children');
  });
  it('ignores an old account response including 401 and expires a current session', async () => {
    let finish!: (r: ReturnType<typeof reply>) => void;
    api.get.mockReturnValue(new Promise((r) => (finish = r)));
    const pending = service.read(TASK.id);
    TestBed.inject(AuthService).login('replacement');
    finish(reply({}, 401));
    expect(await pending).toBeNull();
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(true);
    api.get.mockResolvedValue(reply({}, 401));
    await service.read(TASK.id);
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(false);
  });
  it('loads scoped type and related task pages and rejects malformed pages', async () => {
    api.get.mockResolvedValue(reply([{ id: TASK.typeId, name: 'Task', icon: null }]));
    expect((await service.types(PROJECT.id))?.ok).toBe(true);
    api.get.mockResolvedValue(
      reply({ items: [TASK], page: 0, size: 25, totalItems: 1, totalPages: 1 }),
    );
    expect((await service.list(PROJECT.id, 0, 'literal%', TASK.id))?.data?.items).toEqual([TASK]);
    const params = api.get.mock.calls.at(-1)![1];
    expect(params.get('parentId')).toBe(TASK.id);
    expect(params.get('q')).toBe('literal%');
    api.get.mockResolvedValue(
      reply({
        items: [{ ...TASK, projectId: SPACE.id }],
        page: 0,
        size: 25,
        totalItems: 1,
        totalPages: 1,
      }),
    );
    expect((await service.list(PROJECT.id))?.ok).toBe(false);
    api.get.mockClear();
    expect((await service.list(PROJECT.id, 100001))?.ok).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });
  it('preserves inactive and missing historical metadata without reassigning on a title edit', async () => {
    const historical = { ...TASK, typeId: null, typeName: null, assigneeActive: false };
    api.get.mockResolvedValue(reply(historical));
    expect((await service.read(TASK.id))?.data).toEqual(historical);
    expect(
      taskPayload({ ...taskDraft(historical), title: 'Historical title' }, historical),
    ).toEqual({ title: 'Historical title' });
  });
  it('reads nullable historical effort and preserves it on unrelated edits', async () => {
    const historical = { ...TASK, efforts: null };
    api.get.mockResolvedValue(reply(historical));
    expect((await service.read(TASK.id))?.data).toEqual(historical);
    expect(taskDraft(historical).efforts).toBe('');
    expect(validateTask(taskDraft(historical), historical)).toEqual({});
    expect(taskPayload({ ...taskDraft(historical), title: 'Updated' }, historical)).toEqual({
      title: 'Updated',
    });
  });
  it('converts edited UTC dates and validates both date ranges and invalid calendar input', () => {
    const draft = taskDraft(TASK);
    expect(taskPayload({ ...draft, actualStartDate: '2026-10-07T10:00' }, TASK)).toEqual({
      actualStartDate: '2026-10-07T10:00:00.000Z',
    });
    expect(
      validateTask(
        { ...draft, actualStartDate: '2026-10-08T10:00', actualEndDate: '2026-10-07T10:00' },
        TASK,
      ).actualEndDate,
    ).toBeTruthy();
    expect(
      validateTask({ ...draft, plannedStartDate: '2026-02-30T10:00' }, TASK).plannedStartDate,
    ).toBeTruthy();
  });
});
