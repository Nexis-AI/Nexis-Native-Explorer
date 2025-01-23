import type { Request, Response, NextFunction } from 'express';

interface ErrorData {
  [key: string]: unknown;
}

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  data?: ErrorData;

  constructor(message: string, statusCode: number, data?: ErrorData) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(err.data && { data: err.data })
  });
}; 