import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates an in-memory rate limiter middleware
 * @param windowMs Time window in milliseconds
 * @param maxRequests Maximum allowed requests per window per IP
 * @param message Custom error message
 */
export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 15,
  message: string = 'Too many attempts. Please try again later.'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    const effectiveLimit = isLoopback ? 1000 : maxRequests;
    const now = Date.now();

    const record = ipRequestMap.get(ip);

    if (!record || now > record.resetTime) {
      ipRequestMap.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= effectiveLimit) {
      const waitSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: waitSeconds,
      });
      return;
    }

    record.count++;
    next();
  };
}

export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes window
  20,             // 20 attempts
  'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.'
);
