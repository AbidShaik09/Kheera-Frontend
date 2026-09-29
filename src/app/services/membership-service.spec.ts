import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { MembershipService } from './membership-service';
const space = '11111111-1111-1111-1111-111111111111';
const member = '22222222-2222-2222-2222-222222222222';
const role = '33333333-3333-3333-3333-333333333333';
const user = '44444444-4444-4444-4444-444444444444';
const item = {
  id: member,
  user: { id: user, name: 'Alex', email: 'alex@example.test' },
  role: { id: role, name: 'Member' },
};
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  body,
});
describe('Membership service', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  let service: MembershipService;
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    TestBed.inject(AuthService).login('membership');
    service = TestBed.inject(MembershipService);
  });
  afterEach(() => localStorage.clear());
  it('requests scoped paginated search and sorting', async () => {
    api.get.mockResolvedValue(
      reply({ items: [item], page: 2, size: 25, totalItems: 51, totalPages: 3 }),
    );
    expect((await service.members(space, 2, 'Alex', 'role,desc'))!.data!.items).toEqual([item]);
    const [path, params] = api.get.mock.calls[0];
    expect(path).toBe(`spaces/${space}/members`);
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('25');
    expect(params.get('q')).toBe('Alex');
    expect(params.get('sort')).toBe('role,desc');
  });
  it('loads every catalogue page', async () => {
    const roles = Array.from({ length: 100 }, (_, i) => ({
      id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      name: `Role ${i}`,
    }));
    api.get
      .mockResolvedValueOnce(
        reply({ items: roles, page: 0, size: 100, totalItems: 101, totalPages: 2 }),
      )
      .mockResolvedValueOnce(
        reply({ items: [item.role], page: 1, size: 100, totalItems: 101, totalPages: 2 }),
      );
    expect((await service.catalogue(space, 'roles'))!.data!).toHaveLength(101);
    expect(api.get.mock.calls[1][1].get('page')).toBe('1');
  });
  it('uses membership IDs for edits/deletion and trims account email', async () => {
    api.post.mockResolvedValue(reply(item, 201));
    api.patch.mockResolvedValue(reply(item));
    api.delete.mockResolvedValue(reply(null, 204));
    expect((await service.add(space, ' alex@example.test ', role))!.ok).toBe(true);
    await service.changeRole(space, member, role);
    expect((await service.remove(space, member))!.ok).toBe(true);
    expect(api.post).toHaveBeenCalledWith(`spaces/${space}/members`, {
      email: 'alex@example.test',
      roleId: role,
    });
    expect(api.patch).toHaveBeenCalledWith(`spaces/${space}/members/${member}`, { roleId: role });
    expect(api.delete).toHaveBeenCalledWith(`spaces/${space}/members/${member}`);
  });
  it('rejects invalid scope and malformed pages without exposing data', async () => {
    expect((await service.members('wrong'))!.ok).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
    api.get.mockResolvedValue(
      reply({ items: [item], page: 0, size: 25, totalItems: 1, totalPages: 99 }),
    );
    expect((await service.members(space))!.ok).toBe(false);
  });
  it.each(['DUPLICATE_MEMBERSHIP', 'LAST_ADMINISTRATOR'])(
    'preserves actionable %s conflicts',
    async (code) => {
      api.post.mockResolvedValue(reply({ code }, 409));
      expect((await service.add(space, 'alex@example.test', role))!.code).toBe(code);
    },
  );
  it('ignores responses belonging to a previous session', async () => {
    let resolve!: (value: unknown) => void;
    api.get.mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = service.members(space);
    TestBed.inject(AuthService).logout();
    resolve(reply({ items: [item], page: 0, size: 25, totalItems: 1, totalPages: 1 }));
    expect(await pending).toBeNull();
  });
  it('logs out on unauthorized reads and rejects invalid search bounds', async () => {
    expect((await service.members(space, 0, 'x'.repeat(101)))!.ok).toBe(false);
    expect((await service.members(space, -1))!.ok).toBe(false);
    expect((await service.members(space, 0, '', 'password,asc'))!.ok).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
    api.get.mockResolvedValue(reply({}, 401));
    expect(await service.members(space)).toBeNull();
    expect(TestBed.inject(AuthService).isUserLoggedIn()).toBe(false);
  });
  it('rejects mismatched membership responses and partial catalogues', async () => {
    api.patch.mockResolvedValue(reply({ ...item, id: user }));
    expect((await service.changeRole(space, member, role))!.ok).toBe(false);
    api.get.mockResolvedValue(
      reply({ items: [item.role], page: 0, size: 100, totalItems: 101, totalPages: 2 }),
    );
    expect((await service.catalogue(space, 'roles'))!.ok).toBe(false);
  });
});
