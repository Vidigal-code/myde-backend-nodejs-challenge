/** Token de injeção do provider Meta (real ou simulado). */
export const META_PROVIDER = Symbol('META_PROVIDER');

/** Parâmetros para enviar uma mensagem de texto via Meta WhatsApp. */
export interface SendTextParams {
  phoneNumberId: string;
  to: string;
  text: string;
}

/** Resultado do envio: id da mensagem retornado pela Meta (ou simulado). */
export interface SendTextResult {
  messageId: string;
}

/** Contrato comum ao envio real (HTTP) e ao simulado. */
export interface MetaProvider {
  sendText(params: SendTextParams): Promise<SendTextResult>;
}
