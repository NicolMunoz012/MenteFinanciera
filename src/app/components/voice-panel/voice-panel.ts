import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  isDevMode,
  OnChanges,
  OnDestroy,
  signal,
  SimpleChanges,
  ViewChild,
  effect,
  computed,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { INCOME_CATEGORY, TransactionType } from '../../models/transaction.model';
import { FinanceService } from '../../services/finance.service';
import { VoiceService } from '../../services/voice.service';
import { today } from '../../utils/dates';
import { formatCurrency } from '../../utils/format';
import { ParsedVoiceTransaction, parseVoiceTransactions } from '../../utils/voice-parser';
import { FormField } from '../form-field/form-field';

type VoiceDraftForm = FormGroup<{
  name: FormControl<string>;
  amount: FormControl<number>;
  type: FormControl<TransactionType>;
  category: FormControl<string>;
  date: FormControl<string>;
}>;

@Component({
  selector: 'app-voice-panel',
  imports: [CommonModule, ReactiveFormsModule, FormField],
  templateUrl: './voice-panel.html',
  styleUrl: './voice-panel.scss',
})
export class VoicePanel implements OnChanges, AfterViewInit, AfterViewChecked, OnDestroy {
  @Input() open = false;

  @ViewChild('textInput') private textInput?: ElementRef<HTMLInputElement>;

