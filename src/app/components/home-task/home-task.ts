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
}
