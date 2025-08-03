// utils/errorHandling.ts
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
 * Handle different types of errors and redirect appropriately
 */
export const handleError = (
  error: Error | ErrorLike | unknown, // Replace 'any' with this union type
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
  router: AppRouterInstance
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
 * Clear error and usage data (useful for cleanup)
 */
export const clearErrorData = () => {
  localStorage.removeItem('lastError');
  localStorage.removeItem('lastUsageInfo');
  localStorage.removeItem('currentUsage');
};