import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { WorkflowStage, isStage } from './workflow-stage-service';
import { ApiService } from './api-service';
import { AuthService } from './auth-service';
import { isUuid } from './space-detail-service';
export interface BoardTask {
  id: string;
  projectId: string;
  title: string;
  stageId: string;
  stageName: string;
  complete: boolean;
  position: number;
}
export interface BoardPage {
  items: BoardTask[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  groups: { stage: WorkflowStage; items: BoardTask[] }[];
}
export interface BoardResult {
  ok: boolean;
  status: number;
  data: BoardPage | null;
  message: string;
}
function isTask(value: unknown, project: string): value is BoardTask {
  if (!value || typeof value !== 'object') return false;
  const t = value as BoardTask;
  return (
    isUuid(t.id) &&
    t.projectId === project &&
    typeof t.title === 'string' &&
    !!t.title.trim() &&
    isUuid(t.stageId) &&
    typeof t.stageName === 'string' &&
    typeof t.complete === 'boolean' &&
    Number.isSafeInteger(t.position) &&
    t.position >= 0
  );
}
function isPage(value: unknown, project: string, page: number): value is BoardPage {
  if (!value || typeof value !== 'object') return false;
  const p = value as BoardPage;
  if (
    p.page !== page ||
    p.size !== 25 ||
    !Number.isSafeInteger(p.totalItems) ||
    p.totalItems < 0 ||
    p.totalPages !== Math.ceil(p.totalItems / 25) ||
    !Array.isArray(p.items) ||
    p.items.length > 25 ||
    p.items.length > p.totalItems ||
    !p.items.every((t) => isTask(t, project)) ||
    new Set(p.items.map((t) => t.id)).size !== p.items.length ||
    !Array.isArray(p.groups) ||
    p.groups.length > 100
  )
    return false;
  const grouped: string[] = [];
  const stageIds = new Set<string>();
  for (const [i, g] of p.groups.entries()) {
    if (
      !g ||
      !isStage(g.stage) ||
      stageIds.has(g.stage.id) ||
      (i > 0 && g.stage.position <= p.groups[i - 1].stage.position) ||
      !Array.isArray(g.items)
    )
      return false;
    stageIds.add(g.stage.id);
    for (const t of g.items) {
      if (
        !isTask(t, project) ||
        t.stageId !== g.stage.id ||
        t.stageName !== g.stage.name ||
        t.complete !== g.stage.complete
      )
        return false;
      const item = p.items.find((item) => item.id === t.id);
      if (!item || (Object.keys(t) as (keyof BoardTask)[]).some((key) => item[key] !== t[key]))
        return false;
      grouped.push(t.id);
    }
  }
  return grouped.length === p.items.length && new Set(grouped).size === grouped.length;
}
@Injectable({ providedIn: 'root' })
export class ProjectBoardService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private error(status: number): BoardResult {
    return {
      ok: false,
      status,
      data: null,
      message:
        status === 403
          ? 'You do not have permission to access or move these tasks. Refresh to check your access.'
          : status === 404
            ? 'This project or task is unavailable. Refresh to try again.'
            : 'Unable to load or move tasks. Refresh or try again.',
    };
  }
  private context() {
    const epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    return () =>
      !!token &&
      this.auth.isUserLoggedIn() &&
      epoch === this.auth.sessionEpoch() &&
      token === this.auth.accessToken();
  }
  async read(project: string, page = 0): Promise<BoardResult | null> {
    if (!isUuid(project) || !Number.isInteger(page) || page < 0 || page > 2147483647)
      return this.error(404);
    const current = this.context();
    if (!current()) return null;
    const response = await this.api.get<unknown>(
      `projects/${project}/work-items`,
      new HttpParams().set('groupBy', 'stage').set('page', page).set('size', 25),
    );
    if (!current()) return null;
    if (response.status === 401) {
      this.auth.logout();
      return null;
    }
    return response.ok && isPage(response.body, project, page)
      ? { ok: true, status: response.status, data: response.body, message: '' }
      : this.error(response.status);
  }
  async move(task: BoardTask, stageId: string): Promise<BoardResult | null> {
    if (!isUuid(task.id) || !isUuid(task.projectId) || !isUuid(stageId)) return this.error(404);
    const current = this.context();
    if (!current()) return null;
    const response = await this.api.post<unknown>(`work-items/${task.id}/move`, { stageId });
    if (!current()) return null;
    if (response.status === 401) {
      this.auth.logout();
      return null;
    }
    return response.ok &&
      isTask(response.body, task.projectId) &&
      response.body.id === task.id &&
      response.body.stageId === stageId
      ? { ok: true, status: response.status, data: null, message: '' }
      : this.error(response.status);
  }
}
