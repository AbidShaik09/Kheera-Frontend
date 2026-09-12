import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type LandingFeature = {
  title: string;
  description: string;
};

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  readonly features: LandingFeature[] = [
    {
      title: 'Plan work clearly',
      description: 'Organize spaces, projects, and tasks so every team knows what matters next.',
    },
    {
      title: 'Keep delivery visible',
      description: 'Track focus work, aging tasks, and project movement without digging through noise.',
    },
    {
      title: 'Move faster together',
      description: 'Give collaborators one workspace for updates, priorities, and shared execution.',
    },
  ];
}
