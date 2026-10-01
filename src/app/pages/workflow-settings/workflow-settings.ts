import {
  afterRenderEffect,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { ProjectLifecycleService } from '../../services/project-lifecycle-service';
import { SpaceLifecycleService } from '../../services/space-lifecycle-service';
import { ProjectSummary, SpaceDetail } from '../../services/space-detail-service';
import { WorkspaceService } from '../../services/workspace-service';
import {
  StageDraft,
  StageErrors,
  StageResult,
  WorkflowStage,
  WorkflowStageService,
  stagePayload,
  validateStage,
} from '../../services/workflow-stage-service';
const empty = (): StageDraft => ({ name: '', icon: '', position: '', complete: false });
@Component({
  selector: 'app-workflow-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './workflow-settings.html',
  styleUrls: ['../space-editor/space-editor.css', './workflow-settings.css'],
})
export class WorkflowSettings {
  private readonly service = inject(WorkflowStageService);
  private readonly projects = inject(ProjectLifecycleService);
  private readonly spaces = inject(SpaceLifecycleService);
  private readonly workspace = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly focusTarget = signal('');
  readonly project = signal<ProjectSummary | null>(null);
  readonly space = signal<SpaceDetail | null>(null);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly ready = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly denied = signal(false);
  readonly message = signal('');
  readonly success = signal('');
  readonly errors = signal<StageErrors>({});
  readonly editing = signal<WorkflowStage | null>(null);
  readonly deleting = signal<WorkflowStage | null>(null);
  draft = empty();
  private generation = 0;
  get id() {
    return this.params().get('projectId') ?? '';
  }
  get canWrite() {
    return (
      this.ready() &&
      !!this.space()?.capabilities.canUpdate &&
      !this.denied() &&
      !this.busy() &&
      !this.loading()
    );
  }
  get missingStage() {
    return !!this.editing() && !this.stages().some((s) => s.id === this.editing()!.id);
  }
  constructor() {
    effect(() => {
      this.params();
      this.auth.sessionEpoch();
      const loggedIn = this.auth.isUserLoggedIn();
      untracked(() => {
        this.clear();
        if (loggedIn) void this.load();
      });
    });
    afterRenderEffect(() => {
      const cancel = this.cancelButton(),
        target = this.focusTarget();
      if (cancel) cancel.nativeElement.focus();
      else if (target && !this.loading() && !this.busy()) {
        this.host.nativeElement.querySelector<HTMLElement>(target)?.focus();
        this.focusTarget.set('');
      }
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }
  private clear() {
    ++this.generation;
    this.hide();
    this.draft = empty();
    this.editing.set(null);
    this.errors.set({});
    this.loading.set(false);
    this.busy.set(false);
    this.denied.set(false);
    this.message.set('');
    this.success.set('');
    this.focusTarget.set('');
  }
  private hide() {
    this.ready.set(false);
    this.project.set(null);
    this.space.set(null);
    this.stages.set([]);
    this.deleting.set(null);
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
  async load(resetDenied = true): Promise<void> {
    if (this.loading() || this.busy()) return;
    const current = this.context(),
      id = this.id;
    this.loading.set(true);
    this.hide();
    this.message.set('');
    const project = await this.projects.read(id);
    if (!current() || !project) return;
    if (!project.ok || !project.project) {
      this.readFailure(project);
      return;
    }
    const space = await this.spaces.read(project.project.spaceId);
    if (!current() || !space) return;
    if (!space.ok || !space.space) {
      this.readFailure(space);
      return;
    }
    const stages = await this.service.list(id);
    if (!current() || !stages) return;
    if (!stages.ok) {
      this.readFailure(stages);
      return;
    }
    this.project.set(project.project);
    this.space.set(space.space);
    this.stages.set(stages.stages);
    this.loading.set(false);
    this.ready.set(true);
    if (resetDenied) this.denied.set(false);
  }
  private readFailure(result: { status: number; message: string }) {
    this.loading.set(false);
    this.hide();
    this.message.set(result.message);
    if (result.status === 403 || result.status === 404) {
      this.draft = empty();
      this.editing.set(null);
      this.errors.set({});
      void this.workspace.refresh();
    }
  }
  edit(stage: WorkflowStage) {
    if (!this.canWrite || this.deleting()) return;
    this.editing.set(stage);
    this.draft = {
      name: stage.name,
      icon: stage.icon ?? '',
      position: String(stage.position),
      complete: stage.complete,
    };
    this.errors.set({});
    this.message.set('');
    this.success.set('');
    this.focusTarget.set('[name="name"]');
  }
  newStage() {
    if (this.busy() || this.loading() || this.deleting()) return;
    this.editing.set(null);
    this.draft = empty();
    this.errors.set({});
    this.focusTarget.set('[name="name"]');
  }
  async save(): Promise<void> {
    if (
      !this.canWrite ||
      this.deleting() ||
      this.missingStage ||
      (!this.editing() && this.stages().length >= 100)
    )
      return;
    const errors = validateStage(this.draft);
    this.errors.set(errors);
    this.message.set('');
    this.success.set('');
    if (Object.keys(errors).length) {
      this.focusTarget.set(`[name="${Object.keys(errors)[0]}"]`);
      return;
    }
    const original = this.editing() ?? undefined;
    if (original && !Object.keys(stagePayload(this.draft, original)).length) {
      this.success.set('No changes to save.');
      return;
    }
    const current = this.context();
    this.busy.set(true);
    const result = await this.service.save(this.id, this.draft, original);
    if (!current() || !result) return;
    this.busy.set(false);
    if (!result.ok) {
      await this.failure(result);
      return;
    }
    this.editing.set(null);
    this.draft = empty();
    this.errors.set({});
    await this.load();
    if (current()) {
      this.success.set('Stage saved.');
      this.focusTarget.set('[name="name"]');
    }
  }
  beginDelete(stage: WorkflowStage) {
    if (!this.canWrite || this.deleting()) return;
    this.deleting.set(stage);
    this.message.set('');
    this.success.set('');
  }
  cancelDelete() {
    if (this.busy()) return;
    const id = this.deleting()?.id;
    this.deleting.set(null);
    if (id) this.focusTarget.set(`[data-delete="${id}"]`);
  }
  async remove(): Promise<void> {
    const stage = this.deleting();
    if (!stage || !this.canWrite) return;
    const current = this.context();
    this.busy.set(true);
    this.message.set('');
    const result = await this.service.remove(this.id, stage.id);
    if (!current() || !result) return;
    this.busy.set(false);
    if (!result.ok) {
      await this.failure(result);
      return;
    }
    this.deleting.set(null);
    if (this.editing()?.id === stage.id) {
      this.editing.set(null);
      this.draft = empty();
      this.errors.set({});
    }
    await this.load();
    if (current()) {
      this.success.set('Stage deleted.');
      this.focusTarget.set('[data-refresh]');
    }
  }
  private async failure(result: StageResult) {
    this.message.set(result.message);
    this.errors.set(result.fieldErrors);
    if (result.status === 404) {
      this.readFailure(result);
      return;
    }
    if (result.status === 403 || result.status === 409) {
      const current = this.context();
      if (result.status === 403) this.denied.set(true);
      await this.load(false);
      if (current() && this.ready()) {
        this.message.set(result.message);
        this.focusTarget.set('[data-refresh]');
      }
    }
  }
}
