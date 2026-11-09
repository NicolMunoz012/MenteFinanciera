import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

/**
 * Tipos mínimos de la API Web Speech (no viene en la librería estándar de
 * TypeScript). Se declaran aquí para poder usar SpeechRecognition sin `any`.
 */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Diste permiso denegado al micrófono. Actívalo en el navegador o escribe el movimiento.',
  'audio-capture': 'No se encontró un micrófono disponible. Revisa tu equipo o escribe el movimiento.',
  'no-speech': 'No escuché nada. Inténtalo de nuevo o escribe el movimiento.',
  network: 'El reconocimiento de voz necesita conexión a internet en este navegador.',
  aborted: 'La grabación se canceló.',
};

/**
 * Estado compartido del agente de voz. Envuelve SpeechRecognition/webkitSpeechRecognition
 * y mantiene el panel abierto aunque el usuario cambie de página.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly panelOpenState = signal(false);
  private readonly listeningState = signal(false);
  private readonly supportedState = signal(false);
  private readonly transcriptState = signal('');
  private readonly interimState = signal('');
  private readonly errorState = signal<string | null>(null);

  readonly panelOpen = this.panelOpenState.asReadonly();
  readonly isListening = this.listeningState.asReadonly();
  readonly isSupported = this.supportedState.asReadonly();
  readonly transcript = this.transcriptState.asReadonly();
  readonly interim = this.interimState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly hasText = computed(
    () => this.transcriptState().trim().length > 0 || this.interimState().trim().length > 0,
  );

  private recognition: SpeechRecognitionLike | null = null;

  /**
   * El navegador cierra la sesión de reconocimiento cuando hay silencio, aunque
   * `continuous` esté activo. Estas banderas permiten distinguir ese cierre
   * automático de un apagado hecho por el usuario: si `wantListening` sigue en
   * true, el micrófono se vuelve a encender solo; si el usuario pulsa el botón,
   * se apaga y ya no se reintenta.
   */
  private wantListening = false;
  private active = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'es-CO';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.supportedState.set(true);
      this.bindRecognitionEvents();
    }

    this.destroyRef.onDestroy(() => {
      this.clearRestartTimer();
      this.recognition?.abort();
    });
  }

  /** Abre el panel (lo usan el botón del topbar y la tarjeta del dashboard). */
  openPanel(): void {
    this.errorState.set(null);
    this.panelOpenState.set(true);
  }

  closePanel(): void {
    this.stop();
    this.panelOpenState.set(false);
  }

  start(): void {
    if (!this.recognition) {
      this.errorState.set(
        'Tu navegador no soporta reconocimiento de voz. Escribe el movimiento en el campo de texto.',
      );
      return;
    }
    if (this.wantListening) {
      return;
    }

    this.errorState.set(null);
    this.interimState.set('');
    this.wantListening = true;
    this.beginRecognition();
  }

  stop(): void {
    // Apagado explícito del usuario: se cancela cualquier reintento pendiente.
    this.wantListening = false;
    this.clearRestartTimer();
    this.active = false;
    this.listeningState.set(false);
    this.interimState.set('');

    try {
      this.recognition?.stop();
    } catch {
      // Si el motor todavía no había empezado, no hay nada que detener.
    }
  }

  reset(): void {
    this.stop();
    this.transcriptState.set('');
    this.interimState.set('');
    this.errorState.set(null);
  }

  /** Quita un error anterior (por ejemplo, al continuar con la alternativa de texto). */
  clearError(): void {
    this.errorState.set(null);
  }

  private bindRecognitionEvents(): void {
    if (!this.recognition) {
      return;
    }

    this.recognition.onstart = () => {
      this.active = true;
      this.listeningState.set(true);
      this.errorState.set(null);
    };

    this.recognition.onend = () => {
      this.active = false;
      this.interimState.set('');

      // Si el usuario no lo apagó, fue el navegador quien cerró la sesión por
      // silencio: se vuelve a encender para que el micrófono siga disponible.
      if (this.wantListening && this.panelOpenState()) {
        this.listeningState.set(true);
        this.scheduleRestart();
        return;
      }

      this.listeningState.set(false);
    };

    this.recognition.onerror = (event) => {
      this.active = false;
      this.interimState.set('');

      // "aborted" es el cierre normal cuando el usuario apaga el micrófono.
      if (event.error === 'aborted' && !this.wantListening) {
        this.listeningState.set(false);
        return;
      }

      // El silencio o un aborto inesperado no deben apagar el micrófono.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (this.wantListening && this.panelOpenState()) {
          this.listeningState.set(true);
          this.scheduleRestart();
          return;
        }
        this.listeningState.set(false);
        return;
      }

      // Errores de permiso, micrófono o red: se apaga y se explica al usuario.
      this.wantListening = false;
      this.clearRestartTimer();
      this.listeningState.set(false);
      this.errorState.set(
        ERROR_MESSAGES[event.error] ?? 'No se pudo completar el reconocimiento de voz.',
      );
    };

    this.recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      // Sólo se procesan los resultados nuevos de esta interacción.
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += `${text} `;
        } else {
          interimText += `${text} `;
        }
      }

      if (finalText.trim().length > 0) {
        this.transcriptState.update((previous) =>
          `${previous} ${finalText}`.replace(/\s+/g, ' ').trim(),
        );
      }
      this.interimState.set(interimText.trim());
    };
  }

  /** Enciende el motor de reconocimiento y refleja el estado de inmediato. */
  private beginRecognition(): void {
    if (!this.recognition || this.active) {
      return;
    }

    try {
      this.recognition.start();
      this.active = true;
      this.listeningState.set(true);
    } catch {
      this.active = false;
      this.wantListening = false;
      this.listeningState.set(false);
      this.errorState.set('No se pudo iniciar el micrófono. Inténtalo otra vez.');
    }
  }

  /** Rearma el micrófono cuando el navegador lo apagó por una pausa. */
  private scheduleRestart(): void {
    if (this.restartTimer !== null) {
      return;
    }

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.wantListening || !this.panelOpenState() || this.active) {
        return;
      }
      this.beginRecognition();
    }, 350);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}
