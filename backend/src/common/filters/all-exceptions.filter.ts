import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { NotFoundDomainError } from '../errors/domain.errors';

/** Converte qualquer exceção em resposta JSON consistente e loga o erro. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const { status, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${status} ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      statusCode: status,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), message: exception.message };
    }
    if (exception instanceof NotFoundDomainError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }
    if (exception instanceof Error) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno' };
  }
}
