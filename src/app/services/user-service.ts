import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  name: WritableSignal<string> = signal('Lateef');
  constructor() {
    console.log('UserService initialized. Current user name:', this.name());
  }

  setName(newName: string) {
    this.name.set(newName);
    console.log('User name updated to:', this.name());
  }
}
