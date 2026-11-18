import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INCOME_CATEGORY } from '../../models/transaction.model';
import { Transactions } from './transactions';

describe('Transactions', () => {
  let component: Transactions;
  let fixture: ComponentFixture<Transactions>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Transactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ofrece todas las categorías de gasto por defecto', () => {
    expect(component.categoryOptions()).toContain('Alimentos');
    expect(component.categoryOptions()).not.toContain(INCOME_CATEGORY);
  });

  it('al cambiar a ingreso deja solo la categoría de ingresos y limpia la anterior', () => {
    component.transactionForm.controls.category.setValue('Alimentos');
    component.transactionForm.controls.type.setValue('income');

    component.onTypeChange();

    expect(component.categoryOptions()).toEqual([INCOME_CATEGORY]);
    expect(component.transactionForm.controls.category.value).toBe('');
  });

  it('pagina el listado y reinicia la página al cambiar de día', () => {
    component.page.set(5);
    component.selectDay(component.todayIso);

    expect(component.page()).toBe(1);
    expect(component.pagedTransactions().length).toBeLessThanOrEqual(component.pageSize);

    component.goToPage(999);
    expect(component.currentPage()).toBe(component.totalPages());
  });

  it('abre el calendario, aplica la fecha elegida y lo cierra', () => {
    component.openCalendar();
    expect(component.isCalendarOpen()).toBe(true);

    component.onDateSelected('2026-11-03');

    expect(component.selectedDate()).toBe('2026-11-03');
    expect(component.page()).toBe(1);
    expect(component.isCalendarOpen()).toBe(false);
  });

  it('cierra el calendario sin cambiar la fecha', () => {
    const initialDate = component.selectedDate();

    component.openCalendar();
    component.closeCalendar();

    expect(component.isCalendarOpen()).toBe(false);
    expect(component.selectedDate()).toBe(initialDate);
  });
});
