import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/auth';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { withValidation } from '@/lib/middleware/validation';
import { withErrorHandling } from '@/lib/middleware/errorHandling';
import { withSecurityHeaders } from '@/lib/middleware/securityHeaders'; // Add this import

export const createSecureHandler = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: {
    requireAuth?: boolean;
    rateLimit?: { requests: number; windowMs: number };
    validation?: z.ZodSchema;
  } = {}
) => {
  let wrappedHandler = handler;

  // Apply middleware in reverse order
  if (options.validation) {
    wrappedHandler = withValidation(options.validation)(wrappedHandler);
  }

  if (options.rateLimit) {
    wrappedHandler = withRateLimit(
      options.rateLimit.requests,
      options.rateLimit.windowMs
    )(wrappedHandler);
  }

  if (options.requireAuth) {
    wrappedHandler = withAuth(wrappedHandler);
  }

  // Add security headers
  wrappedHandler = withSecurityHeaders()(wrappedHandler); // Add this line

  // Always apply error handling
  wrappedHandler = withErrorHandling(wrappedHandler);

  return wrappedHandler;
};