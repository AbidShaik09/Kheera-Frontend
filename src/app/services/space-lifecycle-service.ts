import { inject, Injectable } from '@angular/core';
import { ApiResponse, ApiService } from './api-service';
import { AuthService } from './auth-service';
import { isSpaceDetail, isUuid, SpaceDetail } from './space-detail-service';
export interface SpaceDraft {
  name: string;
  description: string;
  profilePic: string;
}
export type FieldErrors = Partial<Record<keyof SpaceDraft, string>>;
export type SpacePayload = {
  name?: string;
  description?: string | null;
  profilePic?: string | null;
};
export interface SpaceResult {
  ok: boolean;
  status: number;
  space: SpaceDetail | null;
  message: string;
  fieldErrors: FieldErrors;
}
export function validateSpace(draft: SpaceDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name.trim() || [...draft.name.trim()].length > 255)
    errors.name = 'Enter a name of 1–255 characters.';
  if ([...draft.description].length > 500) errors.description = 'Use at most 500 characters.';
  if (draft.profilePic) {
    let valid = false;
    try {
      const url = new URL(draft.profilePic);
      valid =
        /^https?:\/\//i.test(draft.profilePic) &&
        !/[\s\\]/u.test(draft.profilePic) &&
        !/^https?:\/\/[^/?#]*@/i.test(draft.profilePic) &&
        !!url.hostname &&
        !url.username &&
        !url.password;
    } catch {
      /* Invalid URL is reported inline. */
    }
    if (!valid || [...draft.profilePic].length > 255)
      errors.profilePic =
        'Use an absolute HTTP(S) URL without credentials, at most 255 characters.';
  }
  return errors;
}
export function spacePayload(draft: SpaceDraft, original?: SpaceDetail): SpacePayload {
  const values = {
    name: draft.name.trim(),
    description: draft.description || null,
    profilePic: draft.profilePic || null,
  };
  const payload: SpacePayload = {};
  if (!original || values.name !== original.name) payload.name = values.name;
  for (const key of ['description', 'profilePic'] as const) {
    if (original ? draft[key] !== (original[key] ?? '') : values[key] !== null)
      payload[key] = values[key];
  }
  return payload;
}
@Injectable({ providedIn: 'root' })
export class SpaceLifecycleService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  read(id: string): Promise<SpaceResult | null> {
    return this.request('get', id);
  }
  create(draft: SpaceDraft): Promise<SpaceResult | null> {
    return this.request('post', undefined, spacePayload(draft));
  }
  update(id: string, draft: SpaceDraft, original: SpaceDetail): Promise<SpaceResult | null> {
    return this.request('patch', id, spacePayload(draft, original));
  }
  remove(id: string): Promise<SpaceResult | null> {
    return this.request('delete', id);
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    id?: string,
    payload?: SpacePayload,
  ): Promise<SpaceResult | null> {
    const epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    if (!token || !this.auth.isUserLoggedIn()) return null;
    if (id !== undefined && !isUuid(id))
      return {
        ok: false,
        status: 404,
        space: null,
        message: 'This space is unavailable.',
        fieldErrors: {},
      };
    const path = id === undefined ? 'spaces' : `spaces/${id}`;
    let response: ApiResponse<unknown>;
    if (method === 'post' || method === 'patch')
      response = await this.api[method]<unknown>(path, payload);
    else response = await this.api[method]<unknown>(path);
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
    const responseId = id ?? (body && typeof body === 'object' && 'id' in body ? body.id : null);
    const space = isUuid(responseId) && isSpaceDetail(body, responseId) ? body : null;
    if (response.ok && (method === 'delete' ? response.status === 204 : !!space))
      return { ok: true, status: response.status, space, message: '', fieldErrors: {} };
    const fieldErrors: FieldErrors = {};
    if (
      body &&
      typeof body === 'object' &&
      'fieldErrors' in body &&
      body.fieldErrors &&
      typeof body.fieldErrors === 'object'
    ) {
      for (const key of ['name', 'description', 'profilePic'] as const) {
        const value = (body.fieldErrors as Record<string, unknown>)[key];
        if (typeof value === 'string') fieldErrors[key] = value;
      }
    }
    return {
      ok: false,
      status: response.status,
      space: null,
      fieldErrors,
      message:
        response.status === 403
          ? 'You do not have permission to perform this action.'
          : response.status === 404
            ? 'This space is unavailable. It may have been deleted or your access has changed.'
            : Object.keys(fieldErrors).length
              ? 'Check the highlighted fields.'
              : 'Unable to complete this request. Please try again.',
    };
  }
}
