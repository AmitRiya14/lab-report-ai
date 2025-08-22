// components/Layout/index.tsx - Fixed version with Previous Reports
import React from 'react';
import { useSession } from 'next-auth/react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import AuthGuard from '../AuthGuard';
import { useUsage } from '@/hooks/useUsage';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'report' | 'pricing';
  userTier?: 'Free' | 'Basic' | 'Pro' | 'Plus';
  usageInfo?: {
    current: number;
    limit: number;
  };
  showHowToEdit?: boolean;
  // Add these new props for Previous Reports functionality
  onReportSelect?: (reportId: string) => void;
  currentReportId?: string | null;
  reportLoading?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentPage, 
  userTier, 
  usageInfo, 
  showHowToEdit,
  onReportSelect,
  currentReportId,
  reportLoading
}) => {
  const { data: session } = useSession();
  const { usage, loading } = useUsage();

  // Get actual user data from session or hook
  const actualUserTier = session?.user?.tier || userTier || 'Free';
  const actualUsageInfo = usage || usageInfo;

  // Show loading state while usage is being fetched
  if (loading && !usageInfo) {
    return (
      <AuthGuard>
        <div className="flex flex-col min-h-screen font-sans text-gray-800">
          <div className="flex items-center justify-center flex-1 bg-[#f9fdfc]">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[#00e3ae] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your account...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen font-sans text-gray-800">
        <Header 
          currentPage={currentPage} 
          userTier={actualUserTier} 
          usageInfo={actualUsageInfo}
          session={session} // This now matches the Session | null type
        />
        <div className="flex flex-1">
          <Sidebar 
            currentPage={currentPage} 
            userTier={actualUserTier} 
            usageInfo={actualUsageInfo} 
            showHowToEdit={showHowToEdit}
            onReportSelect={onReportSelect}
            currentReportId={currentReportId}
            reportLoading={reportLoading}
          />
          <main className="flex-1 bg-[#f9fdfc] overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

// Helper function to get tier limits
/*function getTierLimit(tier: string): number {
  switch (tier) {
    case 'Free': return 3;
    case 'Basic': return 15;
    case 'Pro': return 50;
    case 'Plus': return 999; // Unlimited
    default: return 3;
  }
}*/