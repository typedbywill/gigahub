import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiErrorEnvelope } from '@gigahub/shared/contracts';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string) || exception.message;
        code = (resObj['error'] as string) || 'HTTP_ERROR';
        details = resObj['details'] || (Array.isArray(resObj['message']) ? resObj['message'] : null);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const traceId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-trace-id'] as string) ||
      `trace-${Date.now()}`;

    const envelope: ApiErrorEnvelope = {
      code,
      message,
      details,
      traceId,
    };

    response.status(status).json(envelope);
  }
}
