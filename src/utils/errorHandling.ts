// utils/errorHandling.ts - Enhanced with security logging
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type ErrorType = 'network' | 'server' | 'data' | 'parse' | 'usage_limit' | 'unknown';

export interface UsageInfo {
  current: number;
  limit: number;
  tier?: string;
}

// Add this interface to replace 'any'
interface ErrorLike {
  status?: number;
  message?: string;
}

/**
 * 🔒 NEW: Enhanced error handler with security logging
 */
export const handleSecureError = async (
  error: Error | ErrorLike | unknown,
  router: AppRouterInstance,
  context?: { 
    usageInfo?: UsageInfo;
    userEmail?: string;
    endpoint?: string;
    userId?: string;
  }
) => {
  console.error('Handling secure error:', error);

  // 🔒 NEW: Log security-relevant errors
  if (context?.userEmail && context?.endpoint) {
    try {
      await fetch('/api/security/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : 'Unknown'
          },
          userEmail: context.userEmail,
          userId: context.userId,
          endpoint: context.endpoint,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
          url: typeof window !== 'undefined' ? window.location.href : '',
          errorType: 'CLIENT_ERROR',
          severity: 'MEDIUM'
        })
      });
    } catch (logError) {
      console.warn('Failed to log security error:', logError);
    }
  }

  // Continue with existing error handling
  handleError(error, router, context);
};

/**
 * Handle different types of errors and redirect appropriately
 */
export const handleError = (
  error: Error | ErrorLike | unknown,
  router: AppRouterInstance, 
  context?: { usageInfo?: UsageInfo }
) => {
  console.error('Handling error:', error);

  // Type guard to safely access properties
  const hasProperty = (obj: unknown, prop: string): obj is Record<string, any> => {
    return typeof obj === 'object' && obj !== null && prop in obj;
  };

  // Usage limit error
  if ((hasProperty(error, 'status') && error.status === 429) || 
      (hasProperty(error, 'message') && typeof error.message === 'string' && error.message.includes('Usage limit exceeded'))) {
    if (context?.usageInfo) {
      localStorage.setItem('lastUsageInfo', JSON.stringify(context.usageInfo));
    }
    localStorage.setItem('lastError', 'usage_limit');
    router.push('/error?type=usage_limit');
    return;
  }

  // Server errors (5xx)
  if (hasProperty(error, 'status') && typeof error.status === 'number' && error.status >= 500) {
    localStorage.setItem('lastError', 'server');
    router.push('/error?type=server');
    return;
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    localStorage.setItem('lastError', 'network');
    router.push('/error?type=network');
    return;
  }

  // Parse errors
  if (hasProperty(error, 'message') && typeof error.message === 'string' && 
      (error.message.includes('parse') || error.message.includes('JSON'))) {
    localStorage.setItem('lastError', 'parse');
    router.push('/error?type=parse');
    return;
  }

  // Data errors
  if (hasProperty(error, 'message') && typeof error.message === 'string' && 
      (error.message.includes('data') || error.message.includes('missing'))) {
    localStorage.setItem('lastError', 'data');
    router.push('/error?type=data');
    return;
  }

  // Default to unknown error
  localStorage.setItem('lastError', 'unknown');
  router.push('/error?type=unknown');
};

/**
 * Handle API response errors specifically
 */
export const handleApiError = async (
  response: Response, 
  router: AppRouterInstance,
  context?: { userEmail?: string; endpoint?: string }
) => {
  try {
    const errorData = await response.json();
    
    // Usage limit exceeded
    if (response.status === 429 && errorData.error === 'Usage limit exceeded') {
      if (errorData.usage) {
        localStorage.setItem('lastUsageInfo', JSON.stringify(errorData.usage));
      }
      localStorage.setItem('lastError', 'usage_limit');
      router.push('/error?type=usage_limit');
      return;
    }

    // 🔒 NEW: Log API errors for security monitoring
    if (context?.userEmail && context?.endpoint) {
      await fetch('/api/security/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: `API Error ${response.status}: ${errorData.error || 'Unknown'}`,
            status: response.status,
            endpoint: context.endpoint
          },
          userEmail: context.userEmail,
          endpoint: context.endpoint,
          timestamp: new Date().toISOString(),
          errorType: 'API_ERROR',
          severity: response.status >= 500 ? 'HIGH' : 'MEDIUM'
        })
      }).catch(() => {}); // Silent fail for logging
    }

    // Server errors
    if (response.status >= 500) {
      localStorage.setItem('lastError', 'server');
      router.push('/error?type=server');
      return;
    }

    // Client errors (4xx)
    if (response.status >= 400) {
      localStorage.setItem('lastError', 'data');
      router.push('/error?type=data');
      return;
    }

  } catch {
    // If we can't parse the error response, treat as server error
    localStorage.setItem('lastError', 'server');
    router.push('/error?type=server');
  }
};

