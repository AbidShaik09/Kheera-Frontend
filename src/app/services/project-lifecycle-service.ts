import { inject, Injectable } from '@angular/core';
import { ApiResponse, ApiService } from './api-service';
import { AuthService } from './auth-service';
import { isProjectSummary, isUuid, ProjectSummary } from './space-detail-service';
export interface ProjectDraft {
  name: string;
  description: string;
  sprintCycleDays: string;
}
export type ProjectErrors = Partial<Record<keyof ProjectDraft, string>>;
export interface ProjectPayload {
  name?: string;
  description?: string | null;
  sprintCycleDays?: number;
}
export interface ProjectResult {
  ok: boolean;
  status: number;
  project: ProjectSummary | null;
  message: string;
  fieldErrors: ProjectErrors;
}
export function validateProject(draft: ProjectDraft, original?: ProjectSummary): ProjectErrors {
  const errors: ProjectErrors = {};
  if (!draft.name.trim() || [...draft.name.trim()].length > 255)
    errors.name = 'Enter a name of 1–255 characters.';
  if ([...draft.description].length > 500) errors.description = 'Use at most 500 characters.';
  const cycle = draft.sprintCycleDays;
  if (
    cycle === ''
      ? original?.sprintCycleDays != null
      : !/^\d+$/.test(cycle) || Number(cycle) < 1 || Number(cycle) > 2147483647
  )
    errors.sprintCycleDays = 'Use a whole number from 1 to 2147483647.';
  return errors;
}
export function projectPayload(draft: ProjectDraft, original?: ProjectSummary): ProjectPayload {
  const payload: ProjectPayload = {};
  if (!original || draft.name.trim() !== original.name) payload.name = draft.name.trim();
  if (original ? draft.description !== (original.description ?? '') : !!draft.description)
    payload.description = draft.description || null;
  if (
    draft.sprintCycleDays !== '' &&
    (!original || Number(draft.sprintCycleDays) !== original.sprintCycleDays)
  )
    payload.sprintCycleDays = Number(draft.sprintCycleDays);
  return payload;
}
@Injectable({ providedIn: 'root' })
export class ProjectLifecycleService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  read(id: string) {
    return this.request('get', id);
  }
  create(spaceId: string, draft: ProjectDraft) {
    const errors = validateProject(draft);
    return Object.keys(errors).length
      ? Promise.resolve(this.failure(400, errors))
      : this.request('post', spaceId, projectPayload(draft));
  }
  update(original: ProjectSummary, draft: ProjectDraft) {
    const errors = validateProject(draft, original);
    return Object.keys(errors).length
      ? Promise.resolve(this.failure(400, errors))
      : this.request('patch', original.id, projectPayload(draft, original), original.spaceId);
  }
  remove(id: string) {
    return this.request('delete', id);
  }
  private failure(status: number, fieldErrors: ProjectErrors = {}): ProjectResult {
    return {
      ok: false,
      status,
      project: null,
      fieldErrors,
      message:
        status === 403
          ? 'You do not have permission to perform this action.'
          : status === 404
            ? 'This project or space is unavailable. It may have been deleted or your access has changed.'
            : Object.keys(fieldErrors).length
              ? 'Check the highlighted fields.'
              : 'Unable to complete this request. Please try again.',
    };
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    id: string,
    payload?: ProjectPayload,
    spaceId?: string,
  ): Promise<ProjectResult | null> {
    const epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    if (!token || !this.auth.isUserLoggedIn()) return null;
    if (!isUuid(id) || (spaceId !== undefined && !isUuid(spaceId))) return this.failure(404);
    const path = method === 'post' ? `spaces/${id}/projects` : `projects/${id}`;
    const response: ApiResponse<unknown> =
      method === 'post' || method === 'patch'
        ? await this.api[method](path, payload)
        : await this.api[method](path);
    if (
      epoch !== this.auth.sessionEpoch() ||
      token !== this.auth.accessToken() ||
      !this.auth.isUserLoggedIn()
    )
      return null;
    if (response.status === 401) {
      this.auth.logout();
      return null;
    }
    const body = response.body;
    const project =
      isProjectSummary(body) &&
      (method === 'post' ? body.spaceId === id : body.id === id) &&
      (spaceId === undefined || body.spaceId === spaceId)
        ? body
        : null;
    if (response.ok && (method === 'delete' ? response.status === 204 : !!project))
      return { ok: true, status: response.status, project, message: '', fieldErrors: {} };
    const errors: ProjectErrors = {};
    if (
      body &&
      typeof body === 'object' &&
      'fieldErrors' in body &&
      body.fieldErrors &&
      typeof body.fieldErrors === 'object'
    ) {
      for (const key of ['name', 'description', 'sprintCycleDays'] as const) {
        const value = (body.fieldErrors as Record<string, unknown>)[key];
        if (typeof value === 'string') errors[key] = value;
      }
    }
    return this.failure(response.status, errors);
  }
}
