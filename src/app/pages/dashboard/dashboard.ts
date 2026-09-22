import { Component } from '@angular/core';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly sections = ['Recently Visited', 'Last Month Tasks', 'Earlier Tasks'];
}
