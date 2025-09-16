import morgan from 'morgan';
import type { Request, Response, NextFunction } from 'express';
import process from 'node:process';
import { loggingService } from '../../services/loggingService.js';

// Performance monitoring helper
export function logPerformance(
  method: string,
  path: string,
  startTime: number,
  status: number = 200,
) {
  const duration = performance.now() - startTime;
  console.log(`📊 ${method} ${path} - ${duration.toFixed(2)}ms - ${status}`);
}

// Custom Morgan token for response time
morgan.token('response-time-custom', (_req: Request, _res: Response) => {
  const start = process.hrtime.bigint();
  const diff = process.hrtime.bigint() - start;
  return (Number(diff) / 1000000).toFixed(2); // Convert to milliseconds
});

// Enhanced logging middleware with structured logging (FR-13)
export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();

  // Log request start
  loggingService.logDebug('HTTP request started', {
    metadata: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    },
  });

  // Use Morgan for basic HTTP logging
  morgan(':method :url :status :response-time-custom ms - :res[content-length]', {
    skip: (req: Request) => {
      // Skip logging for static assets in production
      return (
        process.env.NODE_ENV === 'production' &&
        (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css'))
      );
    },
    stream: {
      write: (message: string) => {
        // Parse Morgan output and create structured log entry
        const parts = message.trim().split(' ');
        if (parts.length >= 3) {
          const method = parts[0];
          const url = parts[1];
          const status = parseInt(parts[2]);
          const duration = performance.now() - startTime;

          loggingService.logInfo('HTTP request completed', {
            metadata: {
              method,
              url,
              status,
              duration: `${duration.toFixed(2)}ms`,
              contentLength: parts[4] || '0',
            },
          });
        }
      },
    },
  })(req, res, next);
}
