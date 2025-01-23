import NodeCache from 'node-cache';
import type { Request, Response, NextFunction } from 'express';

// Initialize cache with default TTL of 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

export interface CacheOptions {
  ttl: number;
}

type JsonResponse = Response['json'];

export const cacheMiddleware = (options: CacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Generate cache key from request path and query
      const key = `${req.originalUrl || req.url}`;
      const cachedResponse = cache.get(key);

      if (cachedResponse) {
        res.json(cachedResponse);
        return;
      }

      // Store original res.json method
      const originalJson: JsonResponse = res.json;

      // Override res.json method to cache response
      res.json = function(body) {
        cache.set(key, body, options.ttl);
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Cache invalidation helper
export const invalidateCache = (key: string): void => {
  cache.del(key);
};

// Clear entire cache
export const clearCache = (): void => {
  cache.flushAll();
}; 