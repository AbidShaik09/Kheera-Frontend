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
    title:'Create a login, sign up pages and add create authentication module and routing structure with angular routes for protected areas',
    taskId:'72',
    taskStatus: 'check',
    projectKey: 'P07',
    issueNumber: 71,
    projectName: 'Kheera: Modern Project Management Workspace',
    updatedAt: new Date(),
    clickable: true
  }
}
