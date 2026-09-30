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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { ProjectSummary, SpaceDetail } from '../../services/space-detail-service';
import { SpaceLifecycleService } from '../../services/space-lifecycle-service';
import {
  ProjectDraft,
  ProjectErrors,
  ProjectLifecycleService,
  ProjectResult,
  projectPayload,
  validateProject,
} from '../../services/project-lifecycle-service';
import { WorkspaceService } from '../../services/workspace-service';
const empty = (): ProjectDraft => ({ name: '', description: '', sprintCycleDays: '7' });
@Component({
  selector: 'app-project-editor',
  imports: [FormsModule, RouterLink],
  templateUrl: './project-editor.html',
  styleUrl: '../space-editor/space-editor.css',
})
export class ProjectEditor {
  private readonly service = inject(ProjectLifecycleService);
  private readonly spaces = inject(SpaceLifecycleService);
  private readonly workspace = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly restoreDeleteFocus = signal(false);
  readonly project = signal<ProjectSummary | null>(null);
  readonly space = signal<SpaceDetail | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly unavailable = signal(false);
  readonly message = signal('');
  readonly success = signal('');
  readonly errors = signal<ProjectErrors>({});
  readonly confirming = signal(false);
  readonly deniedSave = signal(false);
  readonly deniedDelete = signal(false);
  draft = empty();
  private generation = 0;
  private hasDraft = false;
  get id() {
    return this.params().get('projectId');
  }
  get spaceId() {
    return this.params().get('spaceId');
  }
  constructor() {
    effect(() => {
      this.params();
      this.auth.sessionEpoch();
      const loggedIn = this.auth.isUserLoggedIn();
      untracked(() => {
        this.reset();
        if (loggedIn) void this.load();
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
    inject(DestroyRef).onDestroy(() => this.reset());
  }
  private reset() {
    ++this.generation;
    this.project.set(null);
    this.space.set(null);
    this.draft = empty();
    this.hasDraft = false;
    this.errors.set({});
    this.message.set('');
    this.success.set('');
    this.busy.set(false);
    this.loading.set(false);
    this.unavailable.set(false);
    this.confirming.set(false);
    this.restoreDeleteFocus.set(false);
    this.deniedSave.set(false);
    this.deniedDelete.set(false);
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
  private useDraft(project: ProjectSummary) {
    this.draft = {
      name: project.name,
      description: project.description ?? '',
      sprintCycleDays: project.sprintCycleDays === null ? '' : String(project.sprintCycleDays),
    };
    this.hasDraft = true;
  }
  async load(preserveDraft = false, resetDenied = true): Promise<void> {
    if (this.busy() || this.loading()) return;
    const current = this.context(),
      id = this.id;
    this.loading.set(true);
    this.message.set('');
    this.confirming.set(false);
    this.project.set(null);
    this.space.set(null);
    let project: ProjectSummary | null = null;
    if (id) {
      const result = await this.service.read(id);
      if (!current() || !result) return;
      if (!result.ok || !result.project) {
        this.loading.set(false);
        this.readFailure(result.status, result.message);
        return;
      }
      project = result.project;
    }
    const spaceId = project?.spaceId ?? this.spaceId ?? '';
    const result = await this.spaces.read(spaceId);
    if (!current() || !result) return;
    this.loading.set(false);
    if (!result.ok || !result.space) {
      this.readFailure(result.status, result.message);
      return;
    }
    this.space.set(result.space);
    this.project.set(project);
    this.unavailable.set(false);
    if (resetDenied) {
      this.deniedSave.set(false);
      this.deniedDelete.set(false);
    }
    if (project && (!preserveDraft || !this.hasDraft)) this.useDraft(project);
    if (!id) this.hasDraft = true;
  }
  private readFailure(status: number, message: string) {
    this.message.set(message);
    this.space.set(null);
    this.project.set(null);
    this.confirming.set(false);
    if (status === 403 || status === 404) {
      this.unavailable.set(true);
      this.draft = empty();
      this.hasDraft = false;
      void this.workspace.refresh();
    }
  }
  async save(): Promise<void> {
    const original = this.project();
    if (
      this.busy() ||
      this.loading() ||
      this.unavailable() ||
      this.deniedSave() ||
      !this.space()?.capabilities.canUpdate ||
      (this.id && !original)
    )
      return;
    this.success.set('');
    this.message.set('');
    const errors = validateProject(this.draft, original ?? undefined);
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      this.host.nativeElement
        .querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }
    if (original && !Object.keys(projectPayload(this.draft, original)).length) {
      this.success.set('No changes to save.');
      return;
    }
    const current = this.context();
    this.busy.set(true);
    const result = original
      ? await this.service.update(original, this.draft)
      : await this.service.create(this.space()!.id, this.draft);
    if (!current() || !result) return;
    this.busy.set(false);
    if (!result.ok || !result.project) {
      await this.failure(result, 'save');
      return;
    }
    this.project.set(result.project);
    this.useDraft(result.project);
    this.errors.set({});
    this.success.set('Project saved.');
    if (!original) await this.router.navigate(['/projects', result.project.id]);
  }
  beginDelete() {
    if (
      !this.space()?.capabilities.canDelete ||
      this.busy() ||
      this.loading() ||
      this.deniedDelete()
    )
      return;
    this.confirming.set(true);
    this.message.set('');
    this.success.set('');
  }
  cancelDelete() {
    if (this.busy()) return;
    this.confirming.set(false);
    this.restoreDeleteFocus.set(true);
  }
  async remove(): Promise<void> {
    const project = this.project();
    if (
      !project ||
      !this.space()?.capabilities.canDelete ||
      !this.confirming() ||
      this.busy() ||
      this.loading() ||
      this.deniedDelete()
    )
      return;
    const current = this.context();
    this.busy.set(true);
    this.message.set('');
    const result = await this.service.remove(project.id);
    if (!current() || !result) return;
    this.busy.set(false);
    if (!result.ok) {
      await this.failure(result, 'delete');
      return;
    }
    this.project.set(null);
    this.space.set(null);
    this.draft = empty();
    this.hasDraft = false;
    this.confirming.set(false);
    await this.router.navigate(['/spaces', project.spaceId]);
  }
  private async failure(result: ProjectResult, operation: 'save' | 'delete') {
    this.message.set(result.message);
    this.errors.set(result.fieldErrors);
    if (result.status === 404) {
      this.readFailure(result.status, result.message);
      return;
    }
    if (result.status === 403) {
      const current = this.context();
      (operation === 'save' ? this.deniedSave : this.deniedDelete).set(true);
      await this.load(true, false);
      if (current() && !this.unavailable() && this.space()) this.message.set(result.message);
    }
  }
}
