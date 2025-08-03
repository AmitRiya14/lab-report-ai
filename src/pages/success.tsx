// pages/success.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Layout } from '@/components/Layout';
import { CheckCircle, Crown, ArrowRight, Loader2 } from 'lucide-react';

const SuccessPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);
  interface SubscriptionDetails {
  planName: string;
  amount: string;
  interval: string;
  nextBilling: string;
}
const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session_id && session) {
      // Give a brief moment for webhooks to process
      setTimeout(() => {
        fetchSubscriptionDetails();
      }, 2000);
    }
  }, [session_id, session]);

  const fetchSubscriptionDetails = async () => {
    try {
      // In a real app, you'd call an API to get the subscription details
      // For now, we'll just simulate success
      setSubscriptionDetails({
        planName: 'Pro Plan',
        amount: '$19.99',
        interval: 'month',
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      });
      setLoading(false);
    } catch {
      setError('Failed to load subscription details');
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    router.push('/');
  };

  /*const handleViewDashboard = () => {
    router.push('/dashboard');
  };
*/
  if (loading) {
    return (
      <Layout currentPage="dashboard" userTier="Pro">
        <div className="flex-1 bg-[#f9fdfc] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#00e3ae] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Processing your subscription...
            </h2>
            <p className="text-gray-600">
              Please wait while we set up your account
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="dashboard" userTier="Pro">
        <div className="flex-1 bg-[#f9fdfc] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-[#00e3ae] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#00d49a] transition-colors"
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="dashboard" userTier="Pro">
      <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Success Hero Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to StudyLab AI Pro! 🎉
            </h1>
            
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Your subscription has been successfully activated. You now have access to all Pro features 
              and can generate up to 50 lab reports per month.
            </p>

            {/* Subscription Details */}
            {subscriptionDetails && (
              <div className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] rounded-xl p-6 text-white mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Crown className="w-6 h-6" />
                  <h3 className="text-xl font-semibold">{subscriptionDetails.planName}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-white/80 text-sm">Monthly Cost</p>
                    <p className="text-2xl font-bold">{subscriptionDetails.amount}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Billing Cycle</p>
                    <p className="text-xl font-semibold">Monthly</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Next Billing</p>
                    <p className="text-xl font-semibold">{subscriptionDetails.nextBilling}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Start Creating Reports
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => router.push('/pricing')}
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          </div>

          {/* What's New Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">50 Reports/Month</h3>
              <p className="text-gray-600 text-sm">
                Generate up to 50 comprehensive lab reports every month with advanced AI analysis.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-green-600 text-xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority Processing</h3>
              <p className="text-gray-600 text-sm">
                Your reports are processed faster with priority queue access.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-purple-600 text-xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 text-sm">
                Get detailed insights and suggestions to improve your lab reports.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Next?</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-gray-700">Upload your lab manual and data files</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-gray-700">Let our AI generate your comprehensive report</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-gray-700">Review, edit, and export your report</span>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Need help getting started? Our support team is here to assist you.
            </p>
            <button
              onClick={() => window.open('mailto:support@studylab.ai', '_blank')}
              className="text-[#00e3ae] hover:text-[#00d49a] font-semibold"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SuccessPage;