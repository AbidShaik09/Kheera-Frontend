import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { ProjectLifecycleService } from '../../services/project-lifecycle-service';
import { SpaceLifecycleService } from '../../services/space-lifecycle-service';
import { ProjectSummary, SpaceDetail } from '../../services/space-detail-service';
import { WorkflowStageService } from '../../services/workflow-stage-service';
import { WorkspaceService } from '../../services/workspace-service';
import { BoardPage, BoardTask, ProjectBoardService } from '../../services/project-board-service';
@Component({
  selector: 'app-project-board',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './project-board.html',
  styleUrls: ['../space-details/space-details.css', './project-board.css'],
})
export class ProjectBoard {
  private readonly api = inject(ProjectBoardService);
  private readonly projects = inject(ProjectLifecycleService);
  private readonly spaces = inject(SpaceLifecycleService);
  private readonly workflow = inject(WorkflowStageService);
  private readonly workspace = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly project = signal<ProjectSummary | null>(null);
  readonly space = signal<SpaceDetail | null>(null);
  readonly board = signal<BoardPage | null>(null);
  readonly loading = signal(false);
  readonly moving = signal(false);
  readonly denied = signal(false);
  readonly message = signal('');
  readonly success = signal('');
  private readonly restoreFocus = signal(false);
  targets: Record<string, string> = {};
  private generation = 0;
  private dragged: string | null = null;
  get id() {
    return this.params().get('projectId') ?? '';
  }
  get canMove() {
    return (
      !!this.board() &&
      !!this.space()?.capabilities.canUpdate &&
      !this.loading() &&
      !this.moving() &&
      !this.denied()
    );
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
      if (this.restoreFocus() && !this.loading() && !this.moving()) {
        this.host.nativeElement.querySelector<HTMLButtonElement>('[data-refresh]')?.focus();
        this.restoreFocus.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }
  private hide() {
    this.project.set(null);
    this.space.set(null);
    this.board.set(null);
    this.dragged = null;
  }
  private clear() {
    ++this.generation;
    this.hide();
    this.targets = {};
    this.loading.set(false);
    this.moving.set(false);
    this.denied.set(false);
    this.message.set('');
    this.success.set('');
    this.restoreFocus.set(false);
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
  async load(page = 0, resetDenied = true): Promise<void> {
    if (this.loading() || this.moving()) return;
    const current = this.context(),
      id = this.id;
    this.loading.set(true);
    this.hide();
    this.message.set('');
    this.success.set('');
    const project = await this.projects.read(id);
    if (!current() || !project) return;
    if (!project.ok || !project.project) {
      this.failure(project);
      return;
    }
    const space = await this.spaces.read(project.project.spaceId);
    if (!current() || !space) return;
    if (!space.ok || !space.space) {
      this.failure(space);
      return;
    }
    const stages = await this.workflow.list(id);
    if (!current() || !stages) return;
    if (!stages.ok) {
      this.failure(stages);
      return;
    }
    const result = await this.api.read(id, page);
    if (!current() || !result) return;
    if (!result.ok || !result.data) {
      this.failure(result);
      return;
    }
    if (
      result.data.groups.length !== stages.stages.length ||
      result.data.groups.some((g) => !stages.stages.some((s) => s.id === g.stage.id))
    ) {
      this.failure({
        status: 409,
        message: 'The workflow changed while loading. Refresh to load the current board.',
      });
      return;
    }
    const targets: Record<string, string> = {};
    for (const task of result.data.items)
      targets[task.id] = result.data.groups.some((g) => g.stage.id === this.targets[task.id])
        ? this.targets[task.id]
        : task.stageId;
    this.targets = targets;
    this.project.set(project.project);
    this.space.set(space.space);
    this.board.set(result.data);
    this.loading.set(false);
    if (resetDenied) this.denied.set(false);
  }
  private failure(result: { status: number; message: string }) {
    this.loading.set(false);
    this.hide();
    this.message.set(result.message);
    if (result.status === 403 || result.status === 404) {
      this.targets = {};
      void this.workspace.refresh();
    }
  }
  async move(task: BoardTask, stageId: string): Promise<void> {
    if (
      !this.canMove ||
      !this.board()?.items.some((t) => t.id === task.id) ||
      !this.board()?.groups.some((g) => g.stage.id === stageId)
    )
      return;
    const current = this.context();
    this.moving.set(true);
    this.message.set('');
    this.success.set('');
    this.dragged = null;
    const result = await this.api.move(task, stageId);
    if (!current() || !result) return;
    this.moving.set(false);
    if (!result.ok) {
      if (result.status === 404) this.failure(result);
      else if (result.status === 403 || result.status === 409) {
        this.denied.set(true);
        await this.load(this.board()?.page ?? 0, false);
        if (current() && this.board()) this.message.set(result.message);
      } else this.message.set(result.message);
      return;
    }
    await this.load(0);
    if (current()) {
      this.success.set('Task moved.');
      this.restoreFocus.set(true);
    }
  }
  dragStart(event: DragEvent, task: BoardTask) {
    if (!this.canMove) {
      event.preventDefault();
      return;
    }
    this.dragged = task.id;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', task.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  dragEnd() {
    this.dragged = null;
  }
  allowDrop(event: DragEvent) {
    if (this.canMove && this.dragged) event.preventDefault();
  }
  drop(event: DragEvent, stageId: string) {
    event.preventDefault();
    const task = this.board()?.items.find((t) => t.id === this.dragged);
    this.dragged = null;
    if (task) void this.move(task, stageId);
  }
}
