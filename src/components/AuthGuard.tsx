// components/AuthGuard.tsx - Fixed version
import React, { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Crown, User, X } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setShowAuthModal(true);
    } else if (status === 'authenticated') {
      setShowAuthModal(false);
    }
  }, [status]);

  // Debug logging
  useEffect(() => {
    console.log("Auth status:", status);
    console.log("Session:", session);
  }, [status, session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fdfc]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#00e3ae] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = () => {
    console.log("Attempting Google sign in...");
    signIn('google', { 
      callbackUrl: '/',
      redirect: true 
    });
  };

  return (
    <>
      {children}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in slide-in-from-bottom-4 duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Crown className="text-white" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Welcome to GradelyLabs AI
              </h2>
              <p className="text-gray-600">
                Sign in to start generating AI-powered lab reports
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-[#00e3ae] rounded-full"></div>
                <span className="text-gray-700">3 free reports per month</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-[#00e3ae] rounded-full"></div>
                <span className="text-gray-700">AI-powered report generation</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-[#00e3ae] rounded-full"></div>
                <span className="text-gray-700">Smart chart creation from data</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-[#00e3ae] rounded-full"></div>
                <span className="text-gray-700">Rubric-based feedback</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl py-3 px-4 flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-md group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-gray-700 group-hover:text-gray-800">
                Continue with Google
              </span>
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthGuard;