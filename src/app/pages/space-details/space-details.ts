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
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { SpaceDetailService, safeImageUrl } from '../../services/space-detail-service';
@Component({
  selector: 'app-space-details',
  imports: [RouterLink, DatePipe],
  providers: [SpaceDetailService],
  templateUrl: './space-details.html',
  styleUrl: './space-details.css',
})
export class SpaceDetails {
  readonly service = inject(SpaceDetailService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly failedImage = signal<string | null>(null);
  readonly safeImageUrl = safeImageUrl;
  private readonly focusPage = signal<number | null>(null);
  private readonly projectsHeading = viewChild<ElementRef<HTMLElement>>('projectsHeading');
  private readonly errorHeading = viewChild<ElementRef<HTMLElement>>('errorHeading');
  private readonly location = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([params, query]) => {
        const raw = query.get('page') ?? '0';
        return {
          id: params.get('spaceId') ?? '',
          page: /^\d+$/.test(raw) && Number(raw) <= 100000 ? Number(raw) : 0,
        };
      }),
    ),
    { initialValue: { id: '', page: 0 } },
  );
  constructor() {
    effect(() => {
      const location = this.location(),
        loggedIn = this.auth.isUserLoggedIn();
      this.auth.sessionEpoch();
      untracked(() => {
        this.failedImage.set(null);
        if (loggedIn) void this.service.load(location.id, location.page);
        else this.service.clear();
      });
    });
    inject(DestroyRef).onDestroy(() => this.service.clear());
    afterRenderEffect(() => {
      const state = this.service.state();
      if (
        this.focusPage() !== state.page ||
        state.detail.status === 'loading' ||
        state.projects.status === 'loading'
      )
        return;
      const heading = this.projectsHeading()?.nativeElement ?? this.errorHeading()?.nativeElement;
      if (!heading) return;
      // Pagination replaces the focused control. Restore a useful reading position
      // after rendering, unless the user has already focused another control.
      if (heading.ownerDocument.activeElement === heading.ownerDocument.body) heading.focus();
      this.focusPage.set(null);
    });
  }
  refresh(): void {
    const location = this.location();
    if (
      this.service.state().detail.status !== 'loading' &&
      this.service.state().projects.status !== 'loading'
    ) {
      this.failedImage.set(null);
      void this.service.load(location.id, location.page);
    }
  }
  goToPage(page: number): void {
    if (page < 0 || page > 100000 || this.service.state().projects.status === 'loading') return;
    this.focusPage.set(page);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page || null },
      queryParamsHandling: 'merge',
    });
  }
}
