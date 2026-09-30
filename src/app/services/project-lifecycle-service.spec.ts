import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { PROJECT, SPACE } from '../testing/space-fixtures';
import {
  ProjectLifecycleService,
  projectPayload,
  validateProject,
} from './project-lifecycle-service';
const draft = { name: '  Project  ', description: '', sprintCycleDays: '7' };
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  body,
});
describe('Project lifecycle', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  let service: ProjectLifecycleService;
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    TestBed.inject(AuthService).login('project-tests');
    service = TestBed.inject(ProjectLifecycleService);
  });
  afterEach(() => localStorage.clear());
  it('creates trimmed metadata and omits blank optional/default values', () => {
    expect(projectPayload(draft)).toEqual({ name: 'Project', sprintCycleDays: 7 });
    expect(projectPayload({ ...draft, sprintCycleDays: '' })).toEqual({ name: 'Project' });
  });
  it('patches changed fields only and never reparents or sends server metrics', () => {
    expect(projectPayload({ ...draft, name: PROJECT.name }, PROJECT)).toEqual({
      description: null,
    });
    expect(
      projectPayload({ ...draft, name: PROJECT.name, description: PROJECT.description! }, PROJECT),
    ).toEqual({});
    expect(
      projectPayload({ ...draft, name: PROJECT.name }, { ...PROJECT, description: '' }),
    ).toEqual({});
  });
  it('validates Unicode limits and allows unchanged legacy null cycle', () => {
    expect(validateProject({ ...draft, name: '😀'.repeat(255) })).toEqual({});
    expect(validateProject({ ...draft, name: '😀'.repeat(256) }).name).toBeTruthy();
    expect(validateProject({ ...draft, name: '  ' }).name).toBeTruthy();
    expect(validateProject({ ...draft, description: '😀'.repeat(501) }).description).toBeTruthy();
    expect(
      validateProject({ ...draft, sprintCycleDays: '' }, { ...PROJECT, sprintCycleDays: null }),
    ).toEqual({});
  });
  it.each(['0', '-1', '1.5', 'abc', '2147483648', '1e2', ''])(
    'rejects invalid edited cycle %s',
    (sprintCycleDays) => {
      expect(validateProject({ ...draft, sprintCycleDays }, PROJECT).sprintCycleDays).toBeTruthy();
    },
  );
  it('uses space-scoped creation and exact project UUID for update/delete', async () => {
    api.post.mockResolvedValue(reply(PROJECT, 201));
    api.patch.mockResolvedValue(reply(PROJECT));
    api.delete.mockResolvedValue(reply(null, 204));
    expect((await service.create(SPACE.id, draft))?.project?.id).toBe(PROJECT.id);
    expect(api.post).toHaveBeenCalledWith(`spaces/${SPACE.id}/projects`, {
      name: 'Project',
      sprintCycleDays: 7,
    });
    await service.update(PROJECT, { ...draft, name: PROJECT.name });
    expect(api.patch).toHaveBeenCalledWith(`projects/${PROJECT.id}`, { description: null });
    expect((await service.remove(PROJECT.id))?.ok).toBe(true);
  });
  it('rejects wrong project/space response identities and malformed deletions', async () => {
    api.post.mockResolvedValue(reply({ ...PROJECT, spaceId: PROJECT.id }, 201));
    expect((await service.create(SPACE.id, draft))?.ok).toBe(false);
    api.get.mockResolvedValue(reply({ ...PROJECT, id: SPACE.id }));
    expect((await service.read(PROJECT.id))?.ok).toBe(false);
    api.delete.mockResolvedValue(reply(null, 200));
    expect((await service.remove(PROJECT.id))?.ok).toBe(false);
  });
  it('validates IDs/drafts before issuing mutations', async () => {
    expect((await service.create('wrong', draft))?.ok).toBe(false);
    expect((await service.update(PROJECT, { ...draft, name: '' }))?.fieldErrors.name).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
  it.each([400, 403, 404, 500])(
    'returns safe actionable failure %s with named field errors',
    async (status) => {
      api.patch.mockResolvedValue(
        reply(
          {
            fieldErrors: {
              name: 'Name rejected',
              sprintCycleDays: 'Invalid cycle',
              internal: 'secret',
            },
            message: 'internal stack',
          },
          status,
        ),
      );
      const result = await service.update(PROJECT, draft);
      expect(result?.ok).toBe(false);
      expect(result?.fieldErrors).toEqual({
        name: 'Name rejected',
        sprintCycleDays: 'Invalid cycle',
      });
      expect(result?.message).not.toContain('internal');
    },
  );
  it('logs out on current 401 and ignores old-session responses', async () => {
    api.get.mockResolvedValue(reply({}, 401));
    expect(await service.read(PROJECT.id)).toBeNull();
    const auth = TestBed.inject(AuthService);
    expect(auth.isUserLoggedIn()).toBe(false);
    auth.login('second');
    let resolve!: (value: unknown) => void;
    api.get.mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = service.read(PROJECT.id);
    auth.login('third');
    resolve(reply(PROJECT));
    expect(await pending).toBeNull();
  });
});
