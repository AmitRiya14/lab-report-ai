// --- /src/components/UploadForm.tsx ---
"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";

export default function UploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setMessage("Uploading file...");
    const formData = new FormData();
    formData.append("files", file);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      console.log("Upload response:", uploadData);

      const { extractedText, rawDataSummary } = uploadData;
      if (!extractedText && !rawDataSummary) {
        alert("Failed to extract content from file.");
        return;
      }

      setMessage("Generating report with Claude...");

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractedText,
          rawData: rawDataSummary,
        }),
      });

      const result = await generateRes.json();
      console.log("Claude response:", result);

      if (!result.report) {
        alert("Claude did not return a report.");
        return;
      }

      localStorage.setItem("labReport", result.report);
      if (onSuccess) onSuccess();
      //router.push("/report");
    } catch (err) {
      console.error("Upload/generation failed:", err);
      alert("Something went wrong while generating your report.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" onChange={handleFileChange} className="block w-full" />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Upload and Generate Report
      </button>
      {message && <p className="text-gray-700 text-sm">{message}</p>}
    </form>
  );
}
