import { buildSparkline } from './sparkline';

describe('buildSparkline', () => {
  it('devuelve una cadena vacía sin valores', () => {
    expect(buildSparkline([])).toBe('');
  });

  it('dibuja un punto centrado sin generar NaN', () => {
    expect(buildSparkline([42])).toBe('0.0,28.0');
  });

  it('respeta el alto disponible cuando todos los valores son iguales', () => {
    const points = buildSparkline([10, 10, 10]).split(' ');

    expect(points).toHaveLength(3);
    expect(points.every((point) => point.endsWith(',28.0'))).toBe(true);
  });
});
