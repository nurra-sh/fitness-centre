import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { APP_TOAST_KEY } from './core/constants/toats.constants';

@Component({
  imports: [RouterOutlet, ToastModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('fitness-centre-frontend');
  protected readonly toastKey = APP_TOAST_KEY;
}
