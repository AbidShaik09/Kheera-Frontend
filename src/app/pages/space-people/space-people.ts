import {
  afterRenderEffect,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { WorkspaceService } from '../../services/workspace-service';
import { SpaceDetail } from '../../services/space-detail-service';
import {
  CatalogueItem,
  Membership,
  MembershipPage,
  MembershipResult,
  MembershipService,
} from '../../services/membership-service';
@Component({
  selector: 'app-space-people',
  imports: [FormsModule, RouterLink],
  templateUrl: './space-people.html',
  styleUrl: './space-people.css',
})
export class SpacePeople {
  private readonly api = inject(MembershipService);
  readonly auth = inject(AuthService);
  private readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly space = signal<SpaceDetail | null>(null);
  readonly members = signal<MembershipPage<Membership> | null>(null);
  readonly roles = signal<CatalogueItem[]>([]);
  readonly permissions = signal<CatalogueItem[]>([]);
  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly metadataError = signal('');
  readonly catalogueError = signal('');
  readonly mutationError = signal('');
  readonly success = signal('');
  readonly confirmation = signal<Membership | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  email = '';
  addRole = '';
  q = '';
  sort = 'name,asc';
  page = 0;
  selectedRoles: Record<string, string> = {};
  private generation = 0;
  private id = '';
  private readonly confirmationHeading = viewChild<ElementRef<HTMLElement>>('confirmationHeading');
  private removalTrigger: HTMLElement | null = null;
  constructor() {
    afterRenderEffect(() => this.confirmationHeading()?.nativeElement.focus());
    effect(() => {
      const id = this.params()?.get('spaceId') ?? '',
        loggedIn = this.auth.isUserLoggedIn();
      this.auth.sessionEpoch();
      untracked(() => {
        this.clear();
        this.id = id;
        if (loggedIn) {
          void this.auth.ensureCurrentUser();
          void this.load();
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }
  private clear() {
    ++this.generation;
    this.space.set(null);
    this.members.set(null);
    this.roles.set([]);
    this.permissions.set([]);
    this.pending.set(false);
    this.loading.set(false);
    this.confirmation.set(null);
    this.selectedRoles = {};
    this.email = '';
    this.addRole = '';
    this.q = '';
    this.sort = 'name,asc';
    this.page = 0;
    this.error.set('');
    this.metadataError.set('');
    this.catalogueError.set('');
    this.mutationError.set('');
    this.success.set('');
    this.fieldErrors.set({});
  }
  async load() {
    if (this.pending() || this.loading()) return;
    if (this.auth.profileState().status === 'error') void this.auth.refreshCurrentUser();
    const generation = ++this.generation,
      epoch = this.auth.sessionEpoch();
    const current = () =>
      generation === this.generation &&
      epoch === this.auth.sessionEpoch() &&
      this.auth.isUserLoggedIn();
    this.loading.set(true);
    this.confirmation.set(null);
    this.selectedRoles = {};
    this.members.set(null);
    this.space.set(null);
    this.roles.set([]);
    this.permissions.set([]);
    this.error.set('');
    this.metadataError.set('');
    this.catalogueError.set('');
    const metadata = this.api.detail(this.id).then((r) => {
      if (!current() || !r) return;
      this.space.set(r.data);
      if (!r.ok) this.metadataError.set(r.message);
    });
    const members = this.api.members(this.id, this.page, this.q, this.sort).then((r) => {
      if (!current() || !r) return;
      this.members.set(r.data);
      if (!r.ok) this.error.set(r.message);
      else for (const m of r.data!.items) this.selectedRoles[m.id] = m.role.id;
    });
    const catalogues = Promise.all(
      ['roles', 'permissions'].map(async (kind) => {
        const r = await this.api.catalogue(this.id, kind as 'roles' | 'permissions');
        if (!current() || !r) return;
        if (!r.ok) this.catalogueError.set(r.message);
        else (kind === 'roles' ? this.roles : this.permissions).set(r.data!);
      }),
    );
    await Promise.all([metadata, members, catalogues]);
    if (!current()) return;
    if (!this.space()) {
      this.members.set(null);
      this.roles.set([]);
      this.permissions.set([]);
    }
    this.loading.set(false);
    const result = this.members();
    if (result && this.page > Math.max(0, result.totalPages - 1)) {
      this.page = Math.max(0, result.totalPages - 1);
      await this.load();
    }
  }
  search() {
    if (this.loading() || this.pending()) return;
    this.page = 0;
    void this.load();
  }
  go(page: number) {
    if (page < 0 || page > 100000 || this.loading() || this.pending()) return;
    this.page = page;
    void this.load();
  }
  async add() {
    if (!this.email.trim() || !this.addRole || !this.roles().some((r) => r.id === this.addRole))
      return;
    await this.mutate(
      () => this.api.add(this.id, this.email, this.addRole),
      'Member added.',
      undefined,
      true,
    );
  }
  async change(member: Membership) {
    const role = this.selectedRoles[member.id];
    if (!role || role === member.role.id || !this.roles().some((r) => r.id === role)) return;
    await this.mutate(() => this.api.changeRole(this.id, member.id, role), 'Role updated.');
  }
  async remove() {
    const member = this.confirmation();
    if (!member) return;
    await this.mutate(() => this.api.remove(this.id, member.id), 'Membership removed.', member);
  }
  confirmRemoval(member: Membership, event: Event) {
    this.removalTrigger = event.currentTarget as HTMLElement;
    this.confirmation.set(member);
  }
  cancelRemoval() {
    this.confirmation.set(null);
    this.removalTrigger?.focus();
    this.removalTrigger = null;
  }
  private async mutate<T>(
    call: () => Promise<MembershipResult<T> | null>,
    message: string,
    removed?: Membership,
    added = false,
  ) {
    if (this.loading() || this.pending() || !this.space() || !this.members()) return;
    this.pending.set(true);
    this.mutationError.set('');
    this.success.set('');
    this.fieldErrors.set({});
    const generation = this.generation,
      epoch = this.auth.sessionEpoch();
    const r = await call();
    if (generation !== this.generation || epoch !== this.auth.sessionEpoch() || !r) return;
    this.pending.set(false);
    if (!r.ok) {
      this.mutationError.set(r.message);
      this.fieldErrors.set(r.fieldErrors);
      if (r.status === 403 || r.status === 404) {
        const detail = await this.api.detail(this.id);
        if (generation !== this.generation || epoch !== this.auth.sessionEpoch()) return;
        if (detail && !detail.ok && [403, 404].includes(detail.status)) {
          this.space.set(null);
          this.members.set(null);
          this.roles.set([]);
          this.permissions.set([]);
          this.confirmation.set(null);
          this.email = '';
          this.addRole = '';
          this.selectedRoles = {};
          this.metadataError.set(detail.message);
          void this.workspace.refresh();
        } else if (detail?.ok) {
          this.space.set(detail.data);
          await this.load();
        }
      }
      return;
    }
    this.success.set(message);
    this.confirmation.set(null);
    if (added) {
      this.email = '';
      this.addRole = '';
    }
    if (removed?.user.id === this.auth.currentUser()?.id) {
      this.clear();
      void this.workspace.refresh();
      await this.router.navigate(['/dashboard']);
      return;
    }
    void this.workspace.refresh();
    await this.load();
  }
}
