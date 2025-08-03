"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/Layout";
// Import the required icons from lucide-react for the header and new features
import {
  Upload,
  Zap,
  ChevronDown
} from "lucide-react";
import { AlertTriangle, TrendingUp } from "lucide-react";

/**
 * LabUploader Component
 * 
 * Main file upload interface for lab report generation.
 * Handles drag-and-drop, file selection, and API communication.
 * 
 * Supported formats: PDF, DOCX, XLSX
 * Features:
 * - Drag and drop file upload
 * - Visual file preview
 * - Progress feedback
 * - Error handling
 * - Local storage integration
 */
export default function LabUploader() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Get user info for layout
  const userTier = 'Free'; // This would come from your user context/state
  const usageInfo = { current: 2, limit: 3 }; // This would come from your usage tracking


  /**
   * Handle file selection from input element
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  /**
   * Handle drag and drop file upload
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  /**
   * Trigger file input when upload box is clicked
   */
  const handleBoxClick = () => {
    inputRef.current?.click();
  };

  /**
   * Simulate progress updates with realistic status messages
   * Progress is distributed over the actual API call duration
   */
  const simulateProgress = (estimatedDuration = 15000) => {
    const progressSteps = [
      { progress: 5, status: "Initializing upload..." },
      { progress: 15, status: "Reading your document..." },
      { progress: 30, status: "Analyzing lab manual structure..." },
      { progress: 45, status: "Processing experimental data..." },
      { progress: 60, status: "Generating report sections..." },
      { progress: 75, status: "Creating charts and visualizations..." },
      { progress: 90, status: "Formatting academic content..." },
      { progress: 98, status: "Finalizing report structure..." }
    ];

    const stepInterval = estimatedDuration / progressSteps.length;
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        const step = progressSteps[stepIndex];
        setUploadProgress(step.progress);
        setProgressStatus(step.status);
        stepIndex++;
      }
    }, stepInterval);

    return interval;
  };


