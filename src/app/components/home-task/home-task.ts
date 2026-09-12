import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export type HomeTaskData = {
  status?: TaskStatus;
  taskStatus?: TaskStatus;
  taskId: string;
  title: string;
  projectKey: string;
  issueNumber: number;
  projectName: string;
  clickable?: boolean;
  updatedAt: Date | string;
};

@Component({
  selector: 'app-home-task',
  imports: [MatIcon],
  templateUrl: './home-task.html',
  styleUrl: './home-task.css',
})
export class HomeTaskComponent {
  @Input({ required: true }) task!: HomeTaskData;

  @Output() readonly taskClick = new EventEmitter<void>();

  @HostBinding('class') readonly hostClass = 'block w-full';

  get isClickable(): boolean {
    return this.task?.clickable !== false;
  }

  get statusIcon(): string {
    switch (this.status) {
      case 'done':
        return 'check_circle';
      case 'in-progress':
        return 'radio_button_checked';
      case 'blocked':
        return 'error';
      default:
        return 'radio_button_unchecked';
    }
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'done':
        return 'Done';
      case 'in-progress':
        return 'In progress';
      case 'blocked':
        return 'Blocked';
      default:
        return 'To do';
    }
  }

  onClick(): void {
    if (!this.isClickable) {
      return;
    }

    this.taskClick.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.isClickable || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    this.taskClick.emit();
  }

  getRelativeTime(): string {
    const updated = new Date(this.task.updatedAt);

    if (Number.isNaN(updated.getTime())) {
      return 'Unknown';
    }

    const difference = Date.now() - updated.getTime();

    const seconds = Math.floor(difference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    const formatter = new Intl.RelativeTimeFormat('en', {
      numeric: 'always',
    });

    if (years > 0) {
      return formatter.format(-years, 'year');
    }

    if (months > 0) {
      return formatter.format(-months, 'month');
    }

    if (days > 0) {
      return formatter.format(-days, 'day');
    }

    if (hours > 0) {
      return formatter.format(-hours, 'hour');
    }

    if (minutes > 0) {
      return formatter.format(-minutes, 'minute');
    }

    return formatter.format(-seconds, 'second');
  }

  private get status(): TaskStatus {
    return this.task.status ?? this.task.taskStatus ?? 'todo';
  }
}

