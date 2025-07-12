// --- /components/UploadForm.tsx ---
"use client";
import React, { useState } from "react";

export default function UploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.extractedText) {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.extractedText,
          rawData: data.rawData || "No raw data was provided. Please interpret results based on expected trends and procedures."
        }),
      });

      const report = await genRes.json();
      localStorage.setItem("labReport", report.generatedReport);
      setMessage("Report successfully generated! View it on the report page.");
      onSuccess?.();
    } else {
      setMessage(data.message || "Upload failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" accept=".pdf,.doc,.docx,.txt,.xlsx" onChange={handleFileChange} className="block w-full" />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Upload</button>
      {message && <p className="text-green-700 whitespace-pre-line">{message}</p>}
    </form>
  );
}