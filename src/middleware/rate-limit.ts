import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

type RateLimitHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

const createLimitHandler = (message: string): RateLimitHandler => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    const error = new AppError(message, 429);
    next(error);
  };
};

// Create a limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (_req, _res, next) => {
    next(new AppError('Too many requests from this IP, please try again later', 429));
  }
});

// More strict limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  handler: createLimitHandler('Too many authentication attempts, please try again later')
});

// Specific limiter for high-traffic endpoints
export const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  handler: createLimitHandler('Search rate limit exceeded')
}); 