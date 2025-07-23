"use client";
import React, { useState, useRef } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

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
    setFiles(e.dataTransfer.files);
  };

  /**
   * Trigger file input when upload box is clicked
   */
  const handleBoxClick = () => {
    inputRef.current?.click();
  };

  /**
   * Submit files to API and handle response
   * Stores generated report and chart data in localStorage
   */
  const handleSubmit = async () => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage("Uploading files...");

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

      // ✅ ADD THIS: Check for API errors first
      if (!uploadRes.ok) {
        console.error("Upload API error:", uploadData);
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
        // This is a data processing error
      localStorage.setItem('lastError', 'parse');
      router.push("/error?type=parse");
      return;
    }

    // ✅ UPDATED: Validate data quality
    if (uploadData.labReport.length < 100) {
      console.error("Generated report too short:", uploadData.labReport);
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

      setMessage("✅ Report generated. Redirecting...");
      // ✅ ADD: Store successful navigation
    localStorage.setItem('lastSuccessfulPage', '/report');
    router.push("/report");
    } catch (error) {
      console.error("Error during upload/generation:", error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center px-4 py-12">
      <div
        className="max-w-2xl w-full bg-white p-10 rounded-2xl shadow-lg border border-blue-200"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Header */}
        <h1 className="text-3xl font-bold text-center text-blue-800 mb-4">
          Upload Files for Lab Report
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Drag and drop or select lab manuals, raw data, or any other relevant files.
        </p>

        {/* Upload Area */}
        <div
          className="w-full border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 cursor-pointer"
          onClick={handleBoxClick}
        >
          <ArrowUpTrayIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          
          {/* Hidden file input */}
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            ref={inputRef}
          />
          
          <p className="text-blue-700 font-medium">Click anywhere in this box to select files</p>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: PDF, DOCX, XLSX. Max total size: 20MB.
          </p>

          {/* File preview */}
          {files && (
            <div className="mt-4 text-sm text-gray-700">
              <p className="font-semibold">Selected files:</p>
              <ul className="list-disc list-inside">
                {Array.from(files).map((file, i) => (
                  <li key={i}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
        >
          {uploading ? "Uploading..." : "Generate Report"}
        </button>

        {/* Status message */}
        {message && (
          <div className="mt-4 text-center text-blue-700 font-medium">
            {message}
          </div>
        )}

        {/* Help section */}
        <div className="text-sm text-gray-600 mt-8">
          <details>
            <summary className="cursor-pointer text-blue-600 font-medium">
              What kind of files should I upload?
            </summary>
            <p className="mt-2">
              Upload your lab manual (PDF/DOCX), raw data (XLSX), and submission instructions. 
              These will be parsed by our AI to create a complete structured report.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}