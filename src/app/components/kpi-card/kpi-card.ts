import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  imports: [],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard {
  @Input() label = '';
  @Input() value = '';
  @Input() delta = '';
  @Input() down = false;
  @Input() points = '';
}
