import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IconService } from '../../services/incon-service';
@Component({
  selector: 'app-global-search',
  imports: [MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './global-search.html',
  styleUrl: './global-search.css',
})
export class GlobalSearch {
  iconService = inject(IconService);
}
