import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Calcula a assinatura no MESMO formato que a Meta envia:
 *   "sha256=" + HMAC-SHA256(corpoCru, appSecret)
 * O corpo precisa ser exatamente os bytes recebidos (raw body).
 */
export function computeSignature(rawBody: Buffer | string, appSecret: string): string {
  const hmac = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return `${SIGNATURE_PREFIX}${hmac}`;
}

/**
 * Compara a assinatura recebida com a esperada em tempo constante (evita timing attacks).
 * Retorna false se faltar header, formato divergir ou tamanhos não baterem.
 */
export function verifySignature(
  rawBody: Buffer | string,
  appSecret: string,
  receivedSignature: string | undefined | null,
): boolean {
  if (!receivedSignature || !receivedSignature.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }
  const expected = computeSignature(rawBody, appSecret);
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(receivedSignature);
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, receivedBuf);
}
