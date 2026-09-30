import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiResponse, ApiService } from './api-service';
import { AuthService } from './auth-service';
import { isUuid, isSpaceDetail, SpaceDetail } from './space-detail-service';
export interface CatalogueItem {
  id: string;
  name: string;
}
export interface Membership {
  id: string;
  user: { id: string; name: string; email: string };
  role: CatalogueItem;
}
export interface MembershipPage<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
export interface MembershipResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
  code: string;
  fieldErrors: Record<string, string>;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const named = (v: unknown): v is CatalogueItem =>
  object(v) && isUuid(v['id']) && typeof v['name'] === 'string' && !!v['name'].trim();
const member = (v: unknown): v is Membership =>
  object(v) &&
  isUuid(v['id']) &&
  named(v['role']) &&
  object(v['user']) &&
  typeof v['user']['email'] === 'string' &&
  named(v['user']);
function pageIs<T extends { id: string }>(
  v: unknown,
  page: number,
  size: number,
  valid: (v: unknown) => v is T,
): v is MembershipPage<T> {
  if (
    !object(v) ||
    v['page'] !== page ||
    v['size'] !== size ||
    !Number.isSafeInteger(v['totalItems']) ||
    Number(v['totalItems']) < 0 ||
    v['totalPages'] !== Math.ceil(Number(v['totalItems']) / size) ||
    !Array.isArray(v['items'])
  )
    return false;
  return (
    v['items'].length === Math.max(0, Math.min(size, Number(v['totalItems']) - page * size)) &&
    v['items'].every(valid) &&
    new Set(v['items'].map((i) => i.id)).size === v['items'].length
  );
}
@Injectable({ providedIn: 'root' })
export class MembershipService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private invalid<T>(): MembershipResult<T> {
    return {
      ok: false,
      status: 400,
      data: null,
      message: 'Check the supplied values and try again.',
      code: '',
      fieldErrors: {},
    };
  }
  private async request<T>(
    call: () => Promise<ApiResponse<unknown>>,
    valid: (v: unknown) => v is T,
  ): Promise<MembershipResult<T> | null> {
    const epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    if (!token || !this.auth.isUserLoggedIn()) return null;
    const r = await call();
    if (
      epoch !== this.auth.sessionEpoch() ||
      token !== this.auth.accessToken() ||
      !this.auth.isUserLoggedIn()
    )
      return null;
    if (r.status === 401) {
      this.auth.logout();
      return null;
    }
    const body = object(r.body) ? r.body : {};
    const code = typeof body['code'] === 'string' ? body['code'] : '';
    const fieldErrors: Record<string, string> = {};
    if (object(body['fieldErrors']))
      for (const key of ['email', 'roleId', 'q']) {
        const value = body['fieldErrors'][key];
        if (typeof value === 'string') fieldErrors[key] = value;
      }
    const message =
      code === 'DUPLICATE_MEMBERSHIP'
        ? 'This user already belongs to this space.'
        : code === 'LAST_ADMINISTRATOR'
          ? 'At least one active administrator must remain.'
          : r.status === 403
            ? 'You do not have permission for this action or role.'
            : r.status === 404
              ? 'The account, membership, role or space is unavailable. Check the details and refresh.'
              : 'Unable to complete this request. Please try again.';
    return {
      ok: r.ok && valid(r.body),
      status: r.status,
      data: r.ok && valid(r.body) ? r.body : null,
      message,
      code,
      fieldErrors,
    };
  }
  detail(spaceId: string) {
    return isUuid(spaceId)
      ? this.request(
          () => this.api.get(`spaces/${spaceId}`),
          (v): v is SpaceDetail => isSpaceDetail(v, spaceId),
        )
      : Promise.resolve(this.invalid<SpaceDetail>());
  }
  members(spaceId: string, page = 0, q = '', sort = 'name,asc') {
    if (
      !isUuid(spaceId) ||
      !Number.isSafeInteger(page) ||
      page < 0 ||
      page > 100000 ||
      q.length > 100 ||
      !/^(name|email|role|createdAt|updatedAt),(asc|desc)$/.test(sort)
    )
      return Promise.resolve(this.invalid<MembershipPage<Membership>>());
    return this.request(
      () =>
        this.api.get(
          `spaces/${spaceId}/members`,
          new HttpParams().set('page', page).set('size', 25).set('q', q).set('sort', sort),
        ),
      (v): v is MembershipPage<Membership> => pageIs(v, page, 25, member),
    );
  }
  async catalogue(
    spaceId: string,
    kind: 'roles' | 'permissions',
  ): Promise<MembershipResult<CatalogueItem[]> | null> {
    if (!isUuid(spaceId)) return this.invalid();
    const epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    const items: CatalogueItem[] = [];
    for (let page = 0; page <= 100000; page++) {
      if (epoch !== this.auth.sessionEpoch() || token !== this.auth.accessToken()) return null;
      const r = await this.request(
        () =>
          this.api.get(
            `spaces/${spaceId}/${kind}`,
            new HttpParams().set('page', page).set('size', 100),
          ),
        (v): v is MembershipPage<CatalogueItem> => pageIs(v, page, 100, named),
      );
      if (!r) return null;
      if (!r.ok || !r.data) return { ...r, data: null };
      items.push(...r.data.items);
      if (new Set(items.map((i) => i.id)).size !== items.length) return this.invalid();
      if (page + 1 >= r.data.totalPages) return { ...r, data: items };
    }
    return this.invalid();
  }
  add(spaceId: string, email: string, roleId: string) {
    if (!isUuid(spaceId) || !isUuid(roleId) || !email.trim() || email.trim().length > 255)
      return Promise.resolve(this.invalid<Membership>());
    return this.request(
      () => this.api.post(`spaces/${spaceId}/members`, { email: email.trim(), roleId }),
      member,
    );
  }
  changeRole(spaceId: string, memberId: string, roleId: string) {
    if (![spaceId, memberId, roleId].every(isUuid))
      return Promise.resolve(this.invalid<Membership>());
    return this.request(
      () => this.api.patch(`spaces/${spaceId}/members/${memberId}`, { roleId }),
      (v): v is Membership => member(v) && v.id === memberId,
    );
  }
  remove(spaceId: string, memberId: string) {
    if (![spaceId, memberId].every(isUuid)) return Promise.resolve(this.invalid<null>());
    return this.request(
      async () => {
        const r = await this.api.delete(`spaces/${spaceId}/members/${memberId}`);
        return { ...r, ok: r.ok && r.status === 204 };
      },
      (v): v is null => v === null,
    );
  }
}
