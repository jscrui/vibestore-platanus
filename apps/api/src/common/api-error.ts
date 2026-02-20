import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super({ errorCode, message, details }, status);
  }
}
