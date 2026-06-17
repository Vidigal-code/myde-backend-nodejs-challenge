/** Modo efetivo após resolver "auto" contra a presença (ou não) de credencial. */
export type EffectiveMode = 'real' | 'simulated';
export type ConfiguredMode = 'auto' | EffectiveMode;

/** Valores de exemplo do .env.example que NÃO contam como credencial real. */
const PLACEHOLDER_MARKERS = ['troque', 'mock-token', 'changeme', 'your-key'];

/** Uma string só é "credencial de verdade" se não for vazia nem um placeholder conhecido. */
export function isMeaningfulSecret(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

/**
 * Decide o modo efetivo de um provedor de forma reutilizável:
 *   real/simulated -> respeitados; auto -> real se houver credencial, senão simulated.
 */
export function resolveMode(
  configured: ConfiguredMode,
  hasCredential: boolean,
): EffectiveMode {
  if (configured === 'real') return 'real';
  if (configured === 'simulated') return 'simulated';
  return hasCredential ? 'real' : 'simulated';
}