// Fix line 116 - replace 'any' with proper type
const UsageDisplay = () => {
  const [usage, setUsage] = useState<{current: number; limit: number; tier: string} | null>(null);

  
  useEffect(() => {
    const getCurrentUsage = () => {
      try {
        const usageData = localStorage.getItem('currentUsage');
        return usageData ? JSON.parse(usageData) : null;
      } catch {
        return null;
      }
    };

    const currentUsage = getCurrentUsage();
    setUsage(currentUsage);

    // Listen for usage updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUsage') {
        const newUsage = e.newValue ? JSON.parse(e.newValue) : null;
        setUsage(newUsage);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!usage) return null;

  const percentage = Math.min(100, (usage.current / usage.limit) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = usage.current >= usage.limit;
  const isUnlimited = usage.limit === 999;

  if (isUnlimited) return null; // Don't show for unlimited plans

  return (
    <div className={`rounded-xl p-4 border mb-6 ${
      isAtLimit ? 'bg-red-50 border-red-200' : 
      isNearLimit ? 'bg-amber-50 border-amber-200' : 
      'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          <TrendingUp size={16} />
          Monthly Usage ({usage.tier} Plan)
        </h3>
        {isAtLimit && (
          <button
            onClick={() => router.push('/pricing')}
            className="text-xs bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white px-3 py-1.5 rounded-full hover:shadow-md transition-all font-semibold"
          >
            Upgrade Now
          </button>
        )}
      </div>
      
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-gray-600">
          Reports: {usage.current}/{usage.limit}
        </span>
        <span className={`font-semibold ${
          isAtLimit ? 'text-red-600' : 
          isNearLimit ? 'text-amber-600' : 
          'text-green-600'
        }`}>
          {usage.limit - usage.current} remaining
        </span>
      </div>
      
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit ? 'bg-red-500' : 
            isNearLimit ? 'bg-amber-500' : 
            'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      {isAtLimit ? (
        <div className="flex items-start gap-2 bg-red-100 p-3 rounded-lg">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium mb-2">
              You've reached your monthly limit of {usage.limit} reports!
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-red-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Upgrade to Continue Generating Reports
            </button>
          </div>
        </div>
      ) : isNearLimit ? (
        <div className="flex items-start gap-2 bg-amber-100 p-3 rounded-lg">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-700 mb-2">
              You're close to your monthly limit. Consider upgrading for unlimited access.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-amber-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              View Upgrade Options
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 bg-green-100 p-2 rounded text-center">
          🎉 You have {usage.limit - usage.current} reports remaining this month
        </p>
      )}
    </div>
  );
};

/**
   * Submit files to API and handle response
   * Enhanced with usage limit detection and proper error routing
   */
  const handleSubmit = async () => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setProgressStatus("Initializing upload...");
    setMessage("");

    // Start progress simulation with estimated API duration
    const progressInterval = simulateProgress(12000); // 12 seconds estimated

    // Store current page as last successful page
    localStorage.setItem('lastSuccessfulPage', '/');

    // Prepare form data for multipart upload
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      // Upload files and generate report
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // Clear progress interval and handle response
      clearInterval(progressInterval);

      // Handle specific error responses
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        console.error("Upload API error:", uploadRes.status, errorData);
        
        setUploadProgress(0);
        setProgressStatus("❌ Upload failed");
        
        // Handle usage limit specifically
        if (uploadRes.status === 429 && errorData.error === 'Usage limit exceeded') {
          // Store usage info in localStorage for the error page
          if (errorData.usage) {
            localStorage.setItem('lastUsageInfo', JSON.stringify(errorData.usage));
          }
          localStorage.setItem('lastError', 'usage_limit');
          
          // Show specific message for usage limit
          setProgressStatus("❌ Monthly report limit reached");
          setMessage("Redirecting to upgrade options...");
          
          // Redirect to error page with usage_limit type
          setTimeout(() => {
            router.push('/error?type=usage_limit');
          }, 2000);
          return;
        }
        
        // Handle authentication errors
        if (uploadRes.status === 401) {
          localStorage.setItem('lastError', 'auth');
          setProgressStatus("❌ Authentication required");
          router.push('/error?type=auth');
          return;
        }
        
        // Handle file size errors
        if (uploadRes.status === 413) {
          setProgressStatus("❌ Files too large");
          alert("Files are too large. Please ensure total size is under 20MB.");
          return;
        }
        
        // Handle server errors (5xx)
        if (uploadRes.status >= 500) {
          localStorage.setItem('lastError', 'server');
          setProgressStatus("❌ Server error");
          router.push("/error?type=server");
          return;
        }
        
        // Handle other client errors (4xx)
        if (uploadRes.status >= 400) {
          localStorage.setItem('lastError', 'data');
          setProgressStatus("❌ Processing error");
          router.push("/error?type=data");
          return;
        }
        
        // Generic error fallback
        localStorage.setItem('lastError', 'unknown');
        setProgressStatus("❌ Unknown error");
        router.push("/error?type=unknown");
        return;
      }

      // Parse successful response
      const uploadData = await uploadRes.json();
      console.log("Upload response:", uploadData);

      setUploadProgress(100);
      setProgressStatus("✅ Report generation complete!");

      // Validate response data
      if (!uploadData.labReport || uploadData.chartSpec === undefined) {
        console.error("Invalid response data:", uploadData);
        setUploadProgress(0);
        setProgressStatus("❌ Invalid response data");
        localStorage.setItem('lastError', 'parse');
        router.push("/error?type=parse");
        return;
      }

      // Validate data quality
      if (uploadData.labReport.length < 100) {
        console.error("Generated report too short:", uploadData.labReport);
        setUploadProgress(0);
        setProgressStatus("❌ Report generation failed");
        localStorage.setItem('lastError', 'parse');
        router.push("/error?type=parse");
        return;
      }

      // Store generated content in localStorage for report page
      localStorage.setItem("labReport", uploadData.labReport);
      localStorage.setItem("chartSpec", JSON.stringify(uploadData.chartSpec));

      // Store rubric if provided
      if (uploadData.rubric) {
        localStorage.setItem("rubricText", uploadData.rubric);
        console.log("✅ Rubric stored:", uploadData.rubric.substring(0, 100) + "...");
      } else {
        console.warn("⚠️ No rubric in upload response");
      }

      // Store the generated title from Claude
      if (uploadData.title) {
        localStorage.setItem("reportTitle", uploadData.title);
        console.log("🎯 Title stored:", uploadData.title);
      } else {
        console.warn("⚠️ No title in upload response");
        localStorage.setItem("reportTitle", "Lab Report");
      }

      // Store usage info for display throughout the app
      if (uploadData.usage) {
        localStorage.setItem('currentUsage', JSON.stringify(uploadData.usage));
        console.log("📊 Usage updated:", uploadData.usage);
      }

      // Mark that user has successfully generated a report
      localStorage.setItem("hasGeneratedReport", "true");
      
      setMessage("Redirecting to your report...");
      
      // Store successful navigation
      localStorage.setItem('lastSuccessfulPage', '/report');
      
      // Redirect after brief delay to show completion
      setTimeout(() => {
        router.push("/report");
      }, 1500);
      
    } catch (error) {
      console.error("Error during upload/generation:", error);
      clearInterval(progressInterval);
      setUploadProgress(0);
      setProgressStatus("❌ Network error occurred");
      
      // Determine error type and route appropriately
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error - can't reach server
        localStorage.setItem('lastError', 'network');
        setMessage("Network connection failed. Redirecting...");
        setTimeout(() => {
          router.push("/error?type=network");
        }, 2000);
      } else if (error instanceof SyntaxError) {
        // JSON parsing error - server returned invalid data
        localStorage.setItem('lastError', 'server');
        setMessage("Server returned invalid data. Redirecting...");
        setTimeout(() => {
          router.push("/error?type=server");
        }, 2000);
      } else {
        // Unknown error
        localStorage.setItem('lastError', 'unknown');
        setMessage("An unexpected error occurred. Redirecting...");
        setTimeout(() => {
          router.push("/error?type=unknown");
        }, 2000);
      }
    } finally {
      setUploading(false);
    }
  };

  // Check if user has generated a report before
  const hasGeneratedReport = typeof window !== 'undefined' ? localStorage.getItem("hasGeneratedReport") === "true" : false;

  /**
   * Handle navigation to report page
   */
  /*const handleReportNavigation = () => {
    if (hasGeneratedReport) {
      router.push("/report");
    } else {
      alert("Please generate a lab report first by uploading your files.");
    }
  };
*/

  // Mock previous lab reports data
  /*const previousReports = [
    { id: "1", name: "BIOL", active: false },
    { id: "2", name: "BIZO", active: false },
    { id: "3", name: "Lab 4", active: false },
  ];
*/
  return (        
      <Layout 
    currentPage="dashboard" 
    userTier={userTier} 
    usageInfo={usageInfo}
  >
        {/* Main Content - Updated layout */}
        <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* ADD THIS: Usage Display Card - shows before upload card */}
            <UsageDisplay />
            {/* Upload Card */}
            <div className="bg-white shadow rounded-xl p-8 mb-6">
              {/* Upload Area */}
              <div
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer ${
                  isDragOver 
                    ? 'border-[#00e3ae] bg-[#00e3ae]/5 scale-105' 
                    : 'border-gray-300 hover:border-[#00e3ae] hover:bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleBoxClick}
              >
                {/* Hidden file input */}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                  ref={inputRef}
                />
                
                <div className="flex flex-col items-center space-y-4">
                  {/* Floating Upload Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-full flex items-center justify-center shadow-lg animate-float">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Upload your lab manual here
                    </h3>
                    <p className="text-gray-600 mb-4">
                      or <span className="text-[#00e3ae] font-medium cursor-pointer hover:underline">click to browse</span> your files
                    </p>
                    <p className="text-sm text-gray-500">
                      Maximum file size: 50MB
                    </p>
                  </div>
                </div>

                {/* File preview */}
                {files && (
                  <div className="mt-6 text-sm text-gray-700">
                    <p className="font-semibold">Selected files:</p>
                    <ul className="list-disc list-inside mt-2">
                      {Array.from(files).map((file, i) => (
                        <li key={i} className="text-gray-600">{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Supported Formats */}
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-3">Supported formats:</p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-[#00e3ae]/10 text-[#00e3ae] text-xs font-medium rounded-full border border-[#00e3ae]/20">
                      .docx
                    </span>
                    <span className="px-3 py-1 bg-[#0090f1]/10 text-[#0090f1] text-xs font-medium rounded-full border border-[#0090f1]/20">
                      .pdf
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200">
                      .txt
                    </span>
                  </div>
                </div>

                {/* Generate Lab Report Button */}
                <button
                  onClick={handleSubmit}
                  disabled={uploading || !files}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] hover:from-[#00d49a] hover:to-[#007fd8] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Zap className="w-5 h-5" />
                  {uploading ? "Generating..." : "Generate Lab Report"}
                </button>
              </div>

              {/* Progress Bar - Shows during upload */}
              {uploading && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#0090f1]" />
                      Generation Status
                    </h4>
                    <span className="text-sm font-bold text-[#0090f1]">{uploadProgress}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00e3ae] to-[#0090f1] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Status Text */}
                  <p className="text-sm text-gray-600 font-medium">
                    {progressStatus}
                  </p>
                </div>
              )}

              {/* Status message - Only show when not uploading */}
              {message && !uploading && (
                <div className="mt-4 text-center text-[#0090f1] font-medium">
                  {message}
                </div>
              )}
            </div>

            {/* Help section */}
            <div className="bg-white rounded-xl p-6 shadow">
              <div 
                className="cursor-pointer flex items-center gap-2 text-[#0090f1] font-medium"
                onClick={() => setIsHelpExpanded(!isHelpExpanded)}
              >
                <ChevronDown 
                  size={16} 
                  className={`transform transition-transform duration-200 ${
                    isHelpExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                />
                What kind of files should I upload?
              </div>
              
              {isHelpExpanded && (
                <div className="mt-3 pl-6 border-l-2 border-[#00e3ae]/20">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Upload your lab manual (PDF/DOCX), raw data (XLSX), and submission instructions. 
                    These will be parsed by our AI to create a complete structured report with proper 
                    analysis, charts, and academic formatting.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Custom CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </Layout>
  );
}