import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import {
  failure,
  isProjectSummary,
  isUuid,
  ProjectSummary,
  ReadState,
} from './space-detail-service';
@Injectable()
export class ProjectSummaryService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private generation = 0;
  private readonly snapshot = signal<{ epoch: number; value: ReadState<ProjectSummary> }>({
    epoch: -1,
    value: { status: 'idle', data: null, message: null },
  });
  readonly state = computed<ReadState<ProjectSummary>>(() =>
    this.auth.isUserLoggedIn() && this.snapshot().epoch === this.auth.sessionEpoch()
      ? this.snapshot().value
      : { status: 'idle', data: null, message: null },
  );
  clear(): void {
    ++this.generation;
    this.snapshot.set({ epoch: -1, value: { status: 'idle', data: null, message: null } });
  }
  async load(id: string): Promise<void> {
    const generation = ++this.generation,
      epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    this.snapshot.set({ epoch, value: { status: 'loading', data: null, message: null } });
    if (!token || !this.auth.isUserLoggedIn()) return;
    if (!isUuid(id)) {
      this.snapshot.set({ epoch, value: failure('This project is unavailable.', true) });
      return;
    }
    const result = await this.api.get<ProjectSummary>(`projects/${id}`);
    if (
      generation !== this.generation ||
      epoch !== this.auth.sessionEpoch() ||
      token !== this.auth.accessToken() ||
      !this.auth.isUserLoggedIn()
    )
      return;
    if (result.status === 401) {
      this.auth.logout();
      return;
    }
    this.snapshot.set({
      epoch,
      value:
        result.ok && isProjectSummary(result.body) && result.body.id === id
          ? { status: 'ready', data: result.body, message: null }
          : failure(
              'This project is unavailable. Refresh to try again.',
              result.status === 403 || result.status === 404,
            ),
    });
  }
}
