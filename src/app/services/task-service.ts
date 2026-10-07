import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiResponse, ApiService } from './api-service';
import { AuthService } from './auth-service';
import { isUuid } from './space-detail-service';
import { BoardTask } from './project-board-service';
export const dateFields = [
  'plannedStartDate',
  'plannedEndDate',
  'actualStartDate',
  'actualEndDate',
] as const;
export interface TaskDetail extends BoardTask {
  spaceId: string;
  description: string | null;
  efforts: number | null;
  typeId: string | null;
  typeName: string | null;
  parentId: string | null;
  assigneeMemberId: string | null;
  assigneeName: string | null;
  assigneeActive: boolean;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface TaskDraft {
  title: string;
  description: string;
  efforts: string;
  typeId: string;
  stageId: string;
  parentId: string;
  assigneeMemberId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
}
export type TaskErrors = Partial<Record<keyof TaskDraft, string>>;
export type TaskPayload = Partial<Record<keyof TaskDraft, string | number | null>>;
export interface TaskType {
  id: string;
  name: string;
  icon: string | null;
}
export interface TaskPage {
  items: BoardTask[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
export interface TaskResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
  fieldErrors: TaskErrors;
}
export function taskDraft(task?: TaskDetail): TaskDraft {
  const draft: TaskDraft = {
    title: task?.title ?? '',
    description: task?.description ?? '',
    efforts: task ? (task.efforts === null ? '' : String(task.efforts)) : '1',
    typeId: task?.typeId ?? '',
    stageId: task?.stageId ?? '',
    parentId: task?.parentId ?? '',
    assigneeMemberId: task?.assigneeMemberId ?? '',
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
  };
  for (const key of dateFields)
    draft[key] = task?.[key] ? new Date(task[key]!).toISOString().slice(0, 23) : '';
  return draft;
}
function instant(value: string): string | null {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value) ||
    value.startsWith('0000')
  )
    return null;
  const date = new Date(value + 'Z');
  if (!Number.isFinite(date.getTime())) return null;
  const canonical = date.toISOString();
  return canonical.slice(0, 16) === value.slice(0, 16) ? canonical : null;
}
export function validateTask(draft: TaskDraft, original?: TaskDetail): TaskErrors {
  const errors: TaskErrors = {};
  if (!draft.title.trim() || [...draft.title.trim()].length > 255)
    errors.title = 'Enter a title of 1–255 characters.';
  if ([...draft.description].length > 500) errors.description = 'Use at most 500 characters.';
  if (
    !(original?.efforts === null && draft.efforts === '') &&
    (!/^\d+$/.test(draft.efforts) || Number(draft.efforts) > 2147483647)
  )
    errors.efforts = 'Use a whole number from 0 to 2147483647.';
  for (const key of ['typeId', 'stageId', 'parentId', 'assigneeMemberId'] as const)
    if (draft[key] && !isUuid(draft[key])) errors[key] = 'Choose a valid item.';
  if (original && draft.parentId === original.id)
    errors.parentId = 'A task cannot be its own parent.';
  // Historical missing types may remain unchanged; new writes use active project choices.
  if (original?.typeId && !draft.typeId) errors.typeId = 'Choose a task type.';
  if (original && !draft.stageId) errors.stageId = 'Choose a stage.';
  for (const key of dateFields)
    if (draft[key] && !instant(draft[key])) errors[key] = 'Enter a valid date and time.';
  for (const [start, end] of [
    ['plannedStartDate', 'plannedEndDate'],
    ['actualStartDate', 'actualEndDate'],
  ] as const)
    if (draft[start] && draft[end] && instant(draft[start])! > instant(draft[end])!)
      errors[end] = 'End must not precede start.';
  return errors;
}
export function taskPayload(draft: TaskDraft, original?: TaskDetail): TaskPayload {
  const payload: TaskPayload = {},
    previous = original ? taskDraft(original) : null;
  for (const key of Object.keys(draft) as (keyof TaskDraft)[]) {
    const value = key === 'title' ? draft[key].trim() : draft[key];
    if (previous && value === previous[key]) continue;
    if (key === 'efforts') payload[key] = Number(value);
    else if (dateFields.includes(key as (typeof dateFields)[number])) {
      if (value || original) payload[key] = value ? instant(value) : null;
    } else if (key === 'typeId' || key === 'stageId') {
      if (value) payload[key] = value;
    } else if (key === 'title' || value || original) payload[key] = value || null;
  }
  return payload;
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const nullableId = (v: unknown) => v === null || isUuid(v);
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const date = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
function boardTask(v: unknown, project?: string): v is BoardTask {
  return (
    record(v) &&
    isUuid(v['id']) &&
    isUuid(v['projectId']) &&
    (!project || v['projectId'] === project) &&
    typeof v['title'] === 'string' &&
    !!v['title'].trim() &&
    isUuid(v['stageId']) &&
    typeof v['stageName'] === 'string' &&
    typeof v['complete'] === 'boolean' &&
    Number.isSafeInteger(v['position']) &&
    Number(v['position']) >= 0
  );
}
export function isTaskDetail(v: unknown): v is TaskDetail {
  if (!boardTask(v) || !record(v)) return false;
  return (
    isUuid(v['spaceId']) &&
    nullableText(v['description']) &&
    (v['efforts'] === null ||
      (Number.isInteger(v['efforts']) &&
        Number(v['efforts']) >= 0 &&
        Number(v['efforts']) <= 2147483647)) &&
    nullableId(v['typeId']) &&
    nullableText(v['typeName']) &&
    nullableId(v['parentId']) &&
    nullableId(v['assigneeMemberId']) &&
    nullableText(v['assigneeName']) &&
    typeof v['assigneeActive'] === 'boolean' &&
    dateFields.every((k) => v[k] === null || date(v[k])) &&
    date(v['createdAt']) &&
    date(v['updatedAt'])
  );
}
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private failure<T>(status: number, fieldErrors: TaskErrors = {}, code = ''): TaskResult<T> {
    return {
      ok: false,
      status,
      data: null,
      fieldErrors,
      message:
        code === 'TASK_HAS_CHILDREN'
          ? 'Remove or reparent active children before deleting this task.'
          : status === 403
            ? 'You no longer have permission to access or edit this task.'
            : status === 404
              ? 'This task or project is unavailable.'
              : Object.keys(fieldErrors).length
                ? 'Check the highlighted fields.'
                : 'Unable to complete this request. Please try again.',
    };
  }
  private async request<T>(
    call: () => Promise<ApiResponse<unknown>>,
    valid: (v: unknown) => v is T,
    expected = 200,
  ): Promise<TaskResult<T> | null> {
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
    if (r.ok && r.status === expected && valid(r.body))
      return { ok: true, status: r.status, data: r.body, message: '', fieldErrors: {} };
    const body = record(r.body) ? r.body : {},
      errors: TaskErrors = {};
    if (record(body['fieldErrors']))
      for (const key of Object.keys(taskDraft()) as (keyof TaskDraft)[]) {
        const value = body['fieldErrors'][key];
        if (typeof value === 'string') errors[key] = value;
      }
    return this.failure(r.status, errors, typeof body['code'] === 'string' ? body['code'] : '');
  }
  read(id: string) {
    return isUuid(id)
      ? this.request(
          () => this.api.get(`work-items/${id}`),
          (v): v is TaskDetail => isTaskDetail(v) && v.id === id,
        )
      : Promise.resolve(this.failure<TaskDetail>(404));
  }
  create(project: string, draft: TaskDraft) {
    const errors = validateTask(draft);
    if (Object.keys(errors).length) return Promise.resolve(this.failure<TaskDetail>(400, errors));
    return isUuid(project)
      ? this.request(
          () => this.api.post(`projects/${project}/work-items`, taskPayload(draft)),
          (v): v is TaskDetail => isTaskDetail(v) && v.projectId === project,
          201,
        )
      : Promise.resolve(this.failure<TaskDetail>(404));
  }
  update(task: TaskDetail, draft: TaskDraft) {
    const errors = validateTask(draft, task);
    if (Object.keys(errors).length) return Promise.resolve(this.failure<TaskDetail>(400, errors));
    return this.request(
      () => this.api.patch(`work-items/${task.id}`, taskPayload(draft, task)),
      (v): v is TaskDetail =>
        isTaskDetail(v) &&
        v.id === task.id &&
        v.projectId === task.projectId &&
        v.spaceId === task.spaceId,
    );
  }
  remove(id: string) {
    return isUuid(id)
      ? this.request(
          () => this.api.delete(`work-items/${id}`),
          (v): v is null => v === null,
          204,
        )
      : Promise.resolve(this.failure<null>(404));
  }
  types(project: string) {
    return isUuid(project)
      ? this.request(
          () => this.api.get(`projects/${project}/work-item-types`),
          (v): v is TaskType[] =>
            Array.isArray(v) &&
            v.every(
              (t) =>
                record(t) &&
                isUuid(t['id']) &&
                typeof t['name'] === 'string' &&
                !!t['name'].trim() &&
                nullableText(t['icon']),
            ) &&
            new Set(v.map((t) => t.id)).size === v.length,
        )
      : Promise.resolve(this.failure<TaskType[]>(404));
  }
  list(project: string, page = 0, q = '', parentId?: string) {
    if (
      !isUuid(project) ||
      !Number.isInteger(page) ||
      page < 0 ||
      page > 100000 ||
      [...q].length > 100 ||
      (parentId !== undefined && !isUuid(parentId))
    )
      return Promise.resolve(this.failure<TaskPage>(400));
    let params = new HttpParams().set('page', page).set('size', 25).set('q', q);
    if (parentId) params = params.set('parentId', parentId);
    return this.request(
      () => this.api.get(`projects/${project}/work-items`, params),
      (v): v is TaskPage =>
        record(v) &&
        v['page'] === page &&
        v['size'] === 25 &&
        Number.isSafeInteger(v['totalItems']) &&
        Number(v['totalItems']) >= 0 &&
        v['totalPages'] === Math.ceil(Number(v['totalItems']) / 25) &&
        Array.isArray(v['items']) &&
        v['items'].length === Math.max(0, Math.min(25, Number(v['totalItems']) - page * 25)) &&
        v['items'].every((t) => boardTask(t, project)) &&
        new Set(v['items'].map((t) => t.id)).size === v['items'].length,
    );
  }
}
