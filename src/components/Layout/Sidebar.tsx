// src/components/Layout/Sidebar.tsx - Updated with functional Help & Settings
import React from 'react';
import { useRouter } from 'next/navigation';
import { ReportsHistory } from '../ReportsHistory';
import Link from 'next/link';
import { 
  Upload, 
  FileText, 
  Settings, 
  HelpCircle, 
  Crown,
  MousePointerClick,
  AlertTriangle,
  TrendingUp 
} from 'lucide-react';
import { getCurrentUsage, isAtUsageLimit, isNearUsageLimit } from '@/utils/errorHandling';

interface SidebarProps {
  currentPage: 'dashboard' | 'report' | 'pricing';
  userTier?: 'Free' | 'Basic' | 'Pro' | 'Plus';
  usageInfo?: {
    current: number;
    limit: number;
  };
  showHowToEdit?: boolean;
  // Add these new props
  onReportSelect?: (reportId: string) => void;
  currentReportId?: string | null;
  reportLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  userTier = 'Free', 
  usageInfo,
  showHowToEdit = false,
  onReportSelect,
  currentReportId,
  reportLoading = false 
}) => {
  const router = useRouter();

  // Get current usage from localStorage as backup
  const currentUsage = getCurrentUsage() || usageInfo;

  const handleUploadClick = () => {
    // Check usage limit before allowing upload
    if (currentUsage && isAtUsageLimit(currentUsage)) {
      // Store usage info and redirect to error page
      localStorage.setItem('lastUsageInfo', JSON.stringify(currentUsage));
      localStorage.setItem('lastError', 'usage_limit');
      router.push('/error?type=usage_limit');
      return;
    }
    router.push('/');
  };

  const handleReportClick = () => {
    const hasGeneratedReport = typeof window !== 'undefined' 
      ? localStorage.getItem("hasGeneratedReport") === "true" 
      : false;
    
    if (hasGeneratedReport) {
      router.push("/report");
    } else {
      alert("Please generate a lab report first by uploading your files.");
    }
  };

  const handlePricingClick = () => {
    router.push('/pricing');
  };

  const handleUpgradeClick = () => {
    router.push('/pricing');
  };

  const renderUsageCard = () => {
    if (!currentUsage) return null;

    const atLimit = isAtUsageLimit(currentUsage);
    const nearLimit = isNearUsageLimit(currentUsage);
    const isUnlimited = currentUsage.limit === 999;
    const percentage = Math.min(100, (currentUsage.current / currentUsage.limit) * 100);

    if (isUnlimited) return null; // Don't show usage for unlimited plans

    return (
      <div className={`rounded-xl p-4 border-2 ${
        atLimit ? 'bg-red-50 border-red-200' :
        nearLimit ? 'bg-amber-50 border-amber-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
            <TrendingUp size={16} />
            Monthly Usage
          </h3>
          {atLimit && (
            <AlertTriangle size={16} className="text-red-500" />
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">
            Reports: {currentUsage.current}/{currentUsage.limit}
          </span>
          <span className={`font-semibold ${
            atLimit ? 'text-red-600' :
            nearLimit ? 'text-amber-600' :
            'text-green-600'
          }`}>
            {currentUsage.limit - currentUsage.current} left
          </span>
        </div>
        
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              atLimit ? 'bg-red-500' :
              nearLimit ? 'bg-amber-500' :
              'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        {atLimit ? (
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-600 font-medium mb-2">
                You&apos;ve reached your monthly limit!
              </p>
              <button
                onClick={handleUpgradeClick}
                className="w-full bg-red-500 text-white text-xs font-semibold py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        ) : nearLimit ? (
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-600 mb-2">
                You&apos;re close to your limit. Consider upgrading.
              </p>
              <button
                onClick={handleUpgradeClick}
                className="w-full bg-amber-500 text-white text-xs font-semibold py-2 rounded-lg hover:bg-amber-600 transition-colors"
              >
                View Plans
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Resets on the 1st of each month
          </p>
        )}
      </div>
    );
  };

  const renderProfileSection = () => {
    if (userTier === 'Free') {
      return (
        <div className="bg-gradient-to-br from-[#00e3ae] to-[#0090f1] text-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <Crown size={18} /> Current Plan
          </div>
          <p className="text-xs text-white/80">{userTier} Tier</p>
          {currentUsage && (
            <p className="text-xs text-white/70 mt-1">
              {currentUsage.current}/{currentUsage.limit} reports used this month
            </p>
          )}
          <button 
            onClick={handleUpgradeClick}
            className="mt-3 w-full bg-white text-[#0090f1] text-sm font-semibold py-2 rounded-md shadow-sm hover:bg-blue-50 transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-[#00e3ae] to-[#0090f1] text-white rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <Crown size={18} /> My Profile
        </div>
        <p className="text-xs text-white/80">Student {userTier}</p>
        {currentUsage && userTier !== 'Plus' && (
          <p className="text-xs text-white/70 mt-1">
            {currentUsage.current}/{currentUsage.limit === 999 ? '∞' : currentUsage.limit} reports this month
          </p>
        )}
        {userTier === 'Plus' && (
          <p className="text-xs text-white/70 mt-1">
            Unlimited reports • Premium features
          </p>
        )}
        {userTier !== 'Plus' && (
          <>
            <button 
              onClick={handleUpgradeClick}
              className="mt-3 w-full bg-white text-[#0090f1] text-sm font-semibold py-2 rounded-md shadow-sm hover:bg-blue-50 transition-colors"
            >
              Upgrade Now
            </button>
            <p 
              onClick={handlePricingClick}
              className="mt-1 text-xs underline text-white/80 cursor-pointer hover:text-white transition-colors text-center"
            >
              Learn More
            </p>
          </>
        )}
      </div>
    );
  };

  // Check if user has generated a report
  const hasGeneratedReport = typeof window !== 'undefined' 
    ? localStorage.getItem("hasGeneratedReport") === "true" 
    : false;

  // Check if upload should be disabled due to usage limit
  const uploadDisabled = currentUsage && isAtUsageLimit(currentUsage);

  return (
    <aside className="w-64 bg-white border-r p-4 space-y-4 shadow-sm">
      {/* Navigation */}
      <nav className="space-y-2">
        <button 
          onClick={handleUploadClick}
          disabled={uploadDisabled}
          className={`flex items-center gap-3 rounded-xl px-4 py-2 w-full text-left transition-colors relative ${
            currentPage === 'dashboard' 
              ? 'text-white bg-gradient-to-r from-[#00e3ae] to-[#0090f1] font-semibold' 
              : uploadDisabled
                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                : 'text-gray-600 hover:text-cyan-600 hover:bg-gray-50'
          }`}
        >
          <Upload size={16} /> 
          Upload Files
          {uploadDisabled && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle size={12} className="text-white" />
            </div>
          )}
        </button>
        
        <button 
          onClick={handleReportClick}
          className={`flex items-center gap-3 rounded-xl px-4 py-2 w-full text-left transition-colors ${
            currentPage === 'report' 
              ? 'text-white bg-gradient-to-r from-[#00e3ae] to-[#0090f1] font-semibold' 
              : hasGeneratedReport 
                ? 'text-gray-600 hover:text-cyan-600 hover:bg-gray-50' 
                : 'text-gray-400 cursor-not-allowed'
          }`}
          disabled={!hasGeneratedReport && currentPage !== 'report'}
        >
          <FileText size={16} /> Report Editing
        </button>
        
        {/* Updated Settings Button - Now functional */}
        <Link 
          href="/settings"
          className="flex items-center gap-3 text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-xl px-4 py-2 w-full text-left transition-colors"
        >
          <Settings size={16} /> Settings
        </Link>
        
        {/* Updated Help Button - Now functional */}
        <Link 
          href="/help"
          className="flex items-center gap-3 text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-xl px-4 py-2 w-full text-left transition-colors"
        >
          <HelpCircle size={16} /> Help
        </Link>
      </nav>

      {/* Usage Card - Show before Previous Reports */}
      {renderUsageCard()}

      {/* Previous Lab Reports - Now Functional */}
      <div className="space-y-3">
        <ReportsHistory 
          onReportSelect={onReportSelect || (() => {})}
          currentReportId={currentReportId || undefined}
        />
        
        {/* Loading indicator when switching reports */}
        {reportLoading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin w-4 h-4 border-2 border-[#00e3ae] border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600">Loading report...</span>
          </div>
        )}
      </div>

      {/* Profile Section */}
      {renderProfileSection()}

      {/* How to Edit Instructions - NOW AT THE BOTTOM */}
      {showHowToEdit && (
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
            <MousePointerClick size={16} /> How to Edit
          </div>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Highlight any text in the report</li>
            <li>Type your modification prompt</li>
            <li>AI will update that section</li>
          </ul>
        </div>
      )}
    </aside>
  );
};