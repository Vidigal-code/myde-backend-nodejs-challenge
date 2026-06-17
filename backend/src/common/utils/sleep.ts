/** Espera `ms` milissegundos. Reutilizado para backoff simples em loops de polling. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