/**
 * Store current usage info for display
 */
export const storeUsageInfo = (usage: UsageInfo) => {
  try {
    localStorage.setItem('currentUsage', JSON.stringify(usage));
  } catch (error) {
    console.warn('Failed to store usage info:', error);
  }
};

/**
 * Get current usage info from storage
 */
export const getCurrentUsage = (): UsageInfo | null => {
  try {
    const usage = localStorage.getItem('currentUsage');
    return usage ? JSON.parse(usage) : null;
  } catch {
    return null;
  }
};

/**
 * Check if user is near their usage limit
 */
export const isNearUsageLimit = (usage: UsageInfo): boolean => {
  if (usage.limit === 999) return false; // Unlimited plan
  return (usage.current / usage.limit) >= 0.8;
};

/**
 * Check if user has reached their usage limit
 */
export const isAtUsageLimit = (usage: UsageInfo): boolean => {
  if (usage.limit === 999) return false; // Unlimited plan
  return usage.current >= usage.limit;
};

/**
 * Get usage limit color for UI
 */
export const getUsageLimitColor = (usage: UsageInfo): {
  bg: string;
  border: string;
  text: string;
  bar: string;
} => {
  if (isAtUsageLimit(usage)) {
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-600',
      bar: 'bg-red-500'
    };
  }
  
  if (isNearUsageLimit(usage)) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-600',
      bar: 'bg-amber-500'
    };
  }
  
  return {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    bar: 'bg-green-500'
  };
};

/**
 * 🔒 NEW: Enhanced security error reporting
 */
export const reportSecurityIncident = async (
  incident: {
    type: 'SUSPICIOUS_ACTIVITY' | 'POTENTIAL_ATTACK' | 'SECURITY_VIOLATION';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userEmail?: string;
    additionalData?: Record<string, any>;
  }
) => {
  try {
    await fetch('/api/security/report-incident', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...incident,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('sessionId') : null
      })
    });
  } catch (error) {
    console.error('Failed to report security incident:', error);
  }
};

/**
 * 🔒 NEW: Check for suspicious client-side behavior
 */
export const detectSuspiciousActivity = () => {
  if (typeof window === 'undefined') return;

  const suspiciousPatterns = [
    // Detect developer tools usage
    () => {
      const devtools = /./;
      devtools.toString = function() {
        reportSecurityIncident({
          type: 'SUSPICIOUS_ACTIVITY',
          description: 'Developer tools detected',
          severity: 'LOW'
        });
        return 'Developer tools detected';
      };
      console.log('%c', devtools);
    },

    // Detect rapid repeated requests
    () => {
      const requestTimes: number[] = [];
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        const now = Date.now();
        requestTimes.push(now);
        
        // Keep only requests from last minute
        const recentRequests = requestTimes.filter(time => now - time < 60000);
        
        if (recentRequests.length > 50) {
          reportSecurityIncident({
            type: 'POTENTIAL_ATTACK',
            description: `Rapid requests detected: ${recentRequests.length} in 1 minute`,
            severity: 'HIGH',
            additionalData: { requestCount: recentRequests.length }
          });
        }
        
        return originalFetch(...args);
      };
    }
  ];

  // Apply detection patterns
  suspiciousPatterns.forEach(pattern => {
    try {
      pattern();
    } catch (error) {
      console.warn('Suspicious activity detection error:', error);
    }
  });
};

/**
 * Clear error and usage data (useful for cleanup)
 */
export const clearErrorData = () => {
  localStorage.removeItem('lastError');
  localStorage.removeItem('lastUsageInfo');
  localStorage.removeItem('currentUsage');
};

/**
 * 🔒 NEW: Initialize client-side security monitoring
 */
export const initializeClientSecurity = () => {
  if (typeof window === 'undefined') return;

  // Start suspicious activity detection
  detectSuspiciousActivity();

  // Monitor for suspicious localStorage manipulation
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    if (key.includes('admin') || key.includes('token') || key.includes('secret')) {
      reportSecurityIncident({
        type: 'SECURITY_VIOLATION',
        description: `Suspicious localStorage access: ${key}`,
        severity: 'MEDIUM',
        additionalData: { key, valueLength: value.length }
      });
    }
    return originalSetItem.call(this, key, value);
  };

  console.log('🔒 Client-side security monitoring initialized');
};