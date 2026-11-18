import { Component, inject } from '@angular/core';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-voice-agent-card',
  imports: [],
  templateUrl: './voice-agent-card.html',
  styleUrl: './voice-agent-card.scss',
})
export class VoiceAgentCard {
  readonly voice = inject(VoiceService);
}
