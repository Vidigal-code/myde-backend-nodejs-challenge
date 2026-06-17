import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Pipe genérico e reutilizável: valida qualquer entrada contra um schema zod
 * e retorna o dado já tipado, ou lança 400 com as mensagens de erro.
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      throw new BadRequestException(`Payload inválido: ${message}`);
    }
    return result.data;
  }
}
