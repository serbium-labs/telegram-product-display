import type { NextFunction, Request, Response } from 'express';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'self' https://web.telegram.org",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' https://telegram.org",
  "style-src 'self'",
].join('; ');
const PERMISSIONS_POLICY = 'camera=(), geolocation=(), microphone=()';
const REFERRER_POLICY = 'no-referrer';

export function setSecurityHeaders(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  response.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  response.setHeader('Referrer-Policy', REFERRER_POLICY);
  response.setHeader('X-Content-Type-Options', 'nosniff');

  next();
}
