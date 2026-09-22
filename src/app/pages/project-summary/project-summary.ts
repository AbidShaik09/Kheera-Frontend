import { Component, DestroyRef, effect, inject, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { ProjectSummaryService } from '../../services/project-summary-service';
@Component({
  selector: 'app-project-summary',
  imports: [RouterLink, DatePipe],
  providers: [ProjectSummaryService],
  styleUrl: '../space-details/space-details.css',
  template: ` <section class="space-page" aria-label="Project overview">
    <div class="page-actions">
      <a routerLink="/dashboard">Dashboard</a
      ><button
        type="button"
        (click)="refresh()"
        [attr.aria-disabled]="service.state().status === 'loading'"
      >
        Refresh project
      </button>
    </div>
    @if (service.state().status === 'loading') {
      <p role="status">Loading project…</p>
    }
    @if (service.state().message) {
      <h1>Project unavailable</h1>
      <p role="alert">{{ service.state().message }}</p>
    }
    @if (service.state().data; as project) {
      <header class="space-header">
        <div class="space-identity">
          <p class="eyebrow">Project</p>
          <h1>{{ project.name }}</h1>
        </div>
        <a [routerLink]="['/spaces', project.spaceId]">Back to space</a>
      </header>
      <p class="description">{{ project.description || 'No description provided.' }}</p>
      <p>{{ project.openTaskCount }} open tasks · {{ project.progressPercent }}% complete</p>
      <progress max="100" [value]="project.progressPercent" aria-label="Project progress">
        {{ project.progressPercent }}%
      </progress>
      <p class="updated">Updated {{ project.updatedAt | date: 'medium' }}</p>
      <p class="empty-state">The task board is coming soon.</p>
    }
  </section>`,
})
export class ProjectSummaryPage {
  readonly service = inject(ProjectSummaryService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  constructor() {
    effect(() => {
      const id = this.params().get('projectId') ?? '',
        loggedIn = this.auth.isUserLoggedIn();
      this.auth.sessionEpoch();
      untracked(() => {
        if (loggedIn) void this.service.load(id);
        else this.service.clear();
      });
    });
    inject(DestroyRef).onDestroy(() => this.service.clear());
  }
  refresh(): void {
    if (this.service.state().status !== 'loading')
      void this.service.load(this.params().get('projectId') ?? '');
  }
}
