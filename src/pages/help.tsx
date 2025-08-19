// src/pages/help.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useSession } from 'next-auth/react';
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Upload,
  Settings,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target
} from 'lucide-react';

// Help content data
const helpContent = {
  gettingStarted: [
    {
      id: 'upload-files',
      title: 'Upload Your Lab Files',
      description: 'Learn how to upload PDF lab manuals and Excel data files',
      content: `
        1. Click "Upload Files" in the sidebar or main dashboard
        2. Drag and drop your files or click to browse:
           • Lab manual (PDF or DOCX)
           • Raw data (Excel/XLSX files)
           • Any additional documentation
        3. Supported formats: PDF, DOCX, XLSX, TXT
        4. Maximum file size: 20MB per file
        5. Click "Generate Lab Report" to start AI processing
      `,
      icon: <Upload className="w-5 h-5" />
    },
    {
      id: 'ai-generation',
      title: 'AI Report Generation',
      description: 'Understand how our AI creates comprehensive lab reports',
      content: `
        Our AI analyzes your uploaded content to create:
        • Professional title and abstract
        • Structured introduction with background theory
        • Detailed methodology section
        • Results with data analysis and charts
        • Discussion interpreting your findings
        • Proper academic conclusions
        • Formatted references
        
        The process takes 15-30 seconds depending on file size.
      `,
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 'edit-reports',
      title: 'Edit and Improve Reports',
      description: 'Use AI-powered editing to perfect your report',
      content: `
        1. Highlight any text in your generated report
        2. Type your editing instruction (e.g., "make this more technical")
        3. AI will rewrite that section in real-time
        4. Accept or reject each suggestion
        5. Use quick actions like "Improve Academic Tone"
        6. Check completeness against your rubric
      `,
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'export-share',
      title: 'Export and Share',
      description: 'Download your reports in multiple formats',
      content: `
        Export options available:
        • PDF - For submission and printing
        • Word (DOCX) - For further editing
        • Plain text - For copying content
        
        All exports maintain proper academic formatting with:
        • Times New Roman font
        • Double spacing
        • Proper margins
        • Professional layout
      `,
      icon: <Target className="w-5 h-5" />
    }
  ],
  
  features: [
    {
      title: 'Smart File Processing',
      description: 'Advanced AI reads and understands your lab manuals, data files, and requirements',
      details: [
        'PDF text extraction with layout preservation',
        'Excel data analysis and chart generation',
        'Multi-file processing for comprehensive reports',
        'Automatic format detection and handling'
      ]
    },
    {
      title: 'Real-time Text Editing',
      description: 'Highlight any text and get instant AI-powered improvements',
      details: [
        'Streaming text generation for immediate feedback',
        'Context-aware suggestions based on full report',
        'Accept/reject individual changes',
        'Maintain version history of all edits'
      ]
    },
    {
      title: 'Rubric-Based Analysis',
      description: 'Get detailed feedback based on your specific grading criteria',
      details: [
        'Upload grading rubrics for targeted analysis',
        'Section-by-section completeness checking',
        'Improvement suggestions for each criteria',
        'Grade estimation and missing element detection'
      ]
    },
    {
      title: 'Data Visualization',
      description: 'Automatic chart generation from your experimental data',
      details: [
        'Support for scatter plots, line graphs, and bar charts',
        'Automatic trendline calculation',
        'Professional formatting with proper labels',
        'Integration with report text and analysis'
      ]
    }
  ],

  faqs: [
    {
      question: 'What file formats are supported?',
      answer: 'We support PDF and DOCX for lab manuals, XLSX for data files, and TXT for additional documentation. Maximum file size is 20MB per file.'
    },
    {
      question: 'How accurate are the AI-generated reports?',
      answer: 'Our AI creates high-quality academic reports with proper structure and formatting. However, always review and edit the content to ensure accuracy for your specific experiment and requirements.'
    },
    {
      question: 'Can I edit the generated reports?',
      answer: 'Yes! Highlight any text to get AI-powered editing suggestions. You can also use quick actions like "Improve Academic Tone" or regenerate entire sections.'
    },
    {
      question: 'What\'s included in each subscription tier?',
      answer: 'Free: 3 reports/month. Basic: 15 reports/month + PDF export. Pro: 50 reports/month + advanced analytics. Plus: Unlimited reports + priority support.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Yes, we use enterprise-grade security with encryption in transit and at rest. Your files and reports are only accessible by you and are automatically deleted after 30 days.'
    },
    {
      question: 'Can I use this for any type of lab report?',
      answer: 'Our AI works best with science labs (biology, chemistry, physics) but can adapt to any structured experimental report with data analysis.'
    },
    {
      question: 'What if I reach my monthly limit?',
      answer: 'You can upgrade your plan anytime for more reports, or wait until the next month when your limit resets on the 1st.'
    },
    {
      question: 'How long does report generation take?',
      answer: 'Most reports are generated in 15-30 seconds. Complex files with lots of data may take up to 60 seconds.'
    }
  ],

  troubleshooting: [
    {
      issue: 'File upload fails',
      solutions: [
        'Check file size is under 20MB',
        'Ensure file format is supported (PDF, DOCX, XLSX, TXT)',
        'Try refreshing the page and uploading again',
        'Check your internet connection',
        'Contact support if problem persists'
      ]
    },
    {
      issue: 'Report generation takes too long',
      solutions: [
        'Wait up to 2 minutes for complex files',
        'Check if you have a stable internet connection',
        'Try uploading smaller or simpler files',
        'Refresh the page and try again',
        'Contact support if it takes more than 3 minutes'
      ]
    },
    {
      issue: 'Text editing not working',
      solutions: [
        'Make sure you\'ve highlighted text before editing',
        'Try refreshing the page',
        'Check if you\'ve reached your monthly limit',
        'Ensure you\'re clicking "Accept" after AI suggestions',
        'Try using a different browser'
      ]
    },
    {
      issue: 'Can\'t export reports',
      solutions: [
        'Check your browser allows downloads',
        'Try a different export format',
        'Ensure your report has content to export',
        'Clear browser cache and try again',
        'Contact support for assistance'
      ]
    }
  ]
};

