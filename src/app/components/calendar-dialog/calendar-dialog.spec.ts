import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDialog } from './calendar-dialog';

describe('CalendarDialog', () => {
  let component: CalendarDialog;
  let fixture: ComponentFixture<CalendarDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CalendarDialog] }).compileComponents();

    fixture = TestBed.createComponent(CalendarDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('avisa cuando se elige una fecha o se cierra', () => {
    let selected = '';
    let closed = 0;
    component.dateSelected.subscribe((date) => {
      selected = date;
    });
    component.closed.subscribe(() => {
      closed += 1;
    });

    component.choose('2026-11-02');
    component.close();

    expect(selected).toBe('2026-11-02');
    expect(closed).toBe(1);
  });

  it('bloquea el scroll mientras está abierto', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });
});
