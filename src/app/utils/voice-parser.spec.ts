import { addDays } from './dates';
import { parseVoiceTransaction, parseVoiceTransactions } from './voice-parser';

const CATEGORIES = ['Alimentos', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Otros'];
const TODAY = '2026-03-15';

describe('parseVoiceTransaction', () => {
  it('interpreta un gasto con monto y categoría', () => {
    const result = parseVoiceTransaction('Gasté 25.000 en almuerzo', CATEGORIES, TODAY);

    expect(result.type).toBe('expense');
    expect(result.amount).toBe(25000);
    expect(result.category).toBe('Alimentos');
    expect(result.date).toBe(TODAY);
  });

  it('detecta un ingreso por palabras como "recibí"', () => {
    const result = parseVoiceTransaction('Recibí 1.200.000 de salario', CATEGORIES, TODAY);

    expect(result.type).toBe('income');
    expect(result.amount).toBe(1200000);
    expect(result.category).toBe('Ingresos');
  });

  it('admite separadores decimales y de miles', () => {
    expect(parseVoiceTransaction('Pagué 1.234,56 en internet', CATEGORIES, TODAY).amount).toBe(1234.56);
    expect(parseVoiceTransaction('Compré 25,50 en café', CATEGORIES, TODAY).amount).toBe(25.5);
  });

  it('multiplica por mil y por millón', () => {
    expect(parseVoiceTransaction('Compré 50 mil en taxi', CATEGORIES, TODAY).amount).toBe(50000);
    expect(parseVoiceTransaction('Gané 1.5 millones de bono', CATEGORIES, TODAY).amount).toBe(1500000);
  });

  it('usa sinónimos para asignar la categoría real', () => {
    expect(parseVoiceTransaction('Pagué 30.000 de taxi', CATEGORIES, TODAY).category).toBe('Transporte');
    expect(parseVoiceTransaction('Gasté 80.000 en farmacia', CATEGORIES, TODAY).category).toBe('Salud');
  });

  it('usa "Otros" cuando no reconoce la categoría', () => {
    const result = parseVoiceTransaction('Gasté 12.000 en algo raro', CATEGORIES, TODAY);

    expect(result.category).toBe('Otros');
  });

  it('detecta ayer y anteayer', () => {
    expect(parseVoiceTransaction('Gasté 10.000 en comida ayer', CATEGORIES, TODAY).date).toBe(
      addDays(TODAY, -1),
    );
    expect(parseVoiceTransaction('Gasté 10.000 en comida anteayer', CATEGORIES, TODAY).date).toBe(
      addDays(TODAY, -2),
    );
  });

  it('devuelve monto 0 si la frase no trae números', () => {
    const result = parseVoiceTransaction('Gasté en almuerzo', CATEGORIES, TODAY);

    expect(result.amount).toBe(0);
    expect(result.type).toBe('expense');
  });
});

describe('parseVoiceTransactions', () => {
  it('separa varios gastos unidos por "y"', () => {
    const result = parseVoiceTransactions('Gasté 20.000 en comida y 30.000 en taxi', CATEGORIES, TODAY);

    expect(result.length).toBe(2);
    expect(result[0]).toMatchObject({ amount: 20000, category: 'Alimentos', type: 'expense' });
    expect(result[1]).toMatchObject({ amount: 30000, category: 'Transporte', type: 'expense' });
  });

  it('combina gastos e ingresos en la misma frase', () => {
    const result = parseVoiceTransactions(
      'Gasté 20.000 en comida, pagué 30.000 en taxi y recibí 1.000.000 de salario',
      CATEGORIES,
      TODAY,
    );

    expect(result.map((movement) => movement.type)).toEqual(['expense', 'expense', 'income']);
    expect(result.map((movement) => movement.amount)).toEqual([20000, 30000, 1000000]);
    expect(result[2].category).toBe('Ingresos');
  });

  it('hereda el tipo y la fecha del movimiento anterior', () => {
    const result = parseVoiceTransactions('Ayer gasté 20.000 en comida y 30.000 en taxi', CATEGORIES, TODAY);

    expect(result.map((movement) => movement.date)).toEqual([
      addDays(TODAY, -1),
      addDays(TODAY, -1),
    ]);
    expect(result.map((movement) => movement.type)).toEqual(['expense', 'expense']);
  });

  it('mantiene el ingreso cuando el segundo monto no repite el verbo', () => {
    const result = parseVoiceTransactions('Recibí 1.000.000 de salario y 200.000 de bono', CATEGORIES, TODAY);

    expect(result.length).toBe(2);
    expect(result.every((movement) => movement.type === 'income')).toBe(true);
  });

  it('no separa una sola compra con varios productos', () => {
    const result = parseVoiceTransactions('Compré pan y leche por 20.000', CATEGORIES, TODAY);

    expect(result.length).toBe(1);
    expect(result[0].amount).toBe(20000);
  });

  it('reconoce un ingreso mencionado después de un gasto', () => {
    const result = parseVoiceTransactions(
      'Gasté 20.000 en comida y tuve un ingreso de 500.000',
      CATEGORIES,
      TODAY,
    );

    expect(result.length).toBe(2);
    expect(result[1].type).toBe('income');
    expect(result[1].amount).toBe(500000);
  });
});
