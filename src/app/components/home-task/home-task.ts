import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

export type HomeTaskData={
  taskStatus: string;
  taskId: string;
  title: string;
  projectKey: string;
  issueNumber: number;
  projectName: string;
  clickable: boolean;
  updatedAt: Date | string;
}
@Component({
  selector: 'app-home-task',
  imports: [MatIcon],
  templateUrl: './home-task.html',
  styleUrl: './home-task.css',
})
export class HomeTaskComponent {
  @Input()
  task!: HomeTaskData;
  @Output()
  taskClick = new EventEmitter<void>();
  onClick(){
    if (! this.task.clickable){
      return;
    }
    this.taskClick.emit();
  }
  getRelativeTime(): string {
    const current=new Date();
    const updated=new Date(this.task.updatedAt);
    const difference=current.getTime()-updated.getTime();

    const seconds = Math.floor(difference / 1000);
    const minutes = Math.floor(seconds / 60); 
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    const formatter=new Intl.RelativeTimeFormat('en',{
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

  }

