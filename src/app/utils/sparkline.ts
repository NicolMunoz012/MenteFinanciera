const WIDTH = 80;
const HEIGHT = 32;
const VERTICAL_PADDING = 4;

export function buildSparkline(values: number[]): string {
  if (values.length === 0) {
    return '';
  }

  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  // Con un solo punto no hay recorrido horizontal: se dibuja centrado a la izquierda.
  const stepX = values.length > 1 ? WIDTH / (values.length - 1) : 0;
  const usableHeight = HEIGHT - VERTICAL_PADDING * 2;

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = HEIGHT - VERTICAL_PADDING - ((value - min) / range) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
