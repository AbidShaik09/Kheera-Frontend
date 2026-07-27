import { Component } from '@angular/core';
import { HomeTaskComponent, HomeTaskData } from "../../components/home-task/home-task";

@Component({
  selector: 'app-dashboard',
  imports: [HomeTaskComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  taskDetails: HomeTaskData={
    title:'Timepass',
    taskId:'123',
    taskStatus: 'check',
    projectKey: 'yuu',
    issueNumber: 901,
    projectName: 'Knight',
    updatedAt: "26th July",
    clickable: true
  }
}
