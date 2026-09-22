import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';

export interface SpaceDetail {
  id: string;
  name: string;
  description: string | null;
  profilePic: string | null;
  createdAt: string;
  updatedAt: string;
  capabilities: { canUpdate: boolean; canDelete: boolean; canManageMembers: boolean };
}
export interface ProjectSummary {
  id: string;
  spaceId: string;
  name: string;
  description: string | null;
  sprintCycleDays: number | null;
  progressPercent: number;
  openTaskCount: number;
  updatedAt: string;
}
export interface ProjectPage {
  items: ProjectSummary[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
export interface ReadState<T> {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
  data: T | null;
  message: string | null;
}
const idle = <T>(): ReadState<T> => ({ status: 'idle', data: null, message: null });
interface SpaceState {
  spaceId: string | null;
  page: number;
  detail: ReadState<SpaceDetail>;
  projects: ReadState<ProjectPage>;
}
const empty = (): SpaceState => ({ spaceId: null, page: 0, detail: idle(), projects: idle() });
@Injectable()
export class SpaceDetailService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private generation = 0;
  private readonly snapshot = signal({ epoch: -1, value: empty() });
  readonly state = computed(() =>
    this.auth.isUserLoggedIn() && this.snapshot().epoch === this.auth.sessionEpoch()
      ? this.snapshot().value
      : empty(),
  );
  clear(): void {
    ++this.generation;
    this.snapshot.set({ epoch: -1, value: empty() });
  }
  async load(spaceId: string, page: number): Promise<void> {
    const generation = ++this.generation,
      epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    const current = () =>
      generation === this.generation &&
      epoch === this.auth.sessionEpoch() &&
      token === this.auth.accessToken() &&
      this.auth.isUserLoggedIn();
    const publish = (patch: Partial<SpaceState>) => {
      if (current()) this.snapshot.update((s) => ({ epoch, value: { ...s.value, ...patch } }));
    };
    this.snapshot.set({ epoch, value: { ...empty(), spaceId, page } });
    if (!this.auth.isUserLoggedIn() || !token) return;
    if (!isUuid(spaceId)) {
      publish({ detail: failure('This space is unavailable.', true) });
      return;
    }
    if (!Number.isSafeInteger(page) || page < 0 || page > 100000) {
      publish({ detail: failure('Invalid project page. Return to the first page.') });
      return;
    }
    publish({
      detail: { status: 'loading', data: null, message: null },
      projects: { status: 'loading', data: null, message: null },
    });
    let metadataRequest = 0;
    const metadata = async () => {
      const request = ++metadataRequest;
      const result = await this.api.get<SpaceDetail>(`spaces/${spaceId}`);
      if (!current() || request !== metadataRequest) return;
      if (result.status === 401) {
        this.auth.logout();
        return;
      }
      if (result.ok && isSpaceDetail(result.body, spaceId)) {
        publish({ detail: { status: 'ready', data: result.body, message: null } });
      } else {
        publish({
          detail: failure(
            result.status === 403 || result.status === 404
              ? 'This space is unavailable. It may have been removed or your access may have changed.'
              : 'Unable to load this space. Please try again.',
            result.status === 403 || result.status === 404,
          ),
          projects: idle(),
        });
      }
    };
    const projects = async () => {
      const params = new HttpParams().set('page', page).set('size', 12).set('sort', 'name,asc');
      const result = await this.api.get<ProjectPage>(`spaces/${spaceId}/projects`, params);
      if (!current()) return;
      if (result.status === 401) {
        this.auth.logout();
        return;
      }
      if (result.status === 403 || result.status === 404) await metadata();
      if (!current() || ['error', 'unavailable'].includes(this.state().detail.status)) return;
      publish({
        projects:
          result.ok && isProjectPage(result.body, spaceId, page)
            ? { status: 'ready', data: result.body, message: null }
            : failure('Projects are unavailable. Refresh to try again.'),
      });
    };
    await Promise.all([metadata(), projects()]);
  }
}
export function failure<T>(message: string, unavailable = false): ReadState<T> {
  return { status: unavailable ? 'unavailable' : 'error', data: null, message };
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const nullableText = (value: unknown) => value === null || typeof value === 'string';
const timestamp = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
export function isSpaceDetail(value: unknown, id: string): value is SpaceDetail {
  if (
    !object(value) ||
    value['id'] !== id ||
    !text(value['name']) ||
    !nullableText(value['description']) ||
    !nullableText(value['profilePic']) ||
    !timestamp(value['createdAt']) ||
    !timestamp(value['updatedAt'])
  )
    return false;
  const caps = value['capabilities'];
  return (
    object(caps) &&
    ['canUpdate', 'canDelete', 'canManageMembers'].every((key) => typeof caps[key] === 'boolean')
  );
}
export function isProjectSummary(value: unknown): value is ProjectSummary {
  if (!object(value)) return false;
  return (
    isUuid(value['id']) &&
    isUuid(value['spaceId']) &&
    text(value['name']) &&
    nullableText(value['description']) &&
    (value['sprintCycleDays'] === null ||
      (Number.isInteger(value['sprintCycleDays']) && Number(value['sprintCycleDays']) > 0)) &&
    Number.isInteger(value['progressPercent']) &&
    Number(value['progressPercent']) >= 0 &&
    Number(value['progressPercent']) <= 100 &&
    Number.isSafeInteger(value['openTaskCount']) &&
    Number(value['openTaskCount']) >= 0 &&
    timestamp(value['updatedAt'])
  );
}
export function isProjectPage(value: unknown, spaceId: string, page: number): value is ProjectPage {
  if (
    !object(value) ||
    value['page'] !== page ||
    value['size'] !== 12 ||
    !Number.isSafeInteger(value['totalItems']) ||
    Number(value['totalItems']) < 0 ||
    value['totalPages'] !== Math.ceil(Number(value['totalItems']) / 12) ||
    !Array.isArray(value['items'])
  )
    return false;
  const items = value['items'];
  return (
    items.length <= 12 &&
    items.length === Math.max(0, Math.min(12, Number(value['totalItems']) - page * 12)) &&
    items.every((item) => isProjectSummary(item) && item.spaceId === spaceId) &&
    new Set(items.map((item) => item.id)).size === items.length
  );
}
export function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
