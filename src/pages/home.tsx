// src/pages/home.tsx - COMPLETE PROFESSIONAL LANDING PAGE
import React, { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { 
  ArrowRight, 
  Sparkles, 
  FileText, 
  BarChart3, 
  Zap, 
  Shield, 
  Clock, 
  Users, 
  CheckCircle, 
  Star,
  Wand2,
  Upload,
  Bot,
  Target,
  BookOpen,
  Trophy,
  Globe,
  Play,
  ChevronRight,
  ArrowUpRight,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  Mail,
  MessageCircle,
  Github,
  Twitter,
  Linkedin,
  Award,
  TrendingUp,
  Database,
  Cpu,
  Lock,
  RefreshCw
} from 'lucide-react';

const HomePage = () => {
  const { data: session } = useSession();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  const features = [
    {
      icon: <Wand2 className="w-8 h-8 text-[#00e3ae]" />,
      title: "AI-Powered Generation",
      description: "Advanced AI analyzes your lab manuals and data to create comprehensive, academically-formatted reports in minutes.",
      highlight: "GPT-4 Technology"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-500" />,
      title: "Smart Data Visualization",
      description: "Automatically generates professional charts, graphs, and data visualizations from your Excel files and experimental data.",
      highlight: "Auto-Charts"
    },
    {
      icon: <Target className="w-8 h-8 text-purple-500" />,
      title: "Rubric-Based Analysis",
      description: "Upload your grading rubric to get detailed feedback and ensure your report meets all requirements and criteria.",
      highlight: "Grade Optimization"
    },
    {
      icon: <Bot className="w-8 h-8 text-orange-500" />,
      title: "Real-Time Editing",
      description: "Highlight any text for instant AI-powered improvements. Get suggestions for better academic tone and clarity.",
      highlight: "Live AI Assistance"
    },
    {
      icon: <FileText className="w-8 h-8 text-green-500" />,
      title: "Multiple Export Formats",
      description: "Export your reports as PDF, Word, or LaTeX with proper academic formatting, citations, and professional layout.",
      highlight: "Professional Output"
    },
    {
      icon: <Shield className="w-8 h-8 text-red-500" />,
      title: "Secure & Private",
      description: "Your data is encrypted and automatically deleted after 30 days. No human ever reads your lab reports.",
      highlight: "Enterprise Security"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Biology Major, UC Berkeley",
      content: "GradelyLabs saved me 8+ hours per lab report. The AI generates professional reports that consistently score A's. It's like having a personal academic writing assistant!",
      rating: 5,
      avatar: "👩‍🔬"
    },
    {
      name: "Marcus Rodriguez",
      role: "Chemistry Student, MIT",
      content: "The data visualization feature is incredible. It automatically created perfect graphs from my messy Excel data. My professors are impressed with the quality.",
      rating: 5,
      avatar: "👨‍🎓"
    },
    {
      name: "Emily Watson",
      role: "Physics PhD, Stanford",
      content: "I use it for all my lab courses. The rubric analysis ensures I never miss requirements. Went from B+ to A averages after starting with GradelyLabs.",
      rating: 5,
      avatar: "⚗️"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Upload Your Files",
      description: "Drop in your lab manual (PDF), data files (Excel), and any grading rubrics. Our AI supports multiple file formats.",
      icon: <Upload className="w-6 h-6" />
    },
    {
      number: "02", 
      title: "AI Processing",
      description: "Advanced AI analyzes your content, understands the experiment, and structures a comprehensive academic report.",
      icon: <Sparkles className="w-6 h-6" />
    },
    {
      number: "03",
      title: "Review & Edit",
      description: "Get your complete report with charts and analysis. Use our AI editing tools to perfect any section instantly.",
      icon: <FileText className="w-6 h-6" />
    },
    {
      number: "04",
      title: "Export & Submit",
      description: "Download as PDF, Word, or LaTeX with proper academic formatting. Ready for submission in under 30 seconds.",
      icon: <Trophy className="w-6 h-6" />
    }
  ];

  const stats = [
    { number: "50K+", label: "Reports Generated", icon: <FileText className="w-5 h-5" /> },
    { number: "15K+", label: "Students Helped", icon: <Users className="w-5 h-5" /> },
    { number: "4.9/5", label: "Average Rating", icon: <Star className="w-5 h-5" /> },
    { number: "95%", label: "A/B Grades", icon: <Trophy className="w-5 h-5" /> }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out GradelyLabs",
      features: [
        "3 reports per month",
        "Basic templates",
        "Standard export",
        "Community support"
      ],
      highlighted: false,
      buttonText: "Get Started Free",
      buttonStyle: "bg-gray-600 hover:bg-gray-700 text-white"
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "per month",
      description: "Most popular for serious students",
      features: [
        "50 reports per month",
        "Advanced analytics",
        "All export formats",
        "Priority support",
        "Custom templates",
        "Citation management"
      ],
      highlighted: true,
      buttonText: "Start Free Trial",
      buttonStyle: "bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white hover:shadow-lg transform hover:scale-105"
    },
    {
      name: "Plus",
      price: "$39.99",
      period: "per month",
      description: "For power users and teams",
      features: [
        "Unlimited reports",
        "API access",
        "Team collaboration",
        "Custom branding",
        "Dedicated support",
        "Advanced integrations"
      ],
      highlighted: false,
      buttonText: "Contact Sales",
      buttonStyle: "bg-purple-600 hover:bg-purple-700 text-white"
    }
  ];

  const faqs = [
    {
      question: "How accurate are the AI-generated reports?",
      answer: "Our AI creates high-quality academic reports with proper structure and formatting. The content is based on your uploaded data and follows standard scientific writing conventions. However, we recommend reviewing and editing the generated content to ensure it meets your specific requirements."
    },
    {
      question: "What file formats do you support?",
      answer: "We support PDF and DOCX files for lab manuals, XLSX for data files, and TXT for additional documentation. Maximum file size is 20MB per file, with support for multiple files per upload."
    },
    {
      question: "Is my data secure and private?",
      answer: "Yes, we use enterprise-grade security with encryption in transit and at rest. Your files and reports are only accessible by you and are automatically deleted after 30 days. We never share or sell your data."
    },
    {
      question: "Can I edit the generated reports?",
      answer: "Absolutely! Our platform includes advanced editing tools with AI-powered suggestions. Simply highlight any text to get instant improvements, or use our quick actions to enhance tone and clarity."
    },
    {
      question: "How long does report generation take?",
      answer: "Most reports are generated in 15-30 seconds. Complex files with extensive data may take up to 60 seconds. Pro users get priority processing for even faster generation."
    },
    {
      question: "Do you offer student discounts?",
      answer: "Yes! We offer a 20% student discount on all paid plans. Contact our support team with your valid student ID to apply the discount to your subscription."
    }
  ];

  const integrations = [
    { name: "Microsoft Office", logo: "🏢" },
    { name: "Google Workspace", logo: "📊" },
    { name: "Canvas LMS", logo: "🎓" },
    { name: "Blackboard", logo: "📚" },
    { name: "Moodle", logo: "🎯" },
    { name: "Notion", logo: "📝" }
  ];

  return (
    <>
      <Head>
        <title>GradelyLabs AI - AI-Powered Lab Report Generator for Students</title>
        <meta 
          name="description" 
          content="Generate professional lab reports in minutes with AI. Upload your data and get comprehensive reports with charts, analysis, and proper academic formatting. Join 15,000+ students getting better grades." 
        />
        <meta 
          name="keywords" 
          content="lab report generator, AI lab reports, student lab reports, laboratory report writing, academic writing AI, science lab reports, automatic report generation" 
        />
        <link rel="canonical" href="https://gradelylabs.com/home" />
        
        {/* Enhanced Open Graph */}
        <meta property="og:title" content="GradelyLabs AI - AI-Powered Lab Report Generator for Students" />
        <meta property="og:description" content="Generate professional lab reports in minutes with AI. Join 15,000+ students getting better grades with our advanced AI technology." />
        <meta property="og:image" content="https://gradelylabs.com/og-home.png" />
        <meta property="og:url" content="https://gradelylabs.com/home" />
        
        {/* Enhanced structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "GradelyLabs AI Lab Report Generator",
              "description": "AI-powered tool that generates professional lab reports from experimental data and lab manuals",
              "url": "https://gradelylabs.com",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web Browser",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "1247"
              },
              "offers": [
                {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD",
                  "name": "Free Plan"
                },
                {
                  "@type": "Offer", 
                  "price": "19.99",
                  "priceCurrency": "USD",
                  "name": "Pro Plan"
                }
              ],
              "creator": {
                "@type": "Organization",
                "name": "GradelyLabs",
                "url": "https://gradelylabs.com"
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/home" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-xl flex items-center justify-center shadow-lg">
                  <Wand2 className="text-white" size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-gray-900">GradelyLabs AI</span>
                  <span className="text-xs text-gray-500 -mt-1">AI-Powered for Students</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="/home" className="text-gray-900 font-medium">Home</Link>
                <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
                <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
                <Link href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Reviews</Link>
                <Link href="/help" className="text-gray-600 hover:text-gray-900 transition-colors">Help</Link>
                {session ? (
                  <Link
                    href="/"
                    className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Go to App
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Get Started Free
                  </Link>
                )}
              </nav>

              {/* Mobile menu button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-gray-100">
                <nav className="flex flex-col space-y-4">
                  <Link href="/home" className="text-gray-900 font-medium">Home</Link>
                  <Link href="#features" className="text-gray-600">Features</Link>
                  <Link href="#pricing" className="text-gray-600">Pricing</Link>
                  <Link href="#testimonials" className="text-gray-600">Reviews</Link>
                  <Link href="/help" className="text-gray-600">Help</Link>
                  <Link
                    href="/"
                    className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-6 py-2 rounded-xl font-semibold text-center"
                  >
                    {session ? 'Go to App' : 'Get Started Free'}
                  </Link>
                </nav>
              </div>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-[#f9fdfc] via-white to-[#f0f9ff] pt-16 pb-20 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#00e3ae]/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#0090f1]/10 to-transparent rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left column - Text content */}
              <div className="space-y-8">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00e3ae]/10 to-[#0090f1]/10 border border-[#00e3ae]/20 rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4 text-[#00e3ae]" />
                  <span className="text-sm font-medium text-gray-700">Trusted by 15,000+ Students</span>
                </div>

                {/* Main heading */}
                <div>
                  <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                    Generate Perfect
                    <span className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] bg-clip-text text-transparent"> Lab Reports </span>
                    with AI
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    Transform your experimental data into comprehensive, professionally formatted lab reports in minutes. 
                    Join thousands of students achieving A-grades with our AI-powered platform.
                  </p>
                </div>

                {/* Key benefits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#00e3ae]" />
                    <span className="text-gray-700">Generate in 30 seconds</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#00e3ae]" />
                    <span className="text-gray-700">Auto-create charts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#00e3ae]" />
                    <span className="text-gray-700">Academic formatting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#00e3ae]" />
                    <span className="text-gray-700">Plagiarism-free</span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/"
                    className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Start Creating Reports
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                    <Play className="w-5 h-5" />
                    Watch Demo
                  </button>
                </div>

                {/* Social proof */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>No credit card required</span>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <span>3 free reports</span>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <span>Setup in 2 minutes</span>
                </div>
              </div>

              {/* Right column - Visual/Demo */}
              <div className="relative">
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                  {/* Mock upload interface */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-500 ml-4">GradelyLabs AI</span>
                    </div>
                    
                    {/* Mock file upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Drop your lab files here</p>
                      <p className="text-sm text-gray-500">PDF, Excel, Word supported</p>
                    </div>

                    {/* Mock files */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Lab_Manual_Chem101.pdf</span>
                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Experimental_Data.xlsx</span>
                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                      </div>
                    </div>

                    {/* Mock generate button */}
                    <button className="w-full bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5" />
                      Generate Lab Report
                    </button>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white p-3 rounded-xl shadow-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="absolute -bottom-4 -left-4 bg-white border-2 border-gray-100 p-3 rounded-xl shadow-lg">
                    <span className="text-sm font-bold text-gray-900">30s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] rounded-xl flex items-center justify-center text-white">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Generate professional lab reports in four simple steps. Our AI handles the complex analysis 
                so you can focus on learning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="text-center">
                    {/* Step number */}
                    <div className="w-16 h-16 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                      {step.number}
                    </div>
                    
                    {/* Icon */}
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-gray-600">
                      {step.icon}
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>

                  {/* Connector arrow */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 -right-4 text-gray-300">
                      <ChevronRight className="w-8 h-8" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Powerful Features for Better Grades
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to create professional, comprehensive lab reports that impress professors 
                and boost your academic performance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      {feature.icon}
                    </div>
                    <span className="text-sm font-semibold text-[#00e3ae] bg-[#00e3ae]/10 px-3 py-1 rounded-full">
                      {feature.highlight}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Loved by Students Worldwide
              </h2>
              <p className="text-xl text-gray-600">
                Join thousands of students who've improved their grades with GradelyLabs AI
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-[#00e3ae]/5 to-[#0090f1]/5 rounded-2xl p-8 border border-[#00e3ae]/10">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">{testimonials[activeTestimonial].avatar}</div>
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-xl text-gray-700 italic leading-relaxed mb-6">
                    "{testimonials[activeTestimonial].content}"
                  </blockquote>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonials[activeTestimonial].name}</div>
                    <div className="text-gray-600">{testimonials[activeTestimonial].role}</div>
                  </div>
                </div>

                {/* Testimonial navigation */}
                <div className="flex justify-center gap-3">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTestimonial(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === activeTestimonial 
                          ? 'bg-[#00e3ae]' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Advanced AI Technology
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Powered by cutting-edge machine learning and natural language processing
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">GPT-4 Powered</h3>
                    <p className="text-gray-600">Advanced language model understands scientific context and generates human-quality academic writing.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Data Processing</h3>
                    <p className="text-gray-600">Automatically extracts insights from Excel files and creates professional visualizations.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Continuous Learning</h3>
                    <p className="text-gray-600">Our AI models are constantly updated to improve report quality and academic standards.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Bot className="w-6 h-6 text-[#00e3ae]" />
                      <span className="font-semibold text-gray-900">AI Report Analysis</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Scientific Accuracy</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div className="w-[95%] h-2 bg-green-500 rounded-full"></div>
                          </div>
                          <span className="text-sm font-semibold text-green-600">95%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">Academic Style</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div className="w-[92%] h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <span className="text-sm font-semibold text-blue-600">92%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-700">Structure Quality</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div className="w-[98%] h-2 bg-purple-500 rounded-full"></div>
                          </div>
                          <span className="text-sm font-semibold text-purple-600">98%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="w-4 h-4 text-[#00e3ae]" />
                        <span>Analyzed 50,000+ reports with 4.9/5 student satisfaction</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Choose the perfect plan for your academic needs. All plans include our core AI features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <div key={index} className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.highlighted 
                    ? 'border-[#00e3ae] ring-4 ring-[#00e3ae]/20 transform scale-105' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-6 py-2 rounded-full text-sm font-bold">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-8">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-500">/{plan.period}</span>
                      </div>
                      <p className="text-gray-600">{plan.description}</p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-[#00e3ae] flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${plan.buttonStyle}`}>
                      {plan.buttonText}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">
                All plans include 24/7 support and 30-day money-back guarantee
              </p>
              <Link href="/pricing" className="text-[#00e3ae] hover:text-[#00d49a] font-semibold">
                View detailed comparison →
              </Link>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Works with Your Favorite Tools
              </h2>
              <p className="text-gray-600">
                Seamless integration with popular academic and productivity platforms
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {integrations.map((integration, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 hover:shadow-md transition-shadow">
                    <span className="text-2xl">{integration.logo}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-700">{integration.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to know about GradelyLabs AI
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                      activeFAQ === index ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  {activeFAQ === index && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">Still have questions?</p>
              <Link href="/help" className="text-[#00e3ae] hover:text-[#00d49a] font-semibold">
                Visit our Help Center →
              </Link>
            </div>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Enterprise-Grade Security
              </h2>
              <p className="text-xl text-gray-600">
                Your data is protected with bank-level security and privacy controls
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">End-to-End Encryption</h3>
                <p className="text-gray-600">All data is encrypted in transit and at rest using AES-256 encryption standards.</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto-Delete</h3>
                <p className="text-gray-600">Your files and reports are automatically deleted after 30 days for maximum privacy.</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">GDPR Compliant</h3>
                <p className="text-gray-600">Full compliance with international privacy regulations and data protection laws.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-r from-[#00e3ae] to-[#0090f1]">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Lab Reports?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join 15,000+ students who've improved their grades with AI-powered lab reports. 
              Start creating professional reports in under 30 seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/"
                className="bg-white text-[#0090f1] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                View Pricing
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>3 free reports included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Company info */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-xl flex items-center justify-center">
                    <Wand2 className="text-white" size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-bold">GradelyLabs AI</div>
                    <div className="text-sm text-gray-400">AI-Powered for Students</div>
                  </div>
                </div>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Empowering students worldwide with AI-powered lab report generation. 
                  Create professional, academic-quality reports in minutes, not hours.
                </p>
                <div className="flex items-center gap-4">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Github className="w-5 h-5" />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Product */}
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <div className="space-y-3 text-gray-400">
                  <Link href="/" className="block hover:text-white transition-colors">Generate Reports</Link>
                  <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                  <Link href="/help" className="block hover:text-white transition-colors">Help Center</Link>
                  <Link href="#" className="block hover:text-white transition-colors">API Documentation</Link>
                </div>
              </div>

              {/* Company */}
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <div className="space-y-3 text-gray-400">
                  <Link href="#" className="block hover:text-white transition-colors">About Us</Link>
                  <Link href="#" className="block hover:text-white transition-colors">Careers</Link>
                  <Link href="#" className="block hover:text-white transition-colors">Blog</Link>
                  <Link href="#" className="block hover:text-white transition-colors">Contact</Link>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 md:mb-0">
                <Globe className="w-4 h-4" />
                <span>Trusted by students in 50+ countries</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                <span>© 2025 GradelyLabs AI</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;