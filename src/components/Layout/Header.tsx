// src/components/Layout/Header.tsx - Fixed session type
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react'; // Import Session type
import {Session} from 'next-auth';
import { Settings, Wand2, User, LogOut, ChevronDown, AlertTriangle, Crown } from 'lucide-react';
import { getCurrentUsage, isAtUsageLimit, isNearUsageLimit } from '@/utils/errorHandling';

interface HeaderProps {
  currentPage: 'dashboard' | 'report' | 'pricing';
  userTier?: 'Free' | 'Basic' | 'Pro' | 'Plus';
  usageInfo?: {
    current: number;
    limit: number;
  };
  session?: Session | null; // Use the proper NextAuth Session type
}

export const Header: React.FC<HeaderProps> = ({ 
  currentPage, 
  userTier = 'Free', 
  usageInfo,
  session 
}) => {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get current usage from localStorage as backup
  const currentUsage = getCurrentUsage() || usageInfo;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleDashboardClick = () => {
    router.push('/');
  };

  const handleReportClick = () => {
    // Check if user has reached limit first
    if (currentUsage && isAtUsageLimit(currentUsage)) {
      router.push('/error?type=usage_limit');
      return;
    }

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

  const renderUserBadge = () => {
    if (!currentUsage) {
      return (
        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-md">
          {userTier}
        </div>
      );
    }

    const atLimit = isAtUsageLimit(currentUsage);
    const nearLimit = isNearUsageLimit(currentUsage);
    const isUnlimited = currentUsage.limit === 999;

    if (atLimit) {
      return (
        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-md flex items-center gap-1">
          <AlertTriangle size={10} />
          LIMIT
        </div>
      );
    }

    if (nearLimit) {
      return (
        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-md">
          {currentUsage.current}/{currentUsage.limit}
        </div>
      );
    }

    if (isUnlimited) {
      return (
        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-md flex items-center gap-1">
          <Crown size={10} />
          ∞
        </div>
      );
    }
    
    return (
      <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-md">
        {currentUsage.current}/{currentUsage.limit}
      </div>
    );
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-100">
      {/* Left Side - Logo and Brand */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-xl flex items-center justify-center shadow-lg">
          <Wand2 className="text-white" size={22} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-800 leading-none">GradelyLabs AI</h1>
          <span className="text-xs text-gray-500 leading-none mt-0.5">AI-Powered for Students</span>
        </div>
      </div>

      {/* Center - Navigation Tabs */}
      <div className="flex items-center bg-gray-50 rounded-xl p-1">
        <button 
          onClick={handleDashboardClick}
          className={`nav-tab ${
            currentPage === 'dashboard' 
              ? 'nav-tab-active' 
              : 'nav-tab-inactive'
          }`}
        >
          Dashboard
        </button>
        <button 
          onClick={handleReportClick}
          className={`nav-tab ${
            currentPage === 'report' 
              ? 'nav-tab-active' 
              : 'nav-tab-inactive'
          }`}
        >
          Lab Report
        </button>
        <button 
          onClick={handlePricingClick}
          className={`nav-tab ${
            currentPage === 'pricing' 
              ? 'nav-tab-active' 
              : 'nav-tab-inactive'
          }`}
        >
          Pricing
        </button>
      </div>

      {/* Right Side - Settings and User Profile */}
      <div className="flex items-center gap-3">
        {/* Usage Alert (only show if at/near limit) */}
        {currentUsage && (isAtUsageLimit(currentUsage) || isNearUsageLimit(currentUsage)) && (
          <button
            onClick={handleUpgradeClick}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all hover:shadow-md ${
              isAtUsageLimit(currentUsage)
                ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
            }`}
          >
            {isAtUsageLimit(currentUsage) ? 'Upgrade to Continue' : 'Upgrade Soon'}
          </button>
        )}

        {/* Settings Icon */}
        <button className="icon-button">
          <Settings size={20} />
        </button>
        
        {/* User Profile with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-xl p-2 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-gray-200">
              {session?.user?.image ? (
                <img 
                  src={session.user.image} 
                  alt={session.user.name || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <User className="text-gray-600" size={20} />
                </div>
              )}
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="p-4 border-b border-gray-100">
                <p className="font-medium text-gray-900 truncate">
                  {session?.user?.name || 'Student'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {session?.user?.email}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-2 py-1 rounded-full font-semibold">
                    {userTier}
                  </span>
                  {currentUsage && currentUsage.limit !== 999 && (
                    <span className={`text-xs ${
                      isAtUsageLimit(currentUsage) ? 'text-red-600' :
                      isNearUsageLimit(currentUsage) ? 'text-amber-600' :
                      'text-gray-500'
                    }`}>
                      {currentUsage.current}/{currentUsage.limit} reports
                    </span>
                  )}
                  {currentUsage && currentUsage.limit === 999 && (
                    <span className="text-xs text-purple-600 font-medium">
                      Unlimited
                    </span>
                  )}
                </div>

                {/* Usage Progress Bar in Dropdown */}
                {currentUsage && currentUsage.limit !== 999 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isAtUsageLimit(currentUsage) ? 'bg-red-500' :
                          isNearUsageLimit(currentUsage) ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (currentUsage.current / currentUsage.limit) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Monthly usage • Resets on the 1st
                    </p>
                  </div>
                )}

                {/* Upgrade button in dropdown for non-Plus users */}
                {userTier !== 'Plus' && (
                  <button
                    onClick={handleUpgradeClick}
                    className="w-full mt-3 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white text-sm font-semibold py-2 rounded-lg hover:shadow-md transition-all"
                  >
                    Upgrade Plan
                  </button>
                )}
              </div>
              
              <div className="p-2">
                <button className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Settings size={16} className="text-gray-500" />
                  <span className="text-sm">Settings</span>
                </button>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors text-red-600"
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Usage Badge */}
          {renderUserBadge()}
        </div>
      </div>
    </header>
  );
};