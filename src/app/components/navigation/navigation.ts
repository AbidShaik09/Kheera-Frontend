import { Component, input, InputSignal, signal, Signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';

export type NavRouteType = {
  name: string;
  link: string;
  isSelected?: boolean;
};
@Component({
  selector: 'app-navigation',
  imports: [RouterLink],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation {
  route: InputSignal<NavRouteType> | InputSignal<NavRouteType> = input<NavRouteType>({
    name: '',
    link: '/',
  });
  isSelected: WritableSignal<boolean> = signal(this.route().isSelected ?? false);
}
