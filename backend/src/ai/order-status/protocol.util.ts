/** Detecta um protocolo de pedido no formato PED-XXXX dentro de um texto livre. */
export function extractProtocol(text: string): string | null {
  const match = /PED-\d+/i.exec(text);
  return match ? match[0].toUpperCase() : null;
}
