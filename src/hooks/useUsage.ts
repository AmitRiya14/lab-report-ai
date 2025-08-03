// hooks/useUsage.ts - Custom hook for usage management
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentUsage, storeUsageInfo, UsageInfo } from '@/utils/errorHandling';

export const useUsage = () => {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsage = () => {
      setLoading(true);
      
      // Try to get usage from session first (most up-to-date)
      if (session?.user?.reportsUsed !== undefined && session?.user?.tier) {
        const sessionUsage: UsageInfo = {
          current: session.user.reportsUsed,
          limit: getTierLimit(session.user.tier),
          tier: session.user.tier
        };
        setUsage(sessionUsage);
        storeUsageInfo(sessionUsage); // Keep localStorage in sync
      } else {
        // Fallback to localStorage
        const storedUsage = getCurrentUsage();
        setUsage(storedUsage);
      }
      
      setLoading(false);
    };

    loadUsage();

    // Listen for localStorage changes (if usage is updated elsewhere)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUsage') {
        const newUsage = e.newValue ? JSON.parse(e.newValue) : null;
        setUsage(newUsage);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [session]);

  /**
   * Update usage manually (useful after API calls)
   */
  const updateUsage = (newUsage: UsageInfo) => {
    setUsage(newUsage);
    storeUsageInfo(newUsage);
  };

  /**
   * Increment usage by 1 (useful after successful report generation)
   */
  const incrementUsage = () => {
    if (usage) {
      const newUsage = { ...usage, current: usage.current + 1 };
      updateUsage(newUsage);
    }
  };

  /**
   * Reset usage (useful for testing or when period resets)
   */
  const resetUsage = () => {
    if (usage) {
      const newUsage = { ...usage, current: 0 };
      updateUsage(newUsage);
    }
  };

  return {
    usage,
    loading,
    updateUsage,
    incrementUsage,
    resetUsage
  };
};

// Helper function to get tier limits
function getTierLimit(tier: string): number {
  switch (tier) {
    case 'Free': return 3;
    case 'Basic': return 15;
    case 'Pro': return 50;
    case 'Plus': return 999; // Unlimited
    default: return 3;
  }
}