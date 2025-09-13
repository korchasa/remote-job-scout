import morgan from 'morgan';
import type { Request, Response } from 'express';
import process from 'node:process';

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

// Morgan middleware with custom format
export const loggingMiddleware = morgan(
  ':method :url :status :response-time-custom ms - :res[content-length]',
  {
    skip: (req: Request) => {
      // Skip logging for static assets in production
      return (
        process.env.NODE_ENV === 'production' &&
        (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css'))
      );
    },
  },
);
