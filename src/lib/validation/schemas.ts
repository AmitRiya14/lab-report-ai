import { z } from 'zod';

// File upload validation
export const FileUploadSchema = z.object({
  files: z.array(z.object({
    name: z.string()
      .min(1, 'Filename cannot be empty')
      .max(255, 'Filename too long')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid characters in filename'),
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(20 * 1024 * 1024, 'File too large (max 20MB)'),
    type: z.enum([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]),
    lastModified: z.number(),
  })).min(1, 'At least one file is required').max(10, 'Too many files')
});

// Text input validation (for AI prompts)
export const TextInputSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(2000, 'Prompt too long (max 2000 characters)')
    .regex(/^[a-zA-Z0-9\s.,!?;:'"()-]+$/, 'Invalid characters in prompt'),
  original: z.string()
    .max(10000, 'Original text too long')
    .optional(),
  fullReport: z.string()
    .max(50000, 'Report too long')
    .optional()
});

// User registration validation
export const UserRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(320, 'Email too long'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name'),
});

// Report content validation
export const ReportContentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long'),
  content: z.string()
    .min(100, 'Report too short (minimum 100 characters)')
    .max(100000, 'Report too long (maximum 100,000 characters)'),
  userId: z.string().uuid('Invalid user ID')
});