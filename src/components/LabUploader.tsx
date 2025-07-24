"use client";
import React, { useState, useRef } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
// Import the required icons from lucide-react for the header and new features
import { 
  Wand2, 
  Settings, 
  User, 
  Upload, 
  FileText, 
  HelpCircle, 
  Crown,
  Zap,
  ChevronDown
} from "lucide-react";

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

  /**
   * Submit files to API and handle response
   * Stores generated report and chart data in localStorage
   */
  const handleSubmit = async () => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setProgressStatus("Initializing upload...");
    setMessage("");

    // Start progress simulation with estimated API duration
    const progressInterval = simulateProgress(12000); // 12 seconds estimated

    // ✅ ADD: Store current page as last successful page
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

      const uploadData = await uploadRes.json();
      console.log("Upload response:", uploadData);

      // Clear progress interval and set completion
      clearInterval(progressInterval);
      setUploadProgress(100);
      setProgressStatus("✅ Report generation complete!");

      // ✅ ADD THIS: Check for API errors first
      if (!uploadRes.ok) {
        console.error("Upload API error:", uploadData);
        setUploadProgress(0);
        setProgressStatus("❌ Upload failed");
        // Determine error type based on status code
        if (uploadRes.status >= 500) {
          // Server error
          router.push("/error?type=server");
        } else if (uploadRes.status === 413) {
          // File too large
          alert("Files are too large. Please ensure total size is under 20MB.");
          return;
        } else {
          // Other API error
          router.push("/error?type=unknown");
        }
        return;
      }

      // Validate response data
      if (!uploadData.labReport || !uploadData.chartSpec) {
        console.error("Invalid response data:", uploadData);
        setUploadProgress(0);
        setProgressStatus("❌ Data processing failed");
        // This is a data processing error
        localStorage.setItem('lastError', 'parse');
        router.push("/error?type=parse");
        return;
      }

      // ✅ UPDATED: Validate data quality
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

      // ✅ ADD THESE LINES RIGHT AFTER:
      if (uploadData.rubric) {
        localStorage.setItem("rubricText", uploadData.rubric);
        console.log("✅ Rubric stored:", uploadData.rubric.substring(0, 100) + "...");
      } else {
        console.warn("⚠️ No rubric in upload response");
      }

      // 🎯 NEW: Store the generated title from Claude
      if (uploadData.title) {
        localStorage.setItem("reportTitle", uploadData.title);
        console.log("🎯 Title stored:", uploadData.title);
      } else {
        console.warn("⚠️ No title in upload response");
        // Fallback: store a generic title
        localStorage.setItem("reportTitle", "Lab Report");
      }

      // Mark that user has successfully generated a report
      localStorage.setItem("hasGeneratedReport", "true");
      
      setMessage("Redirecting to your report...");
      
      // ✅ ADD: Store successful navigation
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
      
      // ✅ UPDATED: Determine error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error - can't reach server
        localStorage.setItem('lastError', 'network');
        router.push("/error?type=network");
      } else if (error instanceof SyntaxError) {
        // JSON parsing error - server returned invalid data
        localStorage.setItem('lastError', 'server');
        router.push("/error?type=server");
      } else {
        // Unknown error
        localStorage.setItem('lastError', 'unknown');
        router.push("/error?type=unknown");
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
  const handleReportNavigation = () => {
    if (hasGeneratedReport) {
      router.push("/report");
    } else {
      alert("Please generate a lab report first by uploading your files.");
    }
  };

  // Mock previous lab reports data
  const previousReports = [
    { id: "1", name: "BIOL", active: false },
    { id: "2", name: "BIZO", active: false },
    { id: "3", name: "Lab 4", active: false },
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-800">
      {/* Header - Copied exactly from report.tsx */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-100">
        {/* Left Side - Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#00e3ae] to-[#0090f1] rounded-xl flex items-center justify-center shadow-lg">
            <Wand2 className="text-white" size={22} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-800 leading-none">StudyLab AI</h1>
            <span className="text-xs text-gray-500 leading-none mt-0.5">AI-Powered for Students</span>
          </div>
        </div>

        {/* Center - Navigation Tabs */}
        <div className="flex items-center bg-gray-50 rounded-xl p-1">
          <button className="px-5 py-2.5 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all">
            Dashboard
          </button>
          <button 
            onClick={handleReportNavigation}
            className={`px-5 py-2.5 font-medium transition-all rounded-lg ${
              hasGeneratedReport
                ? 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-sm'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!hasGeneratedReport}
          >
            Lab Report
          </button>
        </div>

        {/* Right Side - Settings and User Profile */}
        <div className="flex items-center gap-3">
          {/* Settings Icon */}
          <button className="p-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all hover:scale-105">
            <Settings size={20} />
          </button>
          
          {/* User Profile with Pro Badge */}
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-200">
              <User className="text-gray-600" size={22} />
            </div>
            {/* Pro Badge */}
            <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-md">
              Pro
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r p-4 space-y-4 shadow-sm">
          <nav className="space-y-2">
            <button className="flex items-center gap-3 text-white bg-gradient-to-r from-[#00e3ae] to-[#0090f1] rounded-xl px-4 py-2 font-semibold w-full text-left">
              <Upload size={16} /> Upload Files
            </button>
            <button 
              onClick={handleReportNavigation}
              className={`flex items-center gap-3 rounded-xl px-4 py-2 w-full text-left transition-colors ${
                hasGeneratedReport 
                  ? 'text-gray-600 hover:text-cyan-600 hover:bg-gray-50' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasGeneratedReport}
            >
              <FileText size={16} /> Report Editing
            </button>
            <button className="flex items-center gap-3 text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-xl px-4 py-2 w-full text-left transition-colors">
              <Settings size={16} /> Settings
            </button>
            <button className="flex items-center gap-3 text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-xl px-4 py-2 w-full text-left transition-colors">
              <HelpCircle size={16} /> Help
            </button>
          </nav>

          {/* Previous Lab Reports */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Previous Reports</h3>
            <div className="space-y-2">
              {previousReports.map((report) => (
                <button
                  key={report.id}
                  className="w-full text-left px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
                >
                  {report.id} {report.name}
                </button>
              ))}
            </div>
          </div>

          {/* Profile upgrade section - Copied from report.tsx */}
          <div className="bg-gradient-to-br from-[#00e3ae] to-[#0090f1] text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <Crown size={18} /> My Profile
            </div>
            <p className="text-xs text-white/80">Student Premium</p>
            <button className="mt-3 w-full bg-white text-[#0090f1] text-sm font-semibold py-1 rounded-md shadow-sm hover:bg-blue-50">
              Upgrade Now
            </button>
            <p className="mt-1 text-xs underline text-white/80 cursor-pointer">Learn More</p>
          </div>
        </aside>

        {/* Main Content - Updated layout */}
        <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
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
    </div>
  );
}