import { isMeaningfulSecret, resolveMode } from '@/config/provider-mode.util';

describe('provider-mode.util (seleção híbrida)', () => {
  describe('isMeaningfulSecret', () => {
    it('considera vazio/placeholder como SEM credencial', () => {
      expect(isMeaningfulSecret('')).toBe(false);
      expect(isMeaningfulSecret('sk-proj-troque-pela-sua-chave')).toBe(false);
      expect(isMeaningfulSecret('mock-token')).toBe(false);
    });

    it('considera uma chave real como credencial válida', () => {
      expect(isMeaningfulSecret('sk-proj-abc123realkey')).toBe(true);
    });
  });

  describe('resolveMode', () => {
    it('respeita real/simulated explícitos', () => {
      expect(resolveMode('real', false)).toBe('real');
      expect(resolveMode('simulated', true)).toBe('simulated');
    });

    it('em auto, decide pela presença de credencial', () => {
      expect(resolveMode('auto', true)).toBe('real');
      expect(resolveMode('auto', false)).toBe('simulated');
    });
  });
});
