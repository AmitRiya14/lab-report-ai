// pages/debug-auth.tsx - Enhanced debug page
import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut, getSession } from 'next-auth/react';

const DebugAuthPage = () => {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie);
    
    // Get detailed session info
    getSession().then(sessionData => {
      setDebugInfo({
        sessionFromGetSession: sessionData,
        sessionFromUseSession: session,
        status: status,
        timestamp: new Date().toISOString()
      });
    });
  }, [session, status]);

  const testGoogleSignIn = async () => {
    console.log('Starting Google sign in...');
    try {
      const result = await signIn('google', { 
        callbackUrl: '/debug-auth',
        redirect: false 
      });
      console.log('Sign in result:', result);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const testSignOut = async () => {
    console.log('Signing out...');
    await signOut({ redirect: false });
  };

  const clearAllCookies = () => {
    // Clear all NextAuth related cookies
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url'
    ];

    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
    });

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const testNextAuthEndpoints = async () => {
    const endpoints = [
      '/api/auth/providers',
      '/api/auth/session',
      '/api/auth/csrf'
    ];

    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        results[endpoint] = {
          status: response.status,
          data: data
        };
      } catch (error) {
        results[endpoint] = {
          error: error.message
        };
      }
    }

    alert(JSON.stringify(results, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Debug Page</h1>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={testGoogleSignIn}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Google Sign In
            </button>
            <button
              onClick={testSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
            <button
              onClick={clearAllCookies}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Clear All Cookies
            </button>
            <button
              onClick={testNextAuthEndpoints}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Test NextAuth Endpoints
            </button>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Current Status</h3>
              <div className="space-y-2 text-sm">
                <div className={`px-3 py-2 rounded ${
                  status === 'authenticated' ? 'bg-green-100 text-green-700' :
                  status === 'loading' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Status: {status}
                </div>
                <div className="text-gray-600">
                  Has Session: {session ? 'Yes' : 'No'}
                </div>
                {session?.user && (
                  <div className="text-gray-600">
                    User Email: {session.user.email}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Environment Check</h3>
              <div className="space-y-2 text-sm">
                <div className={`px-3 py-2 rounded ${
                  process.env.NEXT_PUBLIC_SUPABASE_URL ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
                </div>
                <div className={`px-3 py-2 rounded ${
                  process.env.GOOGLE_CLIENT_ID ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  Google Client ID: {process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cookies Debug */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookies Debug</h2>
          <div className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-32">
            {cookies || 'No cookies found'}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Look for cookies like: next-auth.session-token, next-auth.csrf-token
          </div>
        </div>

        {/* Session Debug */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Debug Info</h2>
          {debugInfo ? (
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          ) : (
            <div>Loading debug info...</div>
          )}
        </div>

        {/* NextAuth Configuration Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">NextAuth Configuration</h2>
          <div className="space-y-2 text-sm">
            <div>NEXTAUTH_URL: {process.env.NEXTAUTH_URL || 'Not set (will use default)'}</div>
            <div>NEXTAUTH_SECRET: {process.env.NEXTAUTH_SECRET ? 'Set' : 'Missing (Required!)'}</div>
            <div>Current URL: {typeof window !== 'undefined' ? window.location.origin : 'Server-side'}</div>
          </div>
        </div>

        {/* Troubleshooting Steps */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-4">Troubleshooting Steps</h2>
          <div className="text-sm text-yellow-700 space-y-3">
            <div>
              <strong>1. Check Environment Variables:</strong>
              <ul className="list-disc ml-5 mt-1">
                <li>NEXTAUTH_SECRET must be set</li>
                <li>GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be valid</li>
                <li>All Supabase keys must be correct</li>
              </ul>
            </div>
            <div>
              <strong>2. Check Google OAuth Setup:</strong>
              <ul className="list-disc ml-5 mt-1">
                <li>Go to Google Cloud Console</li>
                <li>Check that http://localhost:3000/api/auth/callback/google is added to authorized redirect URIs</li>
                <li>Verify the OAuth consent screen is configured</li>
              </ul>
            </div>
            <div>
              <strong>3. Clear Session and Try Again:</strong>
              <ul className="list-disc ml-5 mt-1">
                <li>Click "Clear All Cookies" above</li>
                <li>Restart your Next.js server</li>
                <li>Try signing in again</li>
              </ul>
            </div>
            <div>
              <strong>4. Check Console Logs:</strong>
              <ul className="list-disc ml-5 mt-1">
                <li>Open browser dev tools</li>
                <li>Look for NextAuth errors in console</li>
                <li>Check network tab for failed requests</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugAuthPage;