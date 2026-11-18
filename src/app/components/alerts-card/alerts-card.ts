import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertItem } from '../../models/alert.model';

@Component({
  selector: 'app-alerts-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './alerts-card.html',
  styleUrl: './alerts-card.scss',
})
export class AlertsCard {
  @Input() alerts: AlertItem[] = [];
}
