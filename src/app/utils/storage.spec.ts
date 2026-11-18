import { saveToStorage } from './storage';

describe('saveToStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda el valor y devuelve true', () => {
    expect(saveToStorage('mf.test', { value: 1 })).toBe(true);
    expect(localStorage.getItem('mf.test')).toBe('{"value":1}');
  });

  it('no rompe la aplicación cuando el almacenamiento falla', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => saveToStorage('mf.test', { value: 1 })).not.toThrow();
    expect(saveToStorage('mf.test', { value: 1 })).toBe(false);
  });
});