  private readonly voiceService = inject(VoiceService);
  private readonly finance = inject(FinanceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly voice = this.voiceService;
  readonly todayIso = today();

  /** Texto escrito a mano cuando el micrófono no está disponible. */
  readonly textInputValue = signal('');
  readonly success = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly parseNote = signal<string | null>(null);

  /** Un formulario por cada movimiento detectado (o añadido a mano). */
  readonly drafts = signal<VoiceDraftForm[]>([]);

  readonly expenseCategories = computed(() =>
    this.finance.categories().map((category) => category.name),
  );

  private lastParsedTranscript = '';
  private focusPending = false;

  constructor() {
    // Cuando el reconocimiento produce texto final, se interpreta y se llenan
    // los formularios para que el usuario los confirme o los corrija.
    effect(() => {
      const transcript = this.voice.transcript();
      if (transcript.trim().length === 0 || transcript === this.lastParsedTranscript) {
        return;
      }
      this.lastParsedTranscript = transcript;
      this.applyParsed(transcript);
    });

    this.resetForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const openChange = changes['open'];
    if (!openChange) {
      return;
    }

    if (openChange.currentValue === true && openChange.previousValue !== true) {
      this.preparePanel();
    }

    if (openChange.currentValue === false && openChange.previousValue === true) {
      this.voice.stop();
    }

    this.setBodyScrollLocked(openChange.currentValue === true);
  }

  ngAfterViewInit(): void {
    if (this.open) {
      this.focusPending = true;
    }
  }

  ngAfterViewChecked(): void {
    if (this.open && this.focusPending) {
      this.focusPending = false;
      this.textInput?.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.voice.stop();
    this.setBodyScrollLocked(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  toggleListening(): void {
    if (!this.voice.isSupported()) {
      this.parseNote.set('El micrófono no está disponible. Escribe los movimientos abajo.');
      this.textInput?.nativeElement.focus();
      return;
    }

    if (this.voice.isListening()) {
      this.voice.stop();
      return;
    }

    this.success.set(null);
    this.saveError.set(null);
    this.voice.reset();
    this.lastParsedTranscript = '';
    this.voice.start();
  }

  onTextInput(event: Event): void {
    this.textInputValue.set((event.target as HTMLInputElement).value);
  }

  interpretText(): void {
    const text = this.textInputValue().trim();
    if (text === '') {
      this.parseNote.set('Escribe frases como “Gasté 25.000 en almuerzo y 30.000 en taxi”.');
      return;
    }
    this.applyParsed(text);
  }

  /** Opciones de categoría según el tipo de un movimiento concreto. */
  categoryOptions(type: TransactionType): string[] {
    return type === 'income' ? [INCOME_CATEGORY] : this.expenseCategories();
  }

  onDraftTypeChange(draft: VoiceDraftForm): void {
    const options = this.categoryOptions(draft.controls.type.value);
    if (!options.includes(draft.controls.category.value)) {
      draft.controls.category.setValue(options[0] ?? '');
    }
    this.saveError.set(null);
  }

  addDraft(): void {
    this.drafts.update((list) => [...list, this.createDraft()]);
    this.success.set(null);
    this.saveError.set(null);
  }

  removeDraft(index: number): void {
    this.drafts.update((list) => {
      const next = list.filter((_, position) => position !== index);
      return next.length > 0 ? next : [this.createDraft()];
    });
    this.success.set(null);
    this.saveError.set(null);
  }

  save(): void {
    const drafts = this.drafts();
    if (drafts.length === 0) {
      this.saveError.set('Añade al menos un movimiento antes de guardar.');
      return;
    }

    for (const draft of drafts) {
      draft.markAllAsTouched();
    }

    if (drafts.some((draft) => draft.invalid)) {
      this.saveError.set('Revisa la descripción, el monto y la categoría de cada movimiento.');
      return;
    }

    const savedValues: { name: string; amount: number }[] = [];
    const rejected: string[] = [];

    for (const draft of drafts) {
      const value = draft.getRawValue();
      if (this.finance.addTransaction({ ...value, source: 'voice' })) {
        savedValues.push(value);
      } else {
        rejected.push(value.name);
      }
    }

    if (savedValues.length === 0) {
      this.saveError.set('No se pudo guardar ningún movimiento. Revisa los datos.');
      return;
    }

    const total = savedValues.reduce((sum, value) => sum + value.amount, 0);
    this.success.set(
      savedValues.length === 1
        ? `Movimiento guardado: ${savedValues[0].name} por ${formatCurrency(savedValues[0].amount)}.`
        : `${savedValues.length} movimientos guardados por ${formatCurrency(total)}.`,
    );
    this.saveError.set(
      rejected.length > 0 ? `No se pudieron guardar: ${rejected.join(', ')}.` : null,
    );
    this.parseNote.set(null);
    this.voice.reset();
    this.lastParsedTranscript = '';
    this.textInputValue.set('');
    this.resetForm();
  }

  close(): void {
    this.voice.reset();
    this.voice.closePanel();
    this.lastParsedTranscript = '';
    this.textInputValue.set('');
    this.success.set(null);
    this.saveError.set(null);
    this.parseNote.set(null);
    this.resetForm();
  }

  onBackdropClick(event: MouseEvent): void {
    // Sólo cierra si el clic fue realmente en el fondo y no dentro del panel.
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private applyParsed(text: string): void {
    const parsed = parseVoiceTransactions(text, this.expenseCategories(), this.todayIso);

    this.textInputValue.set(text);
    this.voice.clearError();
    this.drafts.set(parsed.map((movement) => this.createDraft(movement)));

    const missingAmount = parsed.filter((movement) => movement.amount <= 0).length;
    if (missingAmount > 0) {
      this.parseNote.set('Algunos movimientos no tienen monto. Escríbelo en el formulario.');
    } else if (parsed.length > 1) {
      this.parseNote.set(
        `Detecté ${parsed.length} movimientos. Revisa cada uno y guárdalos juntos.`,
      );
    } else {
      this.parseNote.set(null);
    }

    this.saveError.set(null);
    this.success.set(null);

    // Punto de depuración opcional: se activa sólo si se abre la consola y se
    // ejecuta localStorage.setItem('mf.debugVoice', 'true'). Así el `debugger`
    // no interrumpe el uso normal de la aplicación.
    if (isDevMode() && localStorage.getItem('mf.debugVoice') === 'true') {
      debugger;
    }
  }

  private preparePanel(): void {
    this.success.set(null);
    this.saveError.set(null);
    this.parseNote.set(null);

    if (this.voice.transcript().trim().length === 0) {
      this.resetForm();
    }

    this.focusPending = true;
  }

  private resetForm(): void {
    this.drafts.set([this.createDraft()]);
  }

  private createDraft(parsed?: ParsedVoiceTransaction): VoiceDraftForm {
    const type = parsed?.type ?? 'expense';
    const options = this.categoryOptions(type);
    const category =
      parsed && options.includes(parsed.category) ? parsed.category : (options[0] ?? '');

    return this.formBuilder.nonNullable.group({
      name: [parsed?.name ?? '', [Validators.required, Validators.minLength(3)]],
      amount: [parsed?.amount ?? 0, [Validators.required, Validators.min(0.01)]],
      type: [type, [Validators.required]],
      category: [category, [Validators.required]],
      date: [parsed?.date ?? this.todayIso, [Validators.required]],
    });
  }

  private setBodyScrollLocked(locked: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = locked ? 'hidden' : '';
  }
}
