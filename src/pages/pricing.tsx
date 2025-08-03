import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Layout } from "@/components/Layout";
import { getStripe } from '@/lib/stripe';
import { 
  FileText,
  Crown,
  Star,
  Zap,
  Check,
  Sparkles,
  Rocket,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

const SubscriptionPlansPage = () => {
  const { data: session } = useSession();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Get user info for layout
  const userTier = session?.user?.tier || 'Free';
  const usageInfo = { current: 2, limit: 3 }; // This would come from your usage tracking

  const plans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: '$0',
      interval: '/month',
      description: 'Perfect for trying out StudyLab AI',
      monthlyLimit: '3 reports',
      fileSize: '10MB',
      storage: '7 days',
      support: 'Community',
      features: [
        'Basic report generation',
        'Standard templates',
        'Community support',
        'Basic export (text)'
      ],
      icon: <FileText className="w-6 h-6" />,
      gradient: 'from-gray-400 to-gray-500',
      buttonStyle: 'bg-gray-600 hover:bg-gray-700 text-white',
      popular: false,
      stripeAction: null // Free plan doesn't need Stripe
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '$9.99',
      interval: '/month',
      description: 'For regular lab report needs',
      monthlyLimit: '15 reports',
      fileSize: '25MB',
      storage: '30 days',
      support: 'Email (48h)',
      features: [
        'All Free features',
        'Custom templates',
        'PDF download',
        'Email support',
        'Priority processing'
      ],
      icon: <Zap className="w-6 h-6" />,
      gradient: 'from-blue-500 to-blue-600',
      buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
      popular: false,
      stripeAction: 'basic'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$19.99',
      interval: '/month',
      description: 'Most popular for serious students',
      monthlyLimit: '50 reports',
      fileSize: '50MB',
      storage: '90 days',
      support: 'Priority (24h)',
      features: [
        'All Basic features',
        'Advanced analytics',
        'Citation management',
        'Multiple export formats',
        'Team collaboration',
        'Priority support'
      ],
      icon: <Star className="w-6 h-6" />,
      gradient: 'from-[#00e3ae] to-[#0090f1]',
      buttonStyle: 'bg-gradient-to-r from-[#00e3ae] to-[#0090f1] hover:from-[#00d49a] hover:to-[#007fd8] text-white',
      popular: true,
      stripeAction: 'pro'
    },
    {
      id: 'plus',
      name: 'Plus',
      price: '$39.99',
      interval: '/month',
      description: 'For power users and teams',
      monthlyLimit: 'Unlimited',
      fileSize: '100MB',
      storage: 'Unlimited',
      support: 'Chat + Video',
      features: [
        'All Pro features',
        'API access',
        'Custom branding',
        'Bulk export',
        'AI model fine-tuning',
        'Dedicated support'
      ],
      icon: <Crown className="w-6 h-6" />,
      gradient: 'from-purple-500 to-purple-600',
      buttonStyle: 'bg-purple-600 hover:bg-purple-700 text-white',
      popular: false,
      stripeAction: 'plus'
    }
  ];

  const faqs = [
    {
      question: 'Can I change my plan anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle with automatic proration.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers through our secure Stripe integration.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! Start with our Free tier to experience StudyLab AI. No credit card required. You can generate up to 3 lab reports to test our platform.'
    },
    {
      question: 'What happens to my reports if I downgrade?',
      answer: 'Your existing reports remain accessible, but storage limits of your new plan will apply to future reports. We recommend exporting important reports before downgrading.'
    },
    {
      question: 'Do you offer student discounts?',
      answer: 'Yes! We offer a 20% student discount on all paid plans. Contact our support team with your valid student ID to apply the discount.'
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period.'
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    if (!session) {
      alert('Please sign in to subscribe to a plan.');
      return;
    }

    const plan = plans.find(p => p.id === planId);
    
    if (plan?.id === 'free') {
      alert('You are already on the free plan!');
      return;
    }

    if (!plan?.stripeAction) {
      alert('Invalid plan selection');
      return;
    }

    setLoadingPlan(planId);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: plan.stripeAction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          console.error('Stripe redirect error:', error);
          alert('Failed to redirect to checkout. Please try again.');
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert(error instanceof Error ? error.message : 'Failed to start subscription process');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) {
      alert('Please sign in to manage your subscription.');
      return;
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to access customer portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Customer portal error:', error);
      alert(error instanceof Error ? error.message : 'Failed to access subscription management');
    }
  };

  /*const previousReports = [
    { id: "1", name: "BIOL", active: false },
    { id: "2", name: "BIZO", active: false },
    { id: "3", name: "Lab 4", active: false },
  ];
*/
  return (
    <Layout 
      currentPage="pricing" 
      userTier={userTier} 
      usageInfo={usageInfo}
    >
      {/* Main Content Area */}
      <main className="flex-1 bg-[#f9fdfc] overflow-y-auto">
        {/* Title Section */}
        <div className="px-8 py-8 bg-gradient-to-br from-[#f9fdfc] to-white">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Perfect Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Unlock the full potential of AI-powered lab report generation with plans designed for every student&apos;s needs
            </p>
          </div>
        </div>

        {/* Current Plan Notice */}
        {userTier !== 'Free' && (
          <div className="px-8 pb-4">
            <div className="max-w-6xl mx-auto">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      You&apos;re currently on the {userTier} plan
                    </span>
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    className="text-green-600 hover:text-green-700 font-medium text-sm underline"
                  >
                    Manage Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                      plan.popular 
                        ? 'border-[#00e3ae] ring-4 ring-[#00e3ae]/20 transform scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                          <Sparkles size={16} />
                          Most Popular
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Plan Header */}
                      <div className="text-center mb-6">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white shadow-lg`}>
                          {plan.icon}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                          <span className="text-gray-500">{plan.interval}</span>
                        </div>
                      </div>

                      {/* Plan Details */}
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Monthly Limit</span>
                          <span className="text-sm font-semibold text-gray-900">{plan.monthlyLimit}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">File Size</span>
                          <span className="text-sm font-semibold text-gray-900">{plan.fileSize}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Storage</span>
                          <span className="text-sm font-semibold text-gray-900">{plan.storage}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Support</span>
                          <span className="text-sm font-semibold text-gray-900">{plan.support}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Features included:</h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <Check className="w-4 h-4 text-[#00e3ae] flex-shrink-0" />
                              <span className="text-gray-700">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => handlePlanSelect(plan.id)}
                        disabled={loadingPlan === plan.id || (userTier !== 'Free' && plan.id === 'free')}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${plan.buttonStyle} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
                      >
                        {loadingPlan === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : userTier === plan.name ? (
                          'Current Plan'
                        ) : plan.id === 'free' ? (
                          'Get Started Free'
                        ) : (
                          'Start Free Trial'
                        )}
                      </button>

                      {plan.id !== 'free' && userTier !== plan.name && (
                        <p className="text-center text-xs text-gray-500 mt-2">
                          7-day free trial • Cancel anytime
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Manage Subscription Button for Existing Subscribers */}
              {userTier !== 'Free' && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleManageSubscription}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Manage My Subscription
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Cancel, change plans, or update billing details
                  </p>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="mt-16 text-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">7-Day Free Trial</h3>
                    <p className="text-gray-600 text-sm">Try any paid plan risk-free for 7 days</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Rocket className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Instant Setup</h3>
                    <p className="text-gray-600 text-sm">Start generating reports immediately</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <Crown className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h3>
                    <p className="text-gray-600 text-sm">No long-term contracts or commitments</p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mt-20">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
                    <p className="text-gray-600">Everything you need to know about StudyLab AI pricing</p>
                  </div>
                  
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                          {expandedFaq === index ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                        {expandedFaq === index && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Final CTA */}
              <div className="mt-20 text-center bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-2xl p-12 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Lab Reports?</h2>
                <p className="text-lg mb-8 opacity-90">Join thousands of students already using StudyLab AI</p>
                <button 
                  onClick={() => handlePlanSelect('pro')}
                  disabled={loadingPlan === 'pro'}
                  className="bg-white text-[#0090f1] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 mx-auto"
                >
                  {loadingPlan === 'pro' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Your Free Trial'
                  )}
                </button>
                <p className="text-sm mt-4 opacity-80">No credit card required • 7-day free trial</p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    );
  };

  export default SubscriptionPlansPage;