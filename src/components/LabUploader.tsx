"use client";
import React, { useState, useRef } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

export default function LabUploader() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles(e.dataTransfer.files);
  };

  const handleBoxClick = () => {
    inputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        window.location.href = "/report";
      } else {
        window.location.href = "/error";
      }
    } catch (error) {
      console.error("Upload error:", error);
      window.location.href = "/error";
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
        <h1 className="text-3xl font-bold text-center text-blue-800 mb-4">Upload Files for Lab Report</h1>
        <p className="text-center text-sm text-gray-600 mb-6">Drag and drop or select lab manuals, raw data, or any other relevant files.</p>

        <div
          className="w-full border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 cursor-pointer"
          onClick={handleBoxClick}
        >
          <ArrowUpTrayIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            ref={inputRef}
          />
          <p className="text-blue-700 font-medium">Click anywhere in this box to select files</p>
          <p className="text-xs text-gray-500 mt-2">Supported formats: PDF, DOCX, XLSX. Max total size: 20MB.</p>

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

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
        >
          {uploading ? "Uploading..." : "Generate Report"}
        </button>

        {uploading && <div className="mt-4 text-center text-blue-600">Uploading... please wait.</div>}

        <div className="text-sm text-gray-600 mt-8">
          <details>
            <summary className="cursor-pointer text-blue-600 font-medium">What kind of files should I upload?</summary>
            <p className="mt-2">
              Upload your lab manual (PDF/DOCX), raw data (XLSX), and submission instructions. These will be parsed by our AI to create a complete structured report.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