const HelpPage = () => {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [expandedTrouble, setExpandedTrouble] = useState<number | null>(null);

  const userTier = session?.user?.tier || 'Free';
  const usageInfo = { current: 2, limit: 3 };

  // Filter content based on search
  const filterContent = (content: any[], searchTerm: string) => {
    if (!searchTerm) return content;
    return content.filter(item => 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.issue?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredGettingStarted = filterContent(helpContent.gettingStarted, searchTerm);
  const filteredFeatures = filterContent(helpContent.features, searchTerm);
  const filteredFAQs = filterContent(helpContent.faqs, searchTerm);
  const filteredTroubleshooting = filterContent(helpContent.troubleshooting, searchTerm);

  return (
    <Layout currentPage="dashboard" userTier={userTier} usageInfo={usageInfo}>
      <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#00e3ae]" />
              Help Center
            </h1>
            <p className="text-gray-600 text-lg">
              Everything you need to know about using StudyLab AI
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search help articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#00e3ae] focus:ring-2 focus:ring-[#00e3ae]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Navigation Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Navigation</h3>
                <nav className="space-y-2">
                  {[
                    { id: 'getting-started', label: 'Getting Started', icon: <Lightbulb className="w-4 h-4" /> },
                    { id: 'features', label: 'Features Guide', icon: <Settings className="w-4 h-4" /> },
                    { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-4 h-4" /> },
                    { id: 'troubleshooting', label: 'Troubleshooting', icon: <AlertTriangle className="w-4 h-4" /> },
                    { id: 'contact', label: 'Contact Support', icon: <MessageCircle className="w-4 h-4" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setExpandedSection(item.id);
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        expandedSection === item.id 
                          ? 'bg-[#00e3ae]/10 text-[#00e3ae] font-medium' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* Quick Contact */}
                <div className="mt-6 p-4 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-lg text-white">
                  <h4 className="font-semibold mb-2">Need More Help?</h4>
                  <p className="text-sm text-white/80 mb-3">
                    Our support team is here to help
                  </p>
                  <button
                    onClick={() => window.open('mailto:support@studylab.ai', '_blank')}
                    className="w-full bg-white text-[#0090f1] py-2 px-3 rounded font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Getting Started */}
              <section id="getting-started" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-[#00e3ae]" />
                  Getting Started
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredGettingStarted.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00e3ae] transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-[#00e3ae]/10 rounded-lg flex items-center justify-center text-[#00e3ae]">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Features Guide */}
              <section id="features" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#00e3ae]" />
                  Features Guide
                </h2>
                <div className="space-y-6">
                  {filteredFeatures.map((feature, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4 text-[#00e3ae] mt-0.5 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section id="faq" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-[#00e3ae]" />
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {filteredFAQs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900">{faq.question}</h3>
                        {expandedFAQ === index ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      {expandedFAQ === index && (
                        <div className="px-4 pb-4">
                          <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Troubleshooting */}
              <section id="troubleshooting" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-[#00e3ae]" />
                  Troubleshooting
                </h2>
                <div className="space-y-4">
                  {filteredTroubleshooting.map((trouble, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedTrouble(expandedTrouble === index ? null : index)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900">{trouble.issue}</h3>
                        {expandedTrouble === index ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      {expandedTrouble === index && (
                        <div className="px-4 pb-4">
                          <ul className="space-y-2">
                            {trouble.solutions.map((solution, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-700">
                                <CheckCircle className="w-4 h-4 text-[#00e3ae] mt-0.5 flex-shrink-0" />
                                {solution}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Contact Support */}
              <section id="contact" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-[#00e3ae]" />
                  Contact Support
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Mail className="w-6 h-6 text-[#00e3ae]" />
                      <h3 className="font-semibold text-gray-900">Email Support</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Get help with any issues or questions
                    </p>
                    <button
                      onClick={() => window.open('mailto:support@studylab.ai', '_blank')}
                      className="flex items-center gap-2 text-[#00e3ae] hover:text-[#00d49a] font-medium"
                    >
                      support@studylab.ai
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpen className="w-6 h-6 text-[#00e3ae]" />
                      <h3 className="font-semibold text-gray-900">Documentation</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Detailed guides and API documentation
                    </p>
                    <button
                      onClick={() => window.open('https://docs.studylab.ai', '_blank')}
                      className="flex items-center gap-2 text-[#00e3ae] hover:text-[#00d49a] font-medium"
                    >
                      View Documentation
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Support Response Times</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Free Plan:</strong> 48-72 hours</p>
                    <p><strong>Basic Plan:</strong> 24-48 hours</p>
                    <p><strong>Pro Plan:</strong> 12-24 hours</p>
                    <p><strong>Plus Plan:</strong> 4-12 hours priority support</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HelpPage;