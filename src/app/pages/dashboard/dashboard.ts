import { Component } from '@angular/core';
import { HomeTaskComponent, HomeTaskData, TaskStatus } from '../../components/home-task/home-task';

type DashboardSection = {
  title: string;
  tasks: HomeTaskData[];
};

type SidebarItem = {
  title: string;
  detail: string;
};

@Component({
  selector: 'app-dashboard',
  imports: [HomeTaskComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly activityItems: SidebarItem[] = [
    { title: 'Auth flow reviewed', detail: 'Updated today' },
    { title: 'Dashboard planning', detail: '2 open items' },
  ];

  readonly favouriteItems: SidebarItem[] = [
    { title: 'Kheera Workspace', detail: 'Primary space' },
    { title: 'Frontend Delivery', detail: 'Pinned project' },
  ];

  readonly spaces: SidebarItem[] = [
    { title: 'Product', detail: '6 projects' },
    { title: 'Engineering', detail: '4 projects' },
    { title: 'Operations', detail: '3 projects' },
  ];

  readonly taskSections: DashboardSection[] = [
    {
      title: 'Recently Visited',
      tasks: [
        this.createTask(
          'T300',
          'Review authentication screens',
          'TKD',
          70,
          'Kheera Frontend',
          'done',
          -2,
        ),
        this.createTask(
          'T301',
          'Prepare signup release checklist',
          'TKD',
          71,
          'Kheera Frontend',
          'todo',
          -6,
        ),
        this.createTask(
          'T302',
          'Validate reset password flow',
          'TKD',
          72,
          'Kheera Frontend',
          'todo',
          -10,
        ),
      ],
    },
    {
      title: 'Last Month Tasks',
      tasks: [
        this.createTask(
          'T260',
          'Repair Angular unit-test runner',
          'TKD',
          69,
          'Kheera Frontend',
          'done',
          -12,
        ),
        this.createTask(
          'T242',
          'Document frontend workflow',
          'TKD',
          66,
          'Kheera Frontend',
          'done',
          -19,
        ),
      ],
    },
    {
      title: 'Earlier Tasks',
      tasks: [
        this.createTask(
          'T190',
          'Create reusable task card',
          'TKD',
          37,
          'Kheera Frontend',
          'todo',
          -45,
        ),
        this.createTask(
          'T175',
          'Plan dashboard page sections',
          'TKD',
          60,
          'Kheera Frontend',
          'todo',
          -52,
        ),
      ],
    },
  ];

  readonly focusItems: SidebarItem[] = [
    { title: 'Finish dashboard sections', detail: 'Layout and responsive polish' },
    { title: 'Review open workspace issues', detail: 'Spaces, projects, task details' },
  ];

  private createTask(
    taskId: string,
    title: string,
    projectKey: string,
    issueNumber: number,
    projectName: string,
    taskStatus: TaskStatus,
    hoursOffset: number,
  ): HomeTaskData {
    return {
      taskId,
      title,
      projectKey,
      issueNumber,
      projectName,
      taskStatus,
      clickable: true,
      updatedAt: new Date(Date.now() + hoursOffset * 60 * 60 * 1000),
    };
  }
}
