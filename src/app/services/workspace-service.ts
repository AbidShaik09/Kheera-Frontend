import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
export interface SpaceSummary {
  id: string;
  name: string;
}
export interface WorkspaceState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  spaces: SpaceSummary[];
  message: string | null;
}
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private request = 0;
  private readonly snapshot = signal<{ epoch: number; value: WorkspaceState }>({
    epoch: -1,
    value: { status: 'idle', spaces: [], message: null },
  });
  readonly state = computed<WorkspaceState>(() => {
    const snapshot = this.snapshot();
    return this.auth.isUserLoggedIn() && snapshot.epoch === this.auth.sessionEpoch()
      ? snapshot.value
      : { status: 'idle', spaces: [], message: null };
  });

  async refresh(): Promise<void> {
    const request = ++this.request;
    const epoch = this.auth.sessionEpoch();
    const token = this.auth.accessToken();
    const publish = (value: WorkspaceState) => this.snapshot.set({ epoch, value });
    if (!this.auth.isUserLoggedIn() || !token) {
      publish({ status: 'idle', spaces: [], message: null });
      return;
    }
    // Clear old data while revalidating. A response belongs to one request and session only.
    publish({ status: 'loading', spaces: [], message: null });
    const result = await this.api.get<unknown>('spaces');
    if (
      request !== this.request ||
      epoch !== this.auth.sessionEpoch() ||
      token !== this.auth.accessToken() ||
      !this.auth.isUserLoggedIn()
    )
      return;
    if (result.status === 401) {
      publish({ status: 'idle', spaces: [], message: null });
      this.auth.logout();
      return;
    }
    if (result.ok && isSpaceList(result.body)) {
      publish({ status: 'ready', spaces: result.body, message: null });
      return;
    }
    const message =
      result.status === 403 || result.status === 404
        ? 'Your spaces are unavailable. Refresh to check your access.'
        : 'Unable to load spaces. Please try again.';
    publish({ status: 'error', spaces: [], message });
  }
}

function isSpaceList(body: unknown): body is SpaceSummary[] {
  if (!Array.isArray(body)) return false;
  const ids = new Set<string>();
  return body.every((space) => {
    if (
      !space ||
      typeof space.id !== 'string' ||
      typeof space.name !== 'string' ||
      !space.name.trim() ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(space.id) ||
      ids.has(space.id)
    )
      return false;
    ids.add(space.id);
    return true;
  });
}
