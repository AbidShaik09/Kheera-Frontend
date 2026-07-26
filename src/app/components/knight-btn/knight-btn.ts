import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-knight-btn',
  imports: [MatIconModule],
  templateUrl: './knight-btn.html',
  styleUrl: './knight-btn.css',
})
export class KnightBtn {
  /*
text="Create"
          icon="plus"
          type="secondary"
          (onClick)="({ createBtnClicked })"
*/
  text = input<string>();
  icon = input<string>();
  type = input<'primary' | 'secondary' | 'icon'>('primary');

  onClick = output<void>();

  buttonClass = computed(() => {
    if (this.type() === 'secondary') {
      return 'flex items-center text-btn-secondary-text py-1 px-2 border border-btn-secondary-border';
    } else if (this.type() === 'primary') {
      return 'flex items-center text-btn-primary-text py-1 px-2 bg-btn-primary-background';
    } else {
      return 'flex border-none items center  p-1';
    }
  });
  iconClass = computed(() => {
    return this.type() === 'secondary' ? 'text-btn-secondary-text' : 'text-btn-primary-text';
  });
}
