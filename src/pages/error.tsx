/**
 * Enhanced Error Page Component
 * 
 * Provides user-friendly error handling with:
 * - Consistent UI matching the main app design
 * - Specific error messages and recovery suggestions
 * - Multiple recovery options and support links
 * - Professional appearance maintaining brand consistency
 */

'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Upload,
  FileText,
  HelpCircle,
  Settings,
  Wand2,
  Crown,
  WifiOff,
  Server,
  FileX,
  Bug,
  ArrowLeft,
  ExternalLink
} from "lucide-react";

/**
 * Error types for better user messaging
 */
type ErrorType = 'network' | 'server' | 'data' | 'parse' | 'unknown';

interface ErrorInfo {
  type: ErrorType;
  title: string;
  description: string;
  icon: React.ReactNode;
  suggestions: string[];
  recoveryActions: {
    label: string;
    action: () => void;
    primary?: boolean;
  }[];
}

export default function ErrorPage() {
  const router = useRouter();
  const [errorType, setErrorType] = useState<ErrorType>('unknown');
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Detect error type from URL parameters or localStorage
   * This allows different parts of the app to pass context about what went wrong
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('type') as ErrorType;
    const storedError = localStorage.getItem('lastError');
    
    if (errorParam) {
      setErrorType(errorParam);
    } else if (storedError) {
      setErrorType(storedError as ErrorType);
      localStorage.removeItem('lastError'); // Clear after reading
    }
  }, []);

  /**
   * Retry the last action that failed
   */
  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Wait a bit to show loading state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to go back to the previous page
    const lastPage = localStorage.getItem('lastSuccessfulPage') || '/';
    router.push(lastPage);
    
    setIsRetrying(false);
  };

  /**
   * Clear all cached data and start fresh
   */
  const handleClearData = () => {
    const confirmClear = window.confirm(
      'This will clear all cached report data. Are you sure you want to continue?'
    );
    
    if (confirmClear) {
      localStorage.clear();
      router.push('/');
    }
  };

  /**
   * Go back to upload page
   */
  const handleGoToUpload = () => {
    router.push('/');
  };

  /**
   * Try to recover the report if data exists
   */
  const handleTryRecoverReport = () => {
    const hasReportData = localStorage.getItem('labReport');
    if (hasReportData) {
      router.push('/report');
    } else {
      router.push('/');
    }
  };

  /**
   * Get error information based on detected type
   */
  const getErrorInfo = (): ErrorInfo => {
    switch (errorType) {
      case 'network':
        return {
          type: 'network',
          title: 'Connection Problem',
          description: 'Unable to connect to our servers. This might be due to internet connectivity issues or temporary server maintenance.',
          icon: <WifiOff size={48} className="text-orange-500" />,
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Wait a few minutes and try again',
            'Check if other websites are working'
          ],
          recoveryActions: [
            { label: 'Retry Connection', action: handleRetry, primary: true },
            { label: 'Go to Upload', action: handleGoToUpload },
            { label: 'Try Recover Report', action: handleTryRecoverReport }
          ]
        };
      
      case 'server':
        return {
          type: 'server',
          title: 'Server Error',
          description: 'Our servers are experiencing issues. This is temporary and we\'re working to fix it quickly.',
          icon: <Server size={48} className="text-red-500" />,
          suggestions: [
            'Wait a few minutes and try again',
            'The issue is on our end, not yours',
            'Try again in 5-10 minutes',
            'Your work is saved locally if possible'
          ],
          recoveryActions: [
            { label: 'Try Again', action: handleRetry, primary: true },
            { label: 'Go to Upload', action: handleGoToUpload },
            { label: 'Try Recover Report', action: handleTryRecoverReport }
          ]
        };
      
      case 'data':
        return {
          type: 'data',
          title: 'Missing Report Data',
          description: 'We couldn\'t find your lab report data. This might happen if you accessed the report page directly without uploading files first.',
          icon: <FileX size={48} className="text-blue-500" />,
          suggestions: [
            'Start by uploading your lab files',
            'Make sure you have PDF and Excel files ready',
            'Don\'t navigate directly to /report',
            'Use the upload process to generate reports'
          ],
          recoveryActions: [
            { label: 'Upload Files', action: handleGoToUpload, primary: true },
            { label: 'Try Recover Report', action: handleTryRecoverReport },
            { label: 'Clear Cache & Restart', action: handleClearData }
          ]
        };
      
      case 'parse':
        return {
          type: 'parse',
          title: 'File Processing Error',
          description: 'There was a problem processing your uploaded files or report data. The files might be corrupted or in an unsupported format.',
          icon: <Bug size={48} className="text-purple-500" />,
          suggestions: [
            'Check your file formats (PDF, DOCX, XLSX)',
            'Make sure files aren\'t corrupted',
            'Try uploading different files',
            'Ensure files are under 20MB total'
          ],
          recoveryActions: [
            { label: 'Upload New Files', action: handleGoToUpload, primary: true },
            { label: 'Clear Data & Restart', action: handleClearData },
            { label: 'Try Again', action: handleRetry }
          ]
        };
      
      default:
        return {
          type: 'unknown',
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred. Don\'t worry - this doesn\'t happen often and we can help you get back on track.',
          icon: <AlertTriangle size={48} className="text-yellow-500" />,
          suggestions: [
            'Try refreshing the page',
            'Go back and try again',
            'Clear your browser cache',
            'Contact support if the problem persists'
          ],
          recoveryActions: [
            { label: 'Try Again', action: handleRetry, primary: true },
            { label: 'Go Home', action: () => router.push('/') },
            { label: 'Clear Data & Restart', action: handleClearData }
          ]
        };
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-800">
      {/* Header - Consistent with main app */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b">
        <h1 className="text-xl font-bold text-cyan-600 flex items-center gap-2">
          <Wand2 className="text-cyan-500" /> StudyLab AI
        </h1>
        <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-300">
          <Crown size={14} className="inline mr-1 text-emerald-500" /> Pro Student
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar - Consistent with main app */}
        <aside className="w-64 bg-white border-r p-4 space-y-4 shadow-sm">
          <nav className="space-y-2">
            <Link href="/" className="flex items-center gap-3 text-gray-600 hover:text-cyan-600 transition-colors">
              <Upload size={16} /> Upload Files
            </Link>
            <a href="#" className="flex items-center gap-3 text-gray-400 cursor-not-allowed">
              <FileText size={16} /> Report Editing
            </a>
            <a href="#" className="flex items-center gap-3 text-gray-600 hover:text-cyan-600">
              <Settings size={16} /> Settings
            </a>
            <a href="#" className="flex items-center gap-3 text-gray-600 hover:text-cyan-600">
              <HelpCircle size={16} /> Help
            </a>
          </nav>

          {/* Support card */}
          <div className="bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <HelpCircle size={18} /> Need Help?
            </div>
            <p className="text-xs text-white/80 mb-3">Our support team is here to help</p>
            <button 
              onClick={() => window.open('mailto:support@studylab.ai', '_blank')}
              className="w-full bg-white text-red-600 text-sm font-semibold py-1 rounded-md shadow-sm hover:bg-red-50 transition-colors"
            >
              Contact Support
            </button>
          </div>

          {/* Status card */}
          <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-800">
              <Settings size={16} /> System Status
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>File Upload</span>
                <span className="text-green-600">●</span>
              </div>
              <div className="flex items-center justify-between">
                <span>AI Processing</span>
                <span className={errorType === 'server' ? 'text-red-600' : 'text-green-600'}>●</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Report Generation</span>
                <span className={errorType === 'data' || errorType === 'parse' ? 'text-yellow-600' : 'text-green-600'}>●</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Error Content */}
        <main className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Back button */}
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            {/* Main error card */}
            <div className="bg-white shadow-lg rounded-2xl p-8 mb-8 border border-gray-100">
              <div className="text-center mb-8">
                {errorInfo.icon}
                <h1 className="text-3xl font-bold text-gray-800 mt-4 mb-2">
                  {errorInfo.title}
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  {errorInfo.description}
                </p>
              </div>

              {/* Recovery actions */}
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                {errorInfo.recoveryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    disabled={isRetrying}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all
                      ${action.primary 
                        ? 'bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white hover:shadow-lg transform hover:scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${isRetrying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isRetrying && action.primary ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : action.primary ? (
                      <RefreshCw size={16} />
                    ) : (
                      <Home size={16} />
                    )}
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Suggestions */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <HelpCircle size={20} />
                  What you can try:
                </h3>
                <ul className="space-y-2">
                  {errorInfo.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-3 text-blue-700">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Additional help section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick actions card */}
              <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <RefreshCw size={20} className="text-cyan-600" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link 
                    href="/"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={16} className="text-blue-600" />
                    <span className="text-gray-700">Start New Upload</span>
                    <ExternalLink size={14} className="text-gray-400 ml-auto" />
                  </Link>
                  <button 
                    onClick={handleTryRecoverReport}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
                  >
                    <FileText size={16} className="text-green-600" />
                    <span className="text-gray-700">Try Recover Report</span>
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
                  >
                    <RefreshCw size={16} className="text-purple-600" />
                    <span className="text-gray-700">Refresh Page</span>
                  </button>
                </div>
              </div>

              {/* Support card */}
              <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HelpCircle size={20} className="text-cyan-600" />
                  Still Need Help?
                </h3>
                <p className="text-gray-600 mb-4">
                  If the problem persists, our support team is ready to help you get back on track.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => window.open('mailto:support@studylab.ai?subject=Error Report&body=Error Type: ' + errorType, '_blank')}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:shadow-md transition-all"
                  >
                    Email Support
                  </button>
                  <button 
                    onClick={() => window.open('https://studylab.ai/help', '_blank')}
                    className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    View Help Center
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}