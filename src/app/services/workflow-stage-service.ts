import { inject, Injectable } from '@angular/core';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { isUuid } from './space-detail-service';
export interface WorkflowStage {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  complete: boolean;
}
export interface StageDraft {
  name: string;
  icon: string;
  position: string;
  complete: boolean;
}
export type StageErrors = Partial<Record<keyof StageDraft, string>>;
export type StagePayload = Partial<{
  name: string;
  icon: string;
  position: number;
  complete: boolean;
}>;
export interface StageResult {
  ok: boolean;
  status: number;
  stages: WorkflowStage[];
  stage: WorkflowStage | null;
  message: string;
  fieldErrors: StageErrors;
}
export function validateStage(draft: StageDraft): StageErrors {
  const errors: StageErrors = {};
  if (!draft.name.trim() || draft.name.trim().length > 100)
    errors.name = 'Enter a name of 1–100 characters.';
  if (draft.icon.length > 255) errors.icon = 'Use at most 255 characters.';
  if (
    draft.position !== '' &&
    (!/^\d+$/.test(draft.position) || Number(draft.position) > 2147483647)
  )
    errors.position = 'Use a whole number from 0 to 2147483647.';
  return errors;
}
export function stagePayload(draft: StageDraft, original?: WorkflowStage): StagePayload {
  const payload: StagePayload = {};
  if (!original || draft.name.trim() !== original.name) payload.name = draft.name.trim();
  if (!original || draft.icon !== (original.icon ?? '')) payload.icon = draft.icon;
  if (!original || draft.complete !== original.complete) payload.complete = draft.complete;
  if (draft.position !== '' && (!original || Number(draft.position) !== original.position))
    payload.position = Number(draft.position);
  return payload;
}
export function isStage(value: unknown): value is WorkflowStage {
  if (!value || typeof value !== 'object') return false;
  const s = value as WorkflowStage;
  return (
    isUuid(s.id) &&
    typeof s.name === 'string' &&
    !!s.name.trim() &&
    s.name.length <= 100 &&
    (s.icon === null || (typeof s.icon === 'string' && s.icon.length <= 255)) &&
    Number.isInteger(s.position) &&
    s.position >= 0 &&
    s.position <= 2147483647 &&
    typeof s.complete === 'boolean'
  );
}
@Injectable({ providedIn: 'root' })
export class WorkflowStageService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  list(projectId: string) {
    return this.request('get', projectId);
  }
  save(projectId: string, draft: StageDraft, original?: WorkflowStage) {
    const errors = validateStage(draft);
    return Object.keys(errors).length
      ? Promise.resolve(this.failure(400, '', errors))
      : this.request(
          original ? 'patch' : 'post',
          projectId,
          original?.id,
          stagePayload(draft, original),
        );
  }
  remove(projectId: string, stageId: string) {
    return this.request('delete', projectId, stageId);
  }
  private failure(status: number, code = '', fieldErrors: StageErrors = {}): StageResult {
    const conflicts: Record<string, string> = {
      STAGE_NOT_EMPTY: 'Move all active tasks out of this stage before deleting it.',
      LAST_STAGE: 'Keep at least one stage in this project.',
      STAGE_LIMIT: 'A project can have at most 100 stages. Remove an unused stage first.',
    };
    return {
      ok: false,
      status,
      stages: [],
      stage: null,
      fieldErrors,
      message:
        status === 409
          ? (conflicts[code] ?? 'The workflow changed. Review the refreshed stages and try again.')
          : status === 403
            ? 'You do not have permission to change this workflow. Refresh to check your access.'
            : status === 404
              ? 'This project or stage is unavailable. Refresh to check your access.'
              : Object.keys(fieldErrors).length
                ? 'Check the highlighted fields.'
                : 'Unable to load or change the workflow. Please try again.',
    };
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    projectId: string,
    stageId?: string,
    payload?: StagePayload,
  ): Promise<StageResult | null> {
    const epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    if (!token || !this.auth.isUserLoggedIn()) return null;
    if (!isUuid(projectId) || (stageId !== undefined && !isUuid(stageId))) return this.failure(404);
    const path = `projects/${projectId}/workflow-stages${stageId ? '/' + stageId : ''}`;
    const response =
      method === 'patch' || method === 'post'
        ? await this.api[method]<unknown>(path, payload)
        : await this.api[method]<unknown>(path);
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
    const list =
      Array.isArray(body) &&
      body.length <= 100 &&
      body.every(isStage) &&
      new Set(body.map((s) => s.id)).size === body.length &&
      body.every((s, i) => i === 0 || s.position > body[i - 1].position)
        ? body
        : null;
    const stage = isStage(body) && (!stageId || body.id === stageId) ? body : null;
    if (
      response.ok &&
      (method === 'get' ? !!list : method === 'delete' ? response.status === 204 : !!stage)
    )
      return {
        ok: true,
        status: response.status,
        stages: list ?? [],
        stage,
        message: '',
        fieldErrors: {},
      };
    const error = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const fieldErrors: StageErrors = {};
    if (error['fieldErrors'] && typeof error['fieldErrors'] === 'object') {
      for (const key of ['name', 'icon', 'position', 'complete'] as const) {
        const value = (error['fieldErrors'] as Record<string, unknown>)[key];
        if (typeof value === 'string') fieldErrors[key] = value;
      }
    }
    return this.failure(
      response.status,
      typeof error['code'] === 'string' ? error['code'] : '',
      fieldErrors,
    );
  }
}
