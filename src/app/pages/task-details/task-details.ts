import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import {
  TaskService,
  TaskDetail,
  TaskErrors,
  TaskPage,
  TaskType,
  taskDraft,
  taskPayload,
  validateTask,
  dateFields,
} from '../../services/task-service';
import { ProjectLifecycleService } from '../../services/project-lifecycle-service';
import { SpaceLifecycleService } from '../../services/space-lifecycle-service';
import { ProjectSummary, SpaceDetail, isUuid } from '../../services/space-detail-service';
import { WorkflowStage, WorkflowStageService } from '../../services/workflow-stage-service';
import { Membership, MembershipPage, MembershipService } from '../../services/membership-service';
import { WorkspaceService } from '../../services/workspace-service';
@Component({
  selector: 'app-task-details',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './task-details.html',
  styleUrls: ['../space-editor/space-editor.css', './task-details.css'],
})
export class TaskDetails {
  private readonly service = inject(TaskService);
  private readonly projects = inject(ProjectLifecycleService);
  private readonly spaces = inject(SpaceLifecycleService);
  private readonly workflow = inject(WorkflowStageService);
  private readonly people = inject(MembershipService);
  private readonly workspace = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly restoreDeleteFocus = signal(false);
  readonly task = signal<TaskDetail | null>(null);
  readonly project = signal<ProjectSummary | null>(null);
  readonly space = signal<SpaceDetail | null>(null);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly types = signal<TaskType[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly success = signal('');
  readonly errors = signal<TaskErrors>({});
  readonly confirming = signal(false);
  readonly parents = signal<TaskPage | null>(null);
  readonly children = signal<TaskPage | null>(null);
  readonly members = signal<MembershipPage<Membership> | null>(null);
  readonly relatedBusy = signal(false);
  readonly relatedMessage = signal('');
  readonly chosenParent = signal<{ id: string; title: string } | null>(null);
  readonly chosenMember = signal<Membership | null>(null);
  readonly dates = dateFields;
  readonly dateLabels = {
    plannedStartDate: 'Planned start',
    plannedEndDate: 'Planned end',
    actualStartDate: 'Actual start',
    actualEndDate: 'Actual end',
  };
  draft = taskDraft();
  parentSearch = '';
  memberSearch = '';
  private generation = 0;
  get id() {
    return this.params().get('workItemId');
  }
  get canEdit() {
    return !!this.space()?.capabilities.canUpdate && !this.loading() && !this.busy();
  }
  typesContainCurrent() {
    return this.types().some((t) => t.id === this.task()?.typeId);
  }
  constructor() {
    effect(() => {
      this.params();
      this.query();
      this.auth.sessionEpoch();
      const logged = this.auth.isUserLoggedIn();
      untracked(() => {
        this.clear();
        if (logged) void this.load();
      });
    });
    afterRenderEffect(() => {
      const cancel = this.cancelButton();
      if (cancel) cancel.nativeElement.focus();
      else if (this.restoreDeleteFocus()) {
        this.host.nativeElement.querySelector<HTMLButtonElement>('[data-delete]')?.focus();
        this.restoreDeleteFocus.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }
  private clear() {
    ++this.generation;
    this.task.set(null);
    this.project.set(null);
    this.space.set(null);
    this.stages.set([]);
    this.types.set([]);
    this.draft = taskDraft();
    this.loading.set(false);
    this.busy.set(false);
    this.message.set('');
    this.success.set('');
    this.errors.set({});
    this.confirming.set(false);
    this.parents.set(null);
    this.children.set(null);
    this.members.set(null);
    this.chosenParent.set(null);
    this.chosenMember.set(null);
    this.parentSearch = '';
    this.memberSearch = '';
    this.relatedBusy.set(false);
    this.relatedMessage.set('');
    this.restoreDeleteFocus.set(false);
  }
  private context() {
    const generation = this.generation,
      epoch = this.auth.sessionEpoch(),
      token = this.auth.accessToken();
    return () =>
      generation === this.generation &&
      epoch === this.auth.sessionEpoch() &&
      token === this.auth.accessToken() &&
      this.auth.isUserLoggedIn();
  }
  private failure(result: { status: number; message: string }) {
    this.loading.set(false);
    this.message.set(result.message);
    if (result.status === 403 || result.status === 404) {
      const message = result.message;
      this.clear();
      this.message.set(message);
      void this.workspace.refresh();
    }
  }
  async load() {
    if (this.loading() || this.busy()) return;
    const current = this.context();
    this.loading.set(true);
    this.message.set('');
    let task: TaskDetail | null = null;
    if (this.id) {
      const r = await this.service.read(this.id);
      if (!current() || !r) return;
      if (!r.ok || !r.data) {
        this.failure(r);
        return;
      }
      task = r.data;
    }
    const projectId = task?.projectId ?? this.params().get('projectId') ?? '';
    const project = await this.projects.read(projectId);
    if (!current() || !project) return;
    if (!project.ok || !project.project) {
      this.failure(project);
      return;
    }
    if (task && task.spaceId !== project.project.spaceId) {
      this.failure({ status: 404, message: 'This task is unavailable.' });
      return;
    }
    const space = await this.spaces.read(project.project.spaceId);
    if (!current() || !space) return;
    if (!space.ok || !space.space) {
      this.failure(space);
      return;
    }
    const stages = await this.workflow.list(projectId);
    if (!current() || !stages) return;
    if (!stages.ok) {
      this.failure(stages);
      return;
    }
    const types = await this.service.types(projectId);
    if (!current() || !types) return;
    if (!types.ok || !types.data) {
      this.failure(types);
      return;
    }
    const parentId = !task ? this.query().get('parent') : null;
    if (parentId) {
      if (!isUuid(parentId)) {
        this.failure({ status: 404, message: 'The parent task is unavailable.' });
        return;
      }
      const parent = await this.service.read(parentId);
      if (!current() || !parent) return;
      if (!parent.ok || !parent.data || parent.data.projectId !== projectId) {
        this.failure({ status: 404, message: 'The parent task is unavailable.' });
        return;
      }
      this.chosenParent.set(parent.data);
    }
    this.task.set(task);
    this.project.set(project.project);
    this.space.set(space.space);
    this.stages.set(stages.stages);
    this.types.set(types.data);
    this.draft = taskDraft(task ?? undefined);
    if (!task) {
      this.draft.stageId = stages.stages[0]?.id ?? '';
      this.draft.typeId = types.data[0]?.id ?? '';
      this.draft.parentId = parentId ?? '';
    }
    this.loading.set(false);
  }
  async save() {
    if (!this.canEdit || !this.project()) return;
    this.message.set('');
    this.success.set('');
    const original = this.task(),
      errors = validateTask(this.draft, original ?? undefined);
    if (
      this.draft.typeId !== (original?.typeId ?? '') &&
      !this.types().some((t) => t.id === this.draft.typeId)
    )
      errors.typeId = 'Choose an active project type.';
    if (!this.stages().some((s) => s.id === this.draft.stageId))
      errors.stageId = 'Choose an active project stage.';
    if (
      this.draft.assigneeMemberId &&
      this.draft.assigneeMemberId !== original?.assigneeMemberId &&
      this.draft.assigneeMemberId !== this.chosenMember()?.id
    )
      errors.assigneeMemberId = 'Choose an active space member.';
    if (
      this.draft.parentId &&
      this.draft.parentId !== original?.parentId &&
      this.draft.parentId !== this.chosenParent()?.id
    )
      errors.parentId = 'Choose a parent in this project.';
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      this.host.nativeElement
        .querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }
    if (original && !Object.keys(taskPayload(this.draft, original)).length) {
      this.success.set('No changes to save.');
      return;
    }
    const current = this.context();
    this.busy.set(true);
    const r = original
      ? await this.service.update(original, this.draft)
      : await this.service.create(this.project()!.id, this.draft);
    if (!current() || !r) return;
    this.busy.set(false);
    if (!r.ok || !r.data) {
      this.errors.set(r.fieldErrors);
      this.failure(r);
      return;
    }
    this.task.set(r.data);
    this.draft = taskDraft(r.data);
    this.errors.set({});
    this.success.set('Task saved.');
    if (!original) await this.router.navigate(['/work-items', r.data.id]);
  }
  beginDelete() {
    if (!this.canEdit || !this.task()) return;
    this.confirming.set(true);
    this.message.set('');
  }
  cancelDelete() {
    if (this.busy()) return;
    this.confirming.set(false);
    this.restoreDeleteFocus.set(true);
  }
  async remove() {
    const task = this.task();
    if (!task || !this.canEdit || !this.confirming()) return;
    const current = this.context();
    this.busy.set(true);
    this.message.set('');
    const r = await this.service.remove(task.id);
    if (!current() || !r) return;
    this.busy.set(false);
    if (!r.ok) {
      this.failure(r);
      return;
    }
    this.clear();
    await this.router.navigate(['/projects', task.projectId]);
  }
  async search(kind: 'parents' | 'members' | 'children', page = 0) {
    if (this.relatedBusy() || this.busy() || !this.project() || !this.space()) return;
    const current = this.context();
    this.relatedBusy.set(true);
    this.relatedMessage.set('');
    if (kind === 'members') {
      const r = await this.people.members(this.space()!.id, page, this.memberSearch);
      if (!current() || !r) return;
      this.relatedBusy.set(false);
      if (!r.ok || !r.data) {
        this.relatedMessage.set(r.message);
        if (r.status === 403 || r.status === 404) this.failure(r);
        return;
      }
      this.members.set(r.data);
    } else {
      const r = await this.service.list(
        this.project()!.id,
        page,
        kind === 'parents' ? this.parentSearch : '',
        kind === 'children' ? this.task()?.id : undefined,
      );
      if (!current() || !r) return;
      this.relatedBusy.set(false);
      if (!r.ok || !r.data) {
        this.relatedMessage.set(r.message);
        if (r.status === 403 || r.status === 404) this.failure(r);
        return;
      }
      (kind === 'parents' ? this.parents : this.children).set(r.data);
    }
  }
  selectParent(id: string) {
    if (!this.canEdit) return;
    const parent = this.parents()?.items.find((t) => t.id === id && t.id !== this.task()?.id);
    if (parent) {
      this.chosenParent.set(parent);
      this.draft.parentId = id;
    }
  }
  selectMember(id: string) {
    if (!this.canEdit) return;
    const member = this.members()?.items.find((m) => m.id === id);
    if (member) {
      this.chosenMember.set(member);
      this.draft.assigneeMemberId = id;
    }
  }
}
