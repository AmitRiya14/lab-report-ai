// pages/debug.tsx - Temporary debug page
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const DebugPage = () => {
  const { data: session, status } = useSession();
  const [testResults, setTestResults] = useState<{
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
} | null>(null);
  const [loading, setLoading] = useState(false);

  const testSupabaseConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-supabase');
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      setTestResults({ 
        error: 'Failed to test connection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    setLoading(false);
  };

  const testUsageTracking = async () => {
    if (!session?.user?.email) {
      alert('Please sign in first');
      return;
    }

    try {
      const response = await fetch('/api/track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Report',
          content: 'This is a test report content'
        })
      });
      const data = await response.json();
      alert(`Usage tracking test: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  useEffect(() => {
    // Auto-test connection on page load
    testSupabaseConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Supabase Debug Page</h1>
        
        {/* Environment Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Note: SUPABASE_SERVICE_ROLE_KEY is server-side only and won&apos;t show here
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={status === 'authenticated' ? 'text-green-600' : 'text-orange-600'}>
                {status}
              </span>
            </div>
            {session?.user && (
              <>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{session.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span>{session.user.name}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Connection Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Database Connection Test</h2>
            <button 
              onClick={testSupabaseConnection}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          
          {testResults && (
            <div className="mt-4">
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Usage Tracking Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Usage Tracking Test</h2>
            <button 
              onClick={testUsageTracking}
              disabled={!session?.user?.email}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Test Usage Tracking
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {session?.user?.email 
              ? 'Click to test creating a report and tracking usage' 
              : 'Please sign in to test usage tracking'
            }
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-4">Setup Instructions</h2>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>1. Go to your Supabase dashboard → Settings → API</p>
            <p>2. Copy your Project URL to NEXT_PUBLIC_SUPABASE_URL</p>
            <p>3. Copy your anon public key to NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            <p>4. Copy your service_role key to SUPABASE_SERVICE_ROLE_KEY</p>
            <p>5. Restart your Next.js server after updating .env.local</p>
            <p>6. Delete this debug page once everything is working!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;