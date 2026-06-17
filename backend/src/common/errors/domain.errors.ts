/** Erros de domínio reutilizáveis, independentes do framework HTTP. */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Recurso não encontrado (ex.: conversa de outro tenant). */
export class NotFoundDomainError extends DomainError {}

/** Tenant não pôde ser resolvido a partir do payload/credenciais. */
export class TenantResolutionError extends DomainError {}

/** Falha ao gerar a resposta da IA mesmo após o fallback. */
export class LlmGenerationError extends DomainError {}
