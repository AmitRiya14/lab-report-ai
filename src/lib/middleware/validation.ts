import { NextApiRequest, NextApiResponse } from 'next';
import { z, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export const withValidation = (schema: z.ZodSchema) => {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Validate request body
        const validatedData = schema.parse(req.body);
        
        // Sanitize text inputs (ADD THESE TWO LINES)
        req.body = sanitizeInputs(validatedData);
        
        return handler(req, res);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            error: 'Validation failed',
            details: error.issues.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          });
        }
        
        return res.status(400).json({ 
          error: 'Validation failed',
          details: 'Invalid request'
        });
      }
    };
  };
};

function sanitizeInputs(data: any): any {
  if (typeof data === 'string') {
    // Remove potential XSS, SQL injection, and command injection
    return DOMPurify.sanitize(data, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    })
    .replace(/[<>'";&|`$(){}[\]\\]/g, '') // Remove dangerous characters
    .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInputs);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInputs(value);
    }
    return sanitized;
  }
  
  return data;
}