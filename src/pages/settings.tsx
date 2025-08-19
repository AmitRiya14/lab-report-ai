// src/pages/settings.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  CreditCard, 
  Shield, 
  Settings as SettingsIcon,
  Bell,
  Download,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Check,
  X,
  Crown,
  AlertTriangle,
  Calendar,
  Mail,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  RefreshCw,
  ExternalLink,
  Lock,
  Activity
} from 'lucide-react';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    browser: boolean;
    reportComplete: boolean;
    usageLimits: boolean;
    securityAlerts: boolean;
  };
  editor: {
    fontSize: number;
    lineHeight: number;
    autoSave: boolean;
  };
  privacy: {
    analytics: boolean;
    errorReporting: boolean;
  };
}

interface SecurityLog {
  id: string;
  event_type: string;
  created_at: string;
  ip_address: string;
  metadata: any;
}

const SettingsPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Form states
  const [name, setName] = useState(session?.user?.name || '');
  const [email] = useState(session?.user?.email || '');
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    notifications: {
      email: true,
      browser: true,
      reportComplete: true,
      usageLimits: true,
      securityAlerts: true,
    },
    editor: {
      fontSize: 12,
      lineHeight: 2,
      autoSave: true,
    },
    privacy: {
      analytics: true,
      errorReporting: true,
    }
  });

  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  const userTier = session?.user?.tier || 'Free';
  const usageInfo = { current: 2, limit: 3 };

  useEffect(() => {
    loadUserPreferences();
    loadSecurityLogs();
    loadSubscriptionDetails();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        setPreferences({ ...preferences, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const loadSecurityLogs = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch('/api/security/logs');
      if (response.ok) {
        const data = await response.json();
        setSecurityLogs(data.logs?.slice(0, 10) || []);
      }
    } catch (error) {
      console.error('Failed to load security logs:', error);
    }
  };

  const loadSubscriptionDetails = async () => {
    // Mock subscription data - would fetch from Stripe in real implementation
    if (userTier !== 'Free') {
      setSubscriptionDetails({
        plan: userTier,
        status: 'active',
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        amount: userTier === 'Basic' ? '$9.99' : userTier === 'Pro' ? '$19.99' : '$39.99'
      });
    }
  };

  const savePreferences = async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      localStorage.setItem('studentName', name);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        alert('Failed to access subscription management. Please try again.');
      }
    } catch (error) {
      console.error('Subscription management error:', error);
      alert('Failed to access subscription management. Please try again.');
    }
  };

  const exportUserData = async () => {
    setLoading(true);
    try {
      const reportData = localStorage.getItem('labReport') || '';
      const userData = {
        profile: {
          name: session?.user?.name,
          email: session?.user?.email,
          tier: userTier,
        },
        preferences,
        reports: reportData ? [{ content: reportData, date: new Date().toISOString() }] : [],
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studylab-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
    setLoading(false);
  };

  const deleteAccount = async () => {
    const confirmText = 'delete my account';
    const userInput = prompt(
      `This action cannot be undone. All your data will be permanently deleted.\n\nType "${confirmText}" to confirm:`
    );

    if (userInput === confirmText) {
      setLoading(true);
      try {
        // Clear all local data
        localStorage.clear();
        sessionStorage.clear();
        
        // In real implementation, would call API to delete account
        alert('Account deletion initiated. You will be contacted within 24 hours to confirm.');
        
        // Sign out user
        window.location.href = '/';
      } catch (error) {
        console.error('Account deletion failed:', error);
        alert('Account deletion failed. Please contact support.');
      }
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Privacy & Security', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <Layout currentPage="dashboard" userTier={userTier} usageInfo={usageInfo}>
      <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-[#00e3ae]" />
              Settings
            </h1>
            <p className="text-gray-600">
              Manage your account, preferences, and privacy settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-[#00e3ae]/10 text-[#00e3ae] font-medium' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {/* Save Status */}
                {saveStatus !== 'idle' && (
                  <div className="mt-4 p-3 rounded-lg">
                    {saveStatus === 'saving' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                    {saveStatus === 'saved' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Settings saved!</span>
                      </div>
                    )}
                    {saveStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <X className="w-4 h-4" />
                        <span className="text-sm">Save failed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              {/* Account Settings */}
              {activeTab === 'account' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>
                  
                  <div className="space-y-6">
                    {/* Profile Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Profile</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              disabled={!isEditing}
                              className={`flex-1 px-3 py-2 border rounded-lg ${
                                isEditing 
                                  ? 'border-gray-300 focus:border-[#00e3ae] focus:ring-2 focus:ring-[#00e3ae]/20' 
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            />
                            <button
                              onClick={() => setIsEditing(!isEditing)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Email cannot be changed
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Account Stats */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{usageInfo.current}</div>
                          <div className="text-sm text-gray-600">Reports Generated</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">
                            {new Date().toLocaleDateString('en-US', { month: 'long' })}
                          </div>
                          <div className="text-sm text-gray-600">Member Since</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-[#00e3ae]">{userTier}</div>
                          <div className="text-sm text-gray-600">Current Plan</div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={savePreferences}
                        disabled={saveStatus === 'saving'}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00e3ae] text-white rounded-lg hover:bg-[#00d49a] disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Settings */}
              {activeTab === 'subscription' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Subscription & Billing</h2>
                  
                  <div className="space-y-6">
                    {/* Current Plan */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Crown className="w-6 h-6 text-[#00e3ae]" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{userTier} Plan</h3>
                            <p className="text-sm text-gray-600">
                              {userTier === 'Free' ? 'No subscription active' : `${subscriptionDetails?.amount}/month`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Usage this month</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {usageInfo.current}/{usageInfo.limit} reports
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 h-2 rounded-full mb-4">
                        <div 
                          className="bg-[#00e3ae] h-2 rounded-full transition-all"
                          style={{ width: `${(usageInfo.current / usageInfo.limit) * 100}%` }}
                        />
                      </div>

                      {subscriptionDetails && (
                        <div className="text-sm text-gray-600 mb-4">
                          Next billing: {subscriptionDetails.nextBilling}
                        </div>
                      )}

                      <div className="flex gap-3">
                        {userTier === 'Free' ? (
                          <button
                            onClick={() => router.push('/pricing')}
                            className="px-4 py-2 bg-[#00e3ae] text-white rounded-lg hover:bg-[#00d49a]"
                          >
                            Upgrade Plan
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleManageSubscription}
                              className="px-4 py-2 bg-[#00e3ae] text-white rounded-lg hover:bg-[#00d49a]"
                            >
                              Manage Subscription
                            </button>
                            <button
                              onClick={() => router.push('/pricing')}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                              Change Plan
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Billing History */}
                    {userTier !== 'Free' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Billing History</h3>
                        <div className="border rounded-lg">
                          <div className="p-4 border-b bg-gray-50">
                            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700">
                              <div>Date</div>
                              <div>Description</div>
                              <div>Amount</div>
                              <div>Status</div>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>{new Date().toLocaleDateString()}</div>
                              <div>{userTier} Plan</div>
                              <div>{subscriptionDetails?.amount}</div>
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                Paid
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preferences */}
              {activeTab === 'preferences' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Preferences</h2>
                  
                  <div className="space-y-6">
                    {/* Theme */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Theme
                        </label>
                        <div className="flex gap-3">
                          {[
                            { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
                            { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
                            { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> }
                          ].map((theme) => (
                            <button
                              key={theme.value}
                              onClick={() => setPreferences(prev => ({ ...prev, theme: theme.value as any }))}
                              className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
                                preferences.theme === theme.value
                                  ? 'border-[#00e3ae] bg-[#00e3ae]/10 text-[#00e3ae]'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {theme.icon}
                              {theme.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Editor Preferences */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Editor Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Font Size (pt)
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="16"
                            value={preferences.editor.fontSize}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              editor: { ...prev.editor, fontSize: parseInt(e.target.value) }
                            }))}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-600 mt-1">
                            {preferences.editor.fontSize}pt
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Line Height
                          </label>
                          <input
                            type="range"
                            min="1.2"
                            max="2.5"
                            step="0.1"
                            value={preferences.editor.lineHeight}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              editor: { ...prev.editor, lineHeight: parseFloat(e.target.value) }
                            }))}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-600 mt-1">
                            {preferences.editor.lineHeight}x
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={preferences.editor.autoSave}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              editor: { ...prev.editor, autoSave: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-[#00e3ae] focus:ring-[#00e3ae]"
                          />
                          <span className="text-sm text-gray-700">Auto-save reports while editing</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={savePreferences}
                        disabled={saveStatus === 'saving'}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00e3ae] text-white rounded-lg hover:bg-[#00d49a] disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Email Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'reportComplete', label: 'Report generation complete', description: 'Get notified when your lab report is ready' },
                          { key: 'usageLimits', label: 'Usage limit warnings', description: 'Alerts when approaching monthly limits' },
                          { key: 'securityAlerts', label: 'Security alerts', description: 'Important account security notifications' }
                        ].map((notification) => (
                          <label key={notification.key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={preferences.notifications[notification.key as keyof typeof preferences.notifications]}
                              onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  [notification.key]: e.target.checked
                                }
                              }))}
                              className="mt-1 rounded border-gray-300 text-[#00e3ae] focus:ring-[#00e3ae]"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{notification.label}</div>
                              <div className="text-sm text-gray-600">{notification.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Browser Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Browser Notifications</h3>
                      <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.browser}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, browser: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-[#00e3ae] focus:ring-[#00e3ae]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Browser notifications</div>
                          <div className="text-sm text-gray-600">Show notifications in your browser</div>
                        </div>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={savePreferences}
                        disabled={saveStatus === 'saving'}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00e3ae] text-white rounded-lg hover:bg-[#00d49a] disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy & Security */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Privacy Settings */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Privacy & Security</h2>
                    
                    <div className="space-y-6">
                      {/* Privacy Controls */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Controls</h3>
                        <div className="space-y-3">
                          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div>
                              <div className="font-medium text-gray-900">Analytics</div>
                              <div className="text-sm text-gray-600">Help us improve by sharing usage analytics</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={preferences.privacy.analytics}
                              onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                privacy: { ...prev.privacy, analytics: e.target.checked }
                              }))}
                              className="rounded border-gray-300 text-[#00e3ae] focus:ring-[#00e3ae]"
                            />
                          </label>
                          
                          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div>
                              <div className="font-medium text-gray-900">Error Reporting</div>
                              <div className="text-sm text-gray-600">Automatically send error reports to help fix issues</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={preferences.privacy.errorReporting}
                              onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                privacy: { ...prev.privacy, errorReporting: e.target.checked }
                              }))}
                              className="rounded border-gray-300 text-[#00e3ae] focus:ring-[#00e3ae]"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Data Export */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Export</h3>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">Export My Data</div>
                              <div className="text-sm text-gray-600">Download all your account data and reports</div>
                            </div>
                            <button
                              onClick={exportUserData}
                              disabled={loading}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Download className="w-4 h-4" />
                              Export Data
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Logs */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Security Activity</h3>
                    <div className="space-y-3">
                      {securityLogs.length > 0 ? (
                        securityLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Activity className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {log.event_type.replace(/_/g, ' ').toLowerCase()}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {new Date(log.created_at).toLocaleDateString()} from {log.ip_address}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>No recent security activity</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <h3 className="text-lg font-medium text-red-600 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </h3>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-red-900">Delete Account</div>
                          <div className="text-sm text-red-700">
                            Permanently delete your account and all associated data
                          </div>
                        </div>
                        <button
                          onClick={deleteAccount}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;