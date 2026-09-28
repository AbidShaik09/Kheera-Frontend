import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { SpaceDetail } from '../../services/space-detail-service';
import {
  FieldErrors,
  SpaceDraft,
  SpaceLifecycleService,
  SpaceResult,
  spacePayload,
  validateSpace,
} from '../../services/space-lifecycle-service';
import { WorkspaceService } from '../../services/workspace-service';
const empty = (): SpaceDraft => ({ name: '', description: '', profilePic: '' });
@Component({
  selector: 'app-space-editor',
  imports: [FormsModule, RouterLink],
  templateUrl: './space-editor.html',
  styleUrl: './space-editor.css',
})
export class SpaceEditor {
  private readonly service = inject(SpaceLifecycleService);
  private readonly workspace = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly space = signal<SpaceDetail | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly unavailable = signal(false);
  readonly message = signal('');
  readonly success = signal('');
  readonly errors = signal<FieldErrors>({});
  readonly confirming = signal(false);
  draft = empty();
  private generation = 0;
  get id(): string | null {
    return this.params().get('spaceId');
  }
  constructor() {
    effect(() => {
      this.params();
      this.auth.sessionEpoch();
      const loggedIn = this.auth.isUserLoggedIn();
      untracked(() => {
        ++this.generation;
        this.space.set(null);
        this.draft = empty();
        this.errors.set({});
        this.message.set('');
        this.success.set('');
        this.busy.set(false);
        this.loading.set(false);
        this.unavailable.set(false);
        this.confirming.set(false);
        if (loggedIn && this.id) void this.load();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      ++this.generation;
      this.space.set(null);
      this.draft = empty();
    });
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
  async load(preserveDraft = false): Promise<void> {
    if (!this.id || this.busy() || this.loading()) return;
    const current = this.context();
    this.loading.set(true);
    this.message.set('');
    const result = await this.service.read(this.id);
    if (!current() || !result) return;
    this.loading.set(false);
    if (result.ok && result.space) {
      this.space.set(result.space);
      this.unavailable.set(false);
      if (!preserveDraft)
        this.draft = {
          name: result.space.name,
          description: result.space.description ?? '',
          profilePic: result.space.profilePic ?? '',
        };
    } else this.failure(result);
  }
  async save(): Promise<void> {
    if (
      this.busy() ||
      this.loading() ||
      this.unavailable() ||
      (this.id && !this.space()?.capabilities.canUpdate)
    )
      return;
    this.success.set('');
    this.message.set('');
    const errors = validateSpace(this.draft);
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      const field = Object.keys(errors)[0];
      this.host.nativeElement.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
      return;
    }
    const original = this.space();
    if (original && !Object.keys(spacePayload(this.draft, original)).length) {
      this.success.set('No changes to save.');
      return;
    }
    const current = this.context();
    this.busy.set(true);
    const result = original
      ? await this.service.update(original.id, this.draft, original)
      : await this.service.create(this.draft);
    if (!current() || !result) return;
    this.busy.set(false);
    if (!result.ok || !result.space) {
      this.failure(result, 'update');
      return;
    }
    this.space.set(result.space);
    this.draft = {
      name: result.space.name,
      description: result.space.description ?? '',
      profilePic: result.space.profilePic ?? '',
    };
    this.success.set('Space saved.');
    // Refresh shared navigation immediately; it must not delay a completed mutation.
    void this.workspace.refresh();
    if (!original) await this.router.navigate(['/spaces', result.space.id]);
  }
  beginDelete(): void {
    this.confirming.set(true);
    this.success.set('');
    this.message.set('');
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLButtonElement>('[data-cancel-delete]')?.focus(),
    );
  }
  cancelDelete(): void {
    if (this.busy()) return;
    this.confirming.set(false);
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLButtonElement>('[data-delete]')?.focus(),
    );
  }
  async remove(): Promise<void> {
    const space = this.space();
    if (!space?.capabilities.canDelete || !this.confirming() || this.busy() || this.loading())
      return;
    const current = this.context();
    this.busy.set(true);
    this.message.set('');
    const result = await this.service.remove(space.id);
    if (!current() || !result) return;
    this.busy.set(false);
    if (!result.ok) {
      this.failure(result, 'delete');
      return;
    }
    this.space.set(null);
    this.draft = empty();
    this.confirming.set(false);
    void this.workspace.refresh();
    await this.router.navigate(['/dashboard']);
  }
  private failure(result: SpaceResult, operation?: 'update' | 'delete'): void {
    this.message.set(result.message);
    this.errors.set(result.fieldErrors);
    if (result.status === 404 || (result.status === 403 && !operation)) {
      this.space.set(null);
      this.draft = empty();
      this.confirming.set(false);
      this.unavailable.set(true);
      void this.workspace.refresh();
    } else if (result.status === 403 && operation) {
      this.space.update((s) =>
        s
          ? {
              ...s,
              capabilities: {
                ...s.capabilities,
                [operation === 'update' ? 'canUpdate' : 'canDelete']: false,
              },
            }
          : null,
      );
      this.confirming.set(false);
    }
  }
}
