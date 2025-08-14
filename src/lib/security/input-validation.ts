// ========================================
// src/lib/security/input-validation.ts
// ========================================

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

export class InputValidator {
  /**
   * Sanitize HTML input to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['class'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
    });
  }

  /**
   * Sanitize text input to prevent injection attacks
   */
  static sanitizeText(input: string): string {
    return input
      .replace(/[<>'";&|`$(){}[\]\\]/g, '') // Remove dangerous characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim()
      .substring(0, 10000); // Limit length
  }

  /**
   * Validate email format with additional security checks
   */
  static validateEmail(email: string): boolean {
    const emailSchema = z.string()
      .email()
      .max(320) // RFC 5321 limit
      .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
    
    try {
      emailSchema.parse(email);
      
      // Additional security checks
      if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
        return false;
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /[<>'";&|`$(){}[\]\\]/,
        /javascript:/i,
        /data:/i,
        /vbscript:/i
      ];
      
      return !suspiciousPatterns.some(pattern => pattern.test(email));
    } catch {
      return false;
    }
  }

  /**
   * Validate file upload with security checks
   */
  static validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // File size check (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      errors.push('File size exceeds 20MB limit');
    }
    
    // File name validation
    if (!/^[a-zA-Z0-9._-]+\.(pdf|docx|xlsx|txt)$/i.test(file.name)) {
      errors.push('Invalid file name or extension');
    }
    
    // MIME type validation
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }
    
    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com|js|jar|sh)$/i,
      /[<>'";&|`$(){}[\]\\]/,
      /^\./,
      /\.\./
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('Suspicious file name detected');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate AI prompt input
   */
  static validatePrompt(prompt: string): { isValid: boolean; sanitized: string; errors: string[] } {
    const errors: string[] = [];
    
    // Length validation
    if (prompt.length > 2000) {
      errors.push('Prompt too long (max 2000 characters)');
    }
    
    if (prompt.length < 1) {
      errors.push('Prompt cannot be empty');
    }
    
    // Sanitize the prompt
    let sanitized = this.sanitizeText(prompt);
    
    // Check for injection attempts
    const injectionPatterns = [
      /system\s*:/i,
      /assistant\s*:/i,
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /you\s+are\s+now/i,
      /roleplay\s+as/i,
      /pretend\s+to\s+be/i
    ];
    
    if (injectionPatterns.some(pattern => pattern.test(sanitized))) {
      errors.push('Potential prompt injection detected');
    }
    
    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }
}