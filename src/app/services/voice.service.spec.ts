import { TestBed } from '@angular/core/testing';
import { VoiceService } from './voice.service';

describe('VoiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('abre y cierra el panel compartido', () => {
    const voice = TestBed.inject(VoiceService);

    expect(voice.panelOpen()).toBe(false);
    voice.openPanel();
    expect(voice.panelOpen()).toBe(true);
    voice.closePanel();
    expect(voice.panelOpen()).toBe(false);
  });

  it('avisa cuando el navegador no soporta reconocimiento de voz', () => {
    const voice = TestBed.inject(VoiceService);

    expect(voice.isSupported()).toBe(false);
    voice.start();
    expect(voice.error()).toContain('no soporta');
  });

  it('limpia la transcripción y los errores', () => {
    const voice = TestBed.inject(VoiceService);

    voice.start();
    voice.reset();

    expect(voice.error()).toBeNull();
    expect(voice.transcript()).toBe('');
    expect(voice.interim()).toBe('');
  });
});

/** Motor de reconocimiento falso para probar el encendido/apagado manual. */
class FakeRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  startCount = 0;
  stopCount = 0;
  abortCount = 0;
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onresult: ((event: Event) => void) | null = null;

  start(): void {
    this.startCount += 1;
  }

  stop(): void {
    this.stopCount += 1;
  }

  abort(): void {
    this.abortCount += 1;
  }

  emitEnd(): void {
    this.onend?.(new Event('end'));
  }
}

describe('VoiceService con micrófono disponible', () => {
  let fake: FakeRecognition;

  beforeEach(() => {
    fake = new FakeRecognition();
    (window as unknown as Record<string, unknown>)['SpeechRecognition'] = function () {
      return fake;
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as Record<string, unknown>)['SpeechRecognition'];
  });

  it('usa reconocimiento continuo y se enciende al pedirlo', () => {
    const voice = TestBed.inject(VoiceService);

    voice.openPanel();
    voice.start();

    expect(fake.continuous).toBe(true);
    expect(fake.startCount).toBe(1);
    expect(voice.isListening()).toBe(true);
  });

  it('sigue encendido y se rearma cuando el navegador lo apaga por una pausa', () => {
    vi.useFakeTimers();
    const voice = TestBed.inject(VoiceService);

    voice.openPanel();
    voice.start();
    fake.emitEnd();

    expect(voice.isListening()).toBe(true);

    vi.advanceTimersByTime(400);

    expect(fake.startCount).toBe(2);
    expect(voice.isListening()).toBe(true);
  });

  it('se apaga sólo cuando el usuario lo pide y no se vuelve a encender', () => {
    vi.useFakeTimers();
    const voice = TestBed.inject(VoiceService);

    voice.openPanel();
    voice.start();
    voice.stop();

    fake.emitEnd();
    vi.advanceTimersByTime(500);

    expect(voice.isListening()).toBe(false);
    expect(fake.stopCount).toBe(1);
    expect(fake.startCount).toBe(1);
  });
});
