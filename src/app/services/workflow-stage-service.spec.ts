import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { WorkflowStageService, validateStage, stagePayload } from './workflow-stage-service';
const project = '11111111-1111-4111-8111-111111111111';
const stage = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Shipped',
  icon: 'check',
  position: 0,
  complete: true,
};
const draft = { name: ' Shipped ', icon: '', position: '0', complete: true };
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  body,
});
describe('Workflow stage contract', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  let service: WorkflowStageService;
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    TestBed.inject(AuthService).login('workflow-tests');
    service = TestBed.inject(WorkflowStageService);
  });
  afterEach(() => localStorage.clear());
  it('trims names, clears icons with empty string, preserves omitted PATCH fields and completion', () => {
    expect(stagePayload(draft, stage)).toEqual({ icon: '' });
    expect(stagePayload({ ...draft, name: 'Released', icon: 'check' }, stage)).toEqual({
      name: 'Released',
    });
    expect(stagePayload({ ...draft, position: '', complete: false })).toEqual({
      name: 'Shipped',
      icon: '',
      complete: false,
    });
  });
  it('validates backend UTF-16 name and icon limits', () => {
    expect(validateStage({ ...draft, name: '😀'.repeat(50), icon: 'x'.repeat(255) })).toEqual({});
    expect(validateStage({ ...draft, name: '😀'.repeat(51) }).name).toBeTruthy();
    expect(validateStage({ ...draft, name: '  ', icon: 'x'.repeat(256) })).toMatchObject({
      name: expect.any(String),
      icon: expect.any(String),
    });
  });
  it.each(['-1', '1.1', '1e2', '2147483648', 'NaN'])(
    'rejects invalid position %s without sending',
    async (position) => {
      expect(
        (await service.save(project, { ...draft, position }))?.fieldErrors.position,
      ).toBeTruthy();
      expect(api.post).not.toHaveBeenCalled();
    },
  );
  it('retains server ordering and completed custom names', async () => {
    api.get.mockResolvedValue(
      reply([
        { ...stage, position: 3 },
        { ...stage, id: project, name: 'Queued', position: 5, complete: false },
      ]),
    );
    expect((await service.list(project))?.stages.map((s) => [s.name, s.complete])).toEqual([
      ['Shipped', true],
      ['Queued', false],
    ]);
  });
  it.each([
    { body: [stage, stage] },
    { body: [{ ...stage, complete: 'true' }] },
    { body: [{ ...stage, position: -1 }] },
  ])('rejects malformed or duplicated list %j', async ({ body }) => {
    api.get.mockResolvedValue(reply(body));
    expect((await service.list(project))?.ok).toBe(false);
  });
  it('uses scoped UUIDs, sparse PATCH and exact delete status', async () => {
    api.patch.mockResolvedValue(reply({ ...stage, icon: '' }));
    expect((await service.save(project, draft, stage))?.ok).toBe(true);
    expect(api.patch).toHaveBeenCalledWith(`projects/${project}/workflow-stages/${stage.id}`, {
      icon: '',
    });
    api.delete.mockResolvedValue(reply(null, 200));
    expect((await service.remove(project, stage.id))?.ok).toBe(false);
    api.delete.mockResolvedValue(reply(null, 204));
    expect((await service.remove(project, stage.id))?.ok).toBe(true);
  });
  it('rejects mismatched returned stage and invalid identifiers', async () => {
    api.patch.mockResolvedValue(reply({ ...stage, id: project }));
    expect((await service.save(project, draft, stage))?.ok).toBe(false);
    expect((await service.list('bad'))?.status).toBe(404);
    expect(api.get).not.toHaveBeenCalled();
  });
  it.each(['STAGE_NOT_EMPTY', 'LAST_STAGE', 'STAGE_LIMIT'])(
    'explains conflict %s without exposing arbitrary server text',
    async (code) => {
      api.delete.mockResolvedValue(reply({ code, message: 'internal secret' }, 409));
      const result = await service.remove(project, stage.id);
      expect(result?.status).toBe(409);
      expect(result?.message).toMatch(/tasks|one stage|100 stages/);
      expect(result?.message).not.toContain('secret');
    },
  );
  it('expires only the current session and ignores old-account responses', async () => {
    let resolve!: (value: unknown) => void;
    api.get.mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = service.list(project);
    TestBed.inject(AuthService).login('new-account');
    resolve(reply(null, 401));
    expect(await pending).toBeNull();
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(true);
    api.get.mockResolvedValue(reply(null, 401));
    expect(await service.list(project)).toBeNull();
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(false);
  });
});
