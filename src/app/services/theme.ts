import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'theme';

  constructor() {
    this.loadTheme();
  }

  setTheme(theme: Theme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(this.storageKey, theme);
  }

  toggleTheme(): void {
    this.setTheme(this.getTheme() === 'dark' ? 'light' : 'dark');
  }

  getTheme(): Theme {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(this.storageKey) as Theme | null;

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('light');
    }
  }
}
