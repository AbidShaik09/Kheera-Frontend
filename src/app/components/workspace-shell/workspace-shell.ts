import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { WorkspaceService } from '../../services/workspace-service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-workspace-shell',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './workspace-shell.html',
  styleUrl: './workspace-shell.css',
})
export class WorkspaceShell {
  readonly workspace = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly resourceSpaceId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.route.firstChild?.snapshot?.paramMap.get('spaceId') ?? null),
    ),
    { initialValue: this.route.firstChild?.snapshot?.paramMap.get('spaceId') ?? null },
  );
  readonly selectedId = computed(() => this.resourceSpaceId() ?? this.params().get('space'));
  readonly selectedSpace = computed(() =>
    this.workspace.state().spaces.find((space) => space.id === this.selectedId()),
  );
  readonly unavailable = computed(
    () =>
      this.currentPage() !== 'Project' &&
      !!this.selectedId() &&
      this.workspace.state().status === 'ready' &&
      !this.selectedSpace(),
  );
  readonly sidebarOpen = signal(false);
  readonly currentPage = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.pageTitle()),
    ),
    { initialValue: this.pageTitle() },
  );
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isUserLoggedIn();
      this.auth.sessionEpoch();
      this.selectedId();
      untracked(() => {
        if (loggedIn) void this.workspace.refresh();
        else void this.router.navigate(['/login']);
      });
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.sidebarOpen()) {
          this.sidebarOpen.set(false);
          this.content()?.nativeElement.focus();
        }
      });
  }
  closeSidebar(): void {
    this.sidebarOpen.set(false);
    this.toggle()?.nativeElement.focus();
  }
  private pageTitle(): string {
    return this.route.firstChild?.snapshot?.data['title'] ?? 'Dashboard';
  }
}
