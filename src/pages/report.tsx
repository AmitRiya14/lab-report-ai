/**
 * Report Page Component
 * * Main lab report editing interface with AI-powered features including:
 * - ContentEditable report editor with real-time text editing
 * - AI-powered text suggestions with streaming responses
 * - Chart visualization from Excel data
 * - Rubric-based feedback system
 * - Version history and restore functionality
 * - Export capabilities for multiple formats
 * - Previous reports management
 * * Key Features:
 * - Inline text editing with Claude AI integration
 * - Streaming text generation with real-time display
 * - Accept/reject suggestions with visual feedback
 * - Chart.js integration for data visualization
 * - localStorage persistence for report data
 * - Auto-save functionality for reports
 * - ML-powered text humanization
 */

import React, { useEffect, useRef, useState } from "react";
import { Chart as ChartJS, registerables, ChartDataset } from "chart.js";
ChartJS.register(...registerables);
import { marked } from "marked";
import { Layout } from "@/components/Layout";
import { useRouter } from "next/navigation";
import {
  Wand2,
  RefreshCw,
  Lightbulb,
  ListChecks,
  PenLine,
  ArrowDownToLine,
  FileText as FileIcon,
  BookText,
  FileCode2,
  FileType2,
  CircleCheck,
  ChevronDown,
  Target, Copy, Check, Edit3, User,
  Bot, // New icon for humanization
  Sparkles,
} from "lucide-react";
import PromptPopover from "@/components/PromptModal";
import { 
  exportToWord, 
  exportToAdvancedPDF 
} from '@/utils/exportUtils';

import { stripMarkdownSync } from '@/utils/textUtils';
import { useReportManager } from "@/hooks/useReportManager";
import { HumanizationPanel } from "@/components/HumanizationPanel"; // New import
import { useHumanization } from "@/hooks/useHumanization";
// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Chart specification type for data visualization
 */
type ChartSpec = {
  graphType: "scatter" | "line" | "bar";
  xLabel: string;
  yLabel: string;
  labels?: (string | number)[];
  series: {
    label: string;
    column?: string;
    values: number[];
  }[];
};

/**
 * Version history entry type
 */
type VersionHistoryEntry = {
  timestamp: string;
  summary: string;
  content: string;
};

// ========================================
// MAIN COMPONENT
// ========================================

export default function ReportPage() {
  // ========================================
  // STATE DECLARATIONS (organized by purpose)
  // ========================================
  
  // Basic report metadata
  const [title, setTitle] = useState("Lab Report");  
  const [name, setName] = useState("Student Name");
  const [date] = useState(new Date().toLocaleDateString());
  const [isEditingName, setIsEditingName] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Report content and data
  const [reportText, setReportText] = useState("");
  const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null);
  
  // Rubric and feedback system
  const [rubricFeedback, setRubricFeedback] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [manualText, setManualText] = useState("");
  const [cleanRubric] = useState("");
  const [rubricAnalysis, setRubricAnalysis] = useState("");
  const [showOriginalRubric, setShowOriginalRubric] = useState(true);

  // Modal and text selection state
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedText, setSelectedText] = useState("");
  const [previewText, setPreviewText] = useState("");
  
  // Streaming and loading states
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditStreaming, setIsEditStreaming] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [streamingText, setStreamingText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [streamingContainer, setStreamingContainer] = useState<HTMLElement | null>(null);
  
  // New ML humanization state
  const [showHumanizationPanel, setShowHumanizationPanel] = useState(false);
  const [humanizationResult, setHumanizationResult] = useState<string>('');
  const [isHumanizing, setIsHumanizing] = useState(false);
  
  const chartInstanceRef = useRef<ChartJS | null>(null);

  // Version history
  const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([
    {
      timestamp: new Date().toLocaleString(),
      summary: "Original generation",
      content: typeof window !== 'undefined' ? localStorage.getItem("labReport") || "" : "",
    },
  ]);

  const router = useRouter();

  // ========================================
  // REFS (for DOM manipulation and chart management)
  // ========================================
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // ========================================
  // HOOKS
  // ========================================

  const {
    currentReportId,
    loading: reportLoading,
    error: reportError,
    loadReport,
    saveCurrentReport,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    autoSaveStatus,
    lastSaved,
  } = useReportManager(editorRef, setReportText, setTitle, setVersionHistory);

  const humanization = useHumanization({
    onProgress: (message) => {
      console.log('Humanization progress:', message);
    },
    onComplete: (humanizedText) => {
      setHumanizationResult(humanizedText);
      // Optionally auto-apply to editor
      if (editorRef.current) {
        editorRef.current.innerHTML = humanizedText;
        setReportText(humanizedText);
        setHasUnsavedChanges(true);
      }
    },
    onError: (error) => {
      console.error('Humanization error:', error);
      alert(`Humanization failed: ${error}`);
    }
  });

  // ========================================
  // CORE FUNCTIONALITY HANDLERS
  // ========================================

  const handleReportSelect = async (reportId: string) => {
    await loadReport(reportId);
  };

  const userTier = 'Pro';
  const usageInfo = { current: 15, limit: 50 };

  const handleCopyReport = async () => {
    const editor = editorRef.current;
    if (!editor) {
      alert("No report content to copy");
      return;
    }
    try {
      const cleanContent = editor.innerText || editor.textContent || "";
      const fullReport = `${title}\n\nStudent: ${name}\nDate: ${date}\n\n${cleanContent}`;
      await navigator.clipboard.writeText(fullReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy to clipboard. Please try again.");
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = (newName: string) => {
    setName(newName.trim() || "Student Name");
    setIsEditingName(false);
    localStorage.setItem("studentName", newName.trim() || "Student Name");
  };

  const handleHighlightEdit = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();

    if (text && rect && range) {
      setSelectedText(text);
      setPopoverAnchor(rect);
      savedRangeRef.current = range.cloneRange();
      const words = text.split(/\s+/);
      setPreviewText(
        words.length > 10
          ? `${words.slice(0, 5).join(" ")} ... ${words.slice(-5).join(" ")}`
          : text
      );
      setModalOpen(true);
    }
  };

  const applyDiff = async (prompt: string) => {
    setModalOpen(false);
    const range = savedRangeRef.current;
    const editor = editorRef.current;
    if (!range || !editor) {
      console.warn("Missing saved range or editor reference");
      return;
    }
    const existingBoxes = editor.querySelectorAll(".inline-action-box");
    existingBoxes.forEach(box => box.remove());
    const existingContainers = editor.querySelectorAll(".inline-edit-suggestion");
    existingContainers.forEach(container => {
      container.removeAttribute("data-processing");
    });
    const originalText = range.toString();
    const streamingSpan = document.createElement("span");
    streamingSpan.className = "inline-edit-suggestion animate-pulse";
    streamingSpan.setAttribute("data-original", encodeURIComponent(originalText));
    streamingSpan.setAttribute("data-processing", "true");
    streamingSpan.innerHTML = '<span class="streaming-content text-gray-500 italic">Claude is rewriting...</span>';
    try {
      range.extractContents();
      range.insertNode(streamingSpan);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error("Range manipulation error:", error);
      return;
    }
    setStreamingContainer(streamingSpan);
    setIsEditStreaming(true);
    setStreamingText("");
    try {
      const response = await fetch("/api/edit-highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          original: originalText,
          fullReport: editor.innerText,
        }),
      });
      if (!response.ok) {
        if (response.status >= 500) {
          localStorage.setItem('lastError', 'server');
          router.push("/error?type=server");
          return;
        } else if (response.status === 429) {
          const contentSpan = streamingSpan.querySelector('.streaming-content');
          if (contentSpan) {
            contentSpan.innerHTML = '<span class="text-orange-600 font-medium">⚠️ Too many requests. Please wait and try again.</span>';
          }
          streamingSpan.classList.remove("animate-pulse");
          streamingSpan.removeAttribute("data-processing");
          setIsEditStreaming(false);
          setStreamingContainer(null);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";
      const contentSpan = streamingSpan.querySelector('.streaming-content');
      if (!contentSpan) {
        throw new Error("Content span not found in streaming container");
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              const newText = parsed.delta.text;
              accumulatedText += newText;
              let displayText = accumulatedText
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>');
              if (displayText.includes('\n\n')) {
                const paragraphs = displayText.split('\n\n').filter(p => p.trim());
                displayText = paragraphs.map(p => 
                  p.trim() ? `<p class="inline">${p.replace(/\n/g, '<br>')}</p>` : ''
                ).join('');
              } else {
                displayText = displayText.replace(/\n/g, '<br>');
              }
              contentSpan.innerHTML = displayText || accumulatedText;
              contentSpan.className = 'streaming-content text-gray-800';
              setStreamingText(accumulatedText);
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          } catch (parseError) {
            console.warn("⚠️ JSON parse error, skipping line:", parseError);
          }
        }
      }
      if (streamingSpan && accumulatedText.trim()) {
        streamingSpan.classList.remove("animate-pulse");
        streamingSpan.removeAttribute("data-processing");
        setTimeout(() => {
          if (!streamingSpan.querySelector(".inline-action-box")) {
            const actionBox = document.createElement("div");
            actionBox.className = "inline-action-box";
            actionBox.innerHTML = `
              <button class="accept-btn">✅ Accept</button>
              <button class="reject-btn">❌ Reject</button>
            `;
            streamingSpan.appendChild(actionBox);
          }
        }, 200);
        setVersionHistory(prev => [
          {
            timestamp: new Date().toLocaleString(),
            summary: `Edit: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`,
            content: editor.innerHTML,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("💥 Edit streaming error:", err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        localStorage.setItem('lastError', 'network');
        router.push("/error?type=network");
      } else if (err instanceof Error && err.name === 'AbortError') {
        const contentSpan = streamingSpan.querySelector('.streaming-content');
        if (contentSpan) {
          contentSpan.innerHTML = '<span class="text-gray-600 font-medium">Edit was cancelled.</span>';
        }
      } else {
        const contentSpan = streamingSpan.querySelector('.streaming-content');
        if (contentSpan) {
          contentSpan.innerHTML = `<span class="text-red-600 font-medium">❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}</span>`;
        }
      }
      streamingSpan.classList.remove("animate-pulse");
      streamingSpan.removeAttribute("data-processing");
    } finally {
      setIsEditStreaming(false);
      setStreamingContainer(null);
      savedRangeRef.current = null;
    }
  };

  const handleCheckCompleteness = async () => {
    console.log("🚀 Starting rubric analysis...");
    setRubricAnalysis("");
    setIsStreaming(true);
    try {
      const response = await fetch("/api/rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reportText, 
          rubricText, 
          manualText 
        }),
      });
      if (!response.ok) {
        console.error(`Rubric API error: ${response.status}`);
        if (response.status >= 500) {
          localStorage.setItem('lastError', 'server');
          router.push("/error?type=server");
          return;
        } else if (response.status === 429) {
          setRubricAnalysis("❌ Too many requests. Please wait a moment and try again.");
          setIsStreaming(false);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let accumulatedPlainText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              const newText = parsed.delta.text;
              accumulatedText += newText;
              const cleanText = stripMarkdownSync(accumulatedText);
              accumulatedPlainText = cleanText;
              setRubricAnalysis(cleanText);
            }
          } catch (parseError) {
            console.warn("⚠️ JSON parse error in rubric response:", parseError);
          }
        }
      }
      if (accumulatedPlainText) {
        localStorage.setItem("lastRubricAnalysis", accumulatedPlainText);
      }
    } catch (error) {
      console.error("💥 Rubric analysis error:", error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        localStorage.setItem('lastError', 'network');
        router.push("/error?type=network");
      } else if (error instanceof Error && error.name === 'AbortError') {
        setRubricAnalysis("Analysis was cancelled.");
      } else {
        setRubricAnalysis(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleRestore = async (content: string) => {
    if (!content || content.trim().length < 10) {
      console.warn("Empty restore content – skipping restoration");
      return;
    }
    const html = content.includes("<p>") ? content : await marked.parse(content);
    setReportText(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };

  const handleExport = async (format: string) => {
    const editor = editorRef.current;
    if (!editor) {
      alert("No report content to export");
      return;
    }
    try {
      switch (format) {
        case "PDF":
          await exportToAdvancedPDF(editor, title);
          break;
        case "DOCX":
          await exportToWord(reportText, title, name, date);
          break;
        default:
          alert(`Export format ${format} not implemented yet.`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed. Please try again.");
    }
  };

  const streamReportRegeneration = async (prompt: string, actionType: 'regenerate' | 'improve-tone') => {
    const editor = editorRef.current;
    if (!editor) {
      console.error("Editor reference not found");
      return;
    }
    setIsEditStreaming(true);
    const originalContent = editor.innerHTML;
    editor.innerHTML = `
      <div class="flex items-center justify-center py-12 text-gray-500">
        <div class="text-center">
          <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-lg font-medium">Claude is ${actionType === 'regenerate' ? 'regenerating your entire report' : 'improving the academic tone'}...</p>
          <p class="text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    `;
    try {
      const response = await fetch("/api/edit-highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          original: originalContent,
          fullReport: editor.innerText,
        }),
      });
      if (!response.ok) {
        if (response.status >= 500) {
          localStorage.setItem('lastError', 'server');
          router.push("/error?type=server");
          return;
        } else if (response.status === 429) {
          editor.innerHTML = `
            <div class="flex items-center justify-center py-12 text-orange-600">
              <div class="text-center">
                <p class="text-lg font-medium">⚠️ Too many requests</p>
                <p class="text-sm mt-2">Please wait a moment and try again</p>
              </div>
            </div>
          `;
          setTimeout(() => {
            editor.innerHTML = originalContent;
          }, 3000);
          setIsEditStreaming(false);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";
      editor.innerHTML = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              const newText = parsed.delta.text;
              accumulatedText += newText;
              const htmlContent = await marked.parse(accumulatedText);
              editor.innerHTML = htmlContent;
              editor.scrollTop = editor.scrollHeight;
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          } catch (parseError) {
            console.warn("⚠️ JSON parse error, skipping line:", parseError);
          }
        }
      }
      if (accumulatedText.trim()) {
        const finalHtml = await marked.parse(accumulatedText);
        editor.innerHTML = finalHtml;
        setReportText(finalHtml);
        localStorage.setItem("labReport", accumulatedText);
        setVersionHistory(prev => [
          {
            timestamp: new Date().toLocaleString(),
            summary: actionType === 'regenerate' ? 'Full report regeneration' : 'Academic tone improvement',
            content: finalHtml,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error(`💥 ${actionType} streaming error:`, err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        localStorage.setItem('lastError', 'network');
        router.push("/error?type=network");
      } else if (err instanceof Error && err.name === 'AbortError') {
        editor.innerHTML = `
          <div class="flex items-center justify-center py-12 text-gray-600">
            <div class="text-center">
              <p class="text-lg font-medium">${actionType} was cancelled</p>
              <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Reload Page</button>
            </div>
          </div>
        `;
      } else {
        editor.innerHTML = `
          <div class="flex items-center justify-center py-12 text-red-600">
            <div class="text-center">
              <p class="text-lg font-medium">❌ Error during ${actionType}</p>
              <p class="text-sm mt-2">${err instanceof Error ? err.message : 'Unknown error'}</p>
              <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Reload Page</button>
            </div>
          </div>
        `;
        setTimeout(() => {
          editor.innerHTML = originalContent;
        }, 5000);
      }
    } finally {
      setIsEditStreaming(false);
    }
  };

  const handleRegenerateReport = async () => {
    const storedReport = localStorage.getItem("labReport") || "";
    const storedChart = localStorage.getItem("chartSpec") || "";
    const storedRubric = localStorage.getItem("rubricText") || "";
    const storedManual = localStorage.getItem("manualText") || "";
    if (!storedReport && !storedChart && !storedRubric && !storedManual) {
      alert("Cannot regenerate: No lab data found. Please return to the upload page and upload your files again.");
      router.push('/');
      return;
    }
    const confirmRegenerate = window.confirm(
      "This will completely replace your current report with a new version based on your uploaded data. Continue?"
    );
    if (!confirmRegenerate) return;
    let regenerationPrompt = `Create a comprehensive lab report with all sections: Title, Abstract, Introduction, Methods, Results, Discussion, Conclusion, and References.
Use proper academic style and include detailed analysis.`;
    if (storedManual) {
      regenerationPrompt += `\n\nLab Manual:\n${storedManual}`;
    }
    if (storedChart) {
      try {
        const chartData = JSON.parse(storedChart);
        regenerationPrompt += `\n\nData: ${chartData.graphType} chart with ${chartData.series?.length || 0} data series`;
      } catch {
        console.warn("Could not parse chart data");
      }
    }
    if (storedReport) {
      regenerationPrompt += `\n\nCurrent report (for context):\n${storedReport.substring(0, 1000)}...`;
    }
    regenerationPrompt += `\n\nGenerate a completely new, comprehensive lab report.`;
    await streamReportRegeneration(regenerationPrompt, 'regenerate');
  };

  const handleImproveTone = async () => {
    const currentContent = editorRef.current?.innerText || "";
    if (!currentContent || currentContent.trim().length < 100) {
      alert("Cannot improve tone: Report content is too short or empty.");
      return;
    }
    const confirmImprove = window.confirm(
      "This will rewrite your entire report with improved academic tone and style. The content and structure will remain the same. Continue?"
    );
    if (!confirmImprove) return;
    const toneImprovementPrompt = `You are an academic writing expert. Your task is to improve the academic tone and writing style of the following lab report while preserving ALL content, data, results, and structure.
Improvements to make:
- Enhance academic vocabulary and terminology
- Improve sentence structure and flow
- Ensure consistent formal tone throughout
- Eliminate any casual language or colloquialisms
- Strengthen transitions between sections
- Improve clarity and precision of scientific language
- Maintain all data, numbers, and technical details exactly
- Keep all section headings and overall structure
IMPORTANT: 
- Do NOT change any data, results, or findings
- Do NOT add or remove any sections
- Do NOT alter the core content or conclusions
- ONLY improve the language, tone, and style
Current Report Content:
${currentContent}
Rewrite this report with improved academic tone while maintaining all content and structure exactly.`;
    await streamReportRegeneration(toneImprovementPrompt, 'improve-tone');
  };

  /**
   * Handle ML-powered text humanization for entire report
   */
  const handleHumanizeReport = async () => {
    const editor = editorRef.current;
    if (!editor || !editor.innerText.trim()) {
      alert('No report content to humanize');
      return;
    }
    const confirmHumanize = window.confirm(
      'This will humanize your entire report using ML models to make it sound more natural. This may take 30-60 seconds. Continue?'
    );
    if (!confirmHumanize) return;
    setIsHumanizing(true);
    try {
      const currentContent = editor.innerText;
      const humanizedText = await humanization.humanizeText(currentContent);
      if (humanizedText) {
        setVersionHistory(prev => [
          {
            timestamp: new Date().toLocaleString(),
            summary: 'ML humanization applied',
            content: editor.innerHTML,
          },
          ...prev,
        ]);
        console.log('✅ Report humanization completed');
      }
    } catch (error) {
      console.error('Report humanization failed:', error);
    } finally {
      setIsHumanizing(false);
    }
  };

  /**
   * Handle humanization of selected text
   */
  const handleHumanizeSelection = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) {
      alert('Please select text to humanize');
      return;
    }
    if (selectedText.length < 50) {
      alert('Please select at least 50 characters for effective humanization');
      return;
    }
    setIsHumanizing(true);
    try {
      const humanizedText = await humanization.humanizeText(selectedText);
      if (humanizedText && editorRef.current) {
        const range = selection!.getRangeAt(0);
        range.deleteContents();
        const span = document.createElement('span');
        span.className = 'humanized-text bg-purple-100 border border-purple-300 rounded px-1';
        span.setAttribute('data-original', encodeURIComponent(selectedText));
        span.innerHTML = humanizedText;
        range.insertNode(span);
        window.getSelection()?.removeAllRanges();
        const actionBox = document.createElement('div');
        actionBox.className = 'inline-action-box';
        actionBox.innerHTML = `
          <button class="accept-btn">✅ Accept</button>
          <button class="reject-btn">❌ Reject</button>
        `;
        span.appendChild(actionBox);
        setHasUnsavedChanges(true);
        setVersionHistory(prev => [
          {
            timestamp: new Date().toLocaleString(),
            summary: `Humanized selection: ${selectedText.substring(0, 30)}...`,
            content: editorRef.current!.innerHTML,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error('Selection humanization failed:', error);
    } finally {
      setIsHumanizing(false);
    }
  };


  // ========================================
  // USEEFFECTS (consolidated and well-organized)
  // ========================================

  useEffect(() => {
    console.log("🔥 Loading persisted data from localStorage...");
    localStorage.setItem('lastSuccessfulPage', '/report');
    const storedReport = localStorage.getItem("labReport");
    const storedChart = localStorage.getItem("chartSpec");
    const storedRubric = localStorage.getItem("rubricText");
    const storedManual = localStorage.getItem("manualText");
    const storedAnalysis = localStorage.getItem("lastRubricAnalysis");
    const storedTitle = localStorage.getItem("reportTitle");
    const savedName = localStorage.getItem("studentName");
    console.log("📋 Found data:", {
      report: storedReport ? "✅" : "❌",
      chart: storedChart ? "✅" : "❌",
      rubric: storedRubric ? "✅" : "❌",
      manual: storedManual ? "✅" : "❌",
      analysis: storedAnalysis ? "✅" : "❌",
      title: storedTitle ? "✅" : "❌",
      name: savedName ? "✅" : "❌"
    });
    if (!storedReport || storedReport.trim().length < 50) {
      console.error("No valid report data found in localStorage");
      localStorage.setItem('lastError', 'data');
      router.push("/error?type=data");
      return;
    }
    if (storedRubric) {
      setRubricText(storedRubric);
      setRubricFeedback("📋 Rubric loaded! Click 'Check for Completeness' for detailed analysis.");
      setRubricAnalysis("");
    }
    if (storedManual) setManualText(storedManual);
    if (storedTitle) setTitle(storedTitle);
    if (savedName) setName(savedName);
    if (storedReport && editorRef.current) {
      const parseAndSet = async () => {
        try {
          const parsed = await marked.parse(storedReport);
          if (editorRef.current) {
            editorRef.current.innerHTML = parsed;
            setReportText(parsed);
          }
        } catch {
          router.push("/error");
        }
      };
      parseAndSet();
    }
    if (storedChart) {
      try {
        const parsed: ChartSpec = JSON.parse(storedChart);
        setChartSpec(parsed);
      } catch (e) {
        console.error("Invalid chartSpec in localStorage:", e);
      }
    }
    console.log("✅ Data loading completed");
  }, [router]);

  useEffect(() => {
    if (!chartSpec || !chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    const labels = Array.isArray(chartSpec.labels) && chartSpec.labels.length > 0
      ? chartSpec.labels
      : Array.isArray(chartSpec.series?.[0]?.values)
        ? chartSpec.series[0].values.map((_, i) => i)
        : [];
    if (chartSpec.graphType === "scatter" && !Array.isArray(chartSpec.labels)) {
      console.warn("⚠️ Scatter graph expected labels[], but none were provided.");
    }
    const datasets = chartSpec.series.flatMap((s, i) => {
      const baseColor = `hsl(${i * 90}, 70%, 50%)`;
      const pointData = labels.map((x, idx) => ({ x: Number(x), y: s.values[idx] }));
      const addTrendline = chartSpec.graphType === "scatter" && pointData.length > 1;
      const trendlineDataset = [];
      if (addTrendline) {
        const n = pointData.length;
        const sumX = pointData.reduce((sum, p) => sum + p.x, 0);
        const sumY = pointData.reduce((sum, p) => sum + p.y, 0);
        const sumXY = pointData.reduce((sum, p) => sum + p.x * p.y, 0);
        const sumX2 = pointData.reduce((sum, p) => sum + p.x * p.x, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const xMin = Math.min(...pointData.map(p => p.x));
        const xMax = Math.max(...pointData.map(p => p.x));
        trendlineDataset.push({
          label: `${s.label} (Trendline)`,
          data: [
            { x: xMin, y: slope * xMin + intercept },
            { x: xMax, y: slope * xMax + intercept }
          ],
          borderColor: baseColor,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0,
          type: 'line'
        });
      }
      return [
        {
          type: chartSpec.graphType,
          label: s.label,
          data: chartSpec.graphType === "scatter" ? pointData : s.values,
          borderWidth: 2,
          borderColor: baseColor,
          backgroundColor: `hsla(${i * 90}, 70%, 50%, 0.3)`
        },
        ...trendlineDataset
      ];
    });
    chartInstanceRef.current = new ChartJS(ctx, {
      type: chartSpec.graphType,
      data: { labels, datasets: datasets as ChartDataset[] },
      options: {
        responsive: true,
        scales: {
          x: {
            type: chartSpec.graphType === "scatter" ? "linear" : "category",
            title: { display: true, text: chartSpec.xLabel },
          },
          y: {
            title: { display: true, text: chartSpec.yLabel },
          },
        },
      },
    });
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartSpec]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(".inline-edit-suggestion") as HTMLElement;
      if (!container) return;
      if (target.classList.contains("accept-btn")) {
        const contentSpan = container.querySelector('.streaming-content');
        if (contentSpan) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = contentSpan.innerHTML;
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          container.replaceWith(fragment);
        } else {
          container.classList.remove("inline-edit-suggestion", "bg-yellow-100", "border-yellow-300");
          const box = container.querySelector(".inline-action-box");
          if (box) box.remove();
          container.removeAttribute("data-original");
        }
        setReportText(editor.innerHTML);
        localStorage.setItem("labReport", editor.innerText);
      }
      if (target.classList.contains("reject-btn")) {
        const original = decodeURIComponent(container.dataset.original || "").trim();
        const textNode = document.createTextNode(original);
        container.replaceWith(textNode);
        setReportText(editor.innerHTML);
        localStorage.setItem("labReport", editor.innerText);
      }
    };
    const handleHover = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest(".inline-edit-suggestion") as HTMLElement;
      if (!container || 
          container.querySelector(".inline-action-box") || 
          container.classList.contains("animate-pulse")) return;
      const box = document.createElement("div");
      box.className = "inline-action-box absolute left-0 top-full mt-1 bg-white border border-gray-300 text-sm px-2 py-1 rounded shadow-lg flex gap-2 z-50 whitespace-nowrap";
      box.innerHTML = `
        <button class="text-green-600 accept-btn hover:bg-green-50 px-2 py-1 rounded transition-colors font-medium">✅ Accept</button>
        <button class="text-red-600 reject-btn hover:bg-red-50 px-2 py-1 rounded transition-colors font-medium">❌ Reject</button>
      `;
      container.appendChild(box);
    };
    document.addEventListener("click", handleClick);
    editor.addEventListener("mouseover", handleHover);
    return () => {
      document.removeEventListener("click", handleClick);
      editor.removeEventListener("mouseover", handleHover);
    };
  }, []);

  useEffect(() => {
    if (!isStreaming && rubricFeedback && cleanRubric) {
      localStorage.setItem("lastRubricFeedback", cleanRubric);
    }
  }, [isStreaming, rubricFeedback, cleanRubric]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && currentReportId) {
          saveCurrentReport().catch(err => {
            console.error('Manual save failed:', err);
            alert('Failed to save report. Please try again.');
          });
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, currentReportId, saveCurrentReport]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Enhanced event handlers for humanized text interactions
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(".humanized-text") as HTMLElement;
      if (!container) return;
      if (target.classList.contains("accept-btn")) {
        console.log("✅ Accepting ML humanization");
        const contentSpan = container.querySelector('.humanized-content') || container;
        container.classList.remove("humanized-text", "bg-purple-100", "border-purple-300");
        const box = container.querySelector(".inline-action-box");
        if (box) box.remove();
        container.removeAttribute("data-original");
        setReportText(editor.innerHTML);
        localStorage.setItem("labReport", editor.innerText);
      }
      if (target.classList.contains("reject-btn")) {
        console.log("❌ Rejecting ML humanization");
        const original = decodeURIComponent(container.dataset.original || "").trim();
        const textNode = document.createTextNode(original);
        container.replaceWith(textNode);
        setReportText(editor.innerHTML);
        localStorage.setItem("labReport", editor.innerText);
      }
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  // ========================================
  // RENDER JSX
  // ========================================

  return (
    <Layout 
    currentPage="report" 
    userTier={userTier} 
    usageInfo={usageInfo}
    showHowToEdit={true}
    onReportSelect={handleReportSelect}
    currentReportId={currentReportId}
    reportLoading={reportLoading}
  >
    <div className="flex flex-1">
        <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-cyan-700 mb-2">
                  {title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Name:</span>
                  {isEditingName ? (
                    <input
                      type="text"
                      defaultValue={name}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-cyan-500"
                      onBlur={(e) => handleNameSave(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleNameSave((e.target as HTMLInputElement).value);
                        }
                        if (e.key === 'Escape') {
                          setIsEditingName(false);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={handleNameEdit}
                      className="flex items-center gap-1 text-cyan-600 hover:text-cyan-800 font-medium"
                    >
                      {name}
                      <Edit3 size={12} />
                    </button>
                  )}
                  <span className="mx-2">|</span>
                  <span>Date: {date}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <button
                onClick={handleCopyReport}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  copySuccess
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-[#00e3ae] to-[#0090f1] text-white hover:shadow-lg transform hover:scale-105'
                }`}
              >
                {copySuccess ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Report
                  </>
                )}
              </button>
            </div>
          </div>

          {(isHumanizing || humanization.isProcessing) && (
            <div className="bg-white shadow rounded-xl p-4 mb-4 border-l-4 border-purple-500">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    ML Humanization in Progress
                  </div>
                  <div className="text-xs text-gray-600">
                    {humanization.progress || 'Processing with advanced language models...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentReportId && (
            <div className="bg-white shadow rounded-xl p-4 mb-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      autoSaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
                      autoSaveStatus === 'saved' ? 'bg-green-500' :
                      autoSaveStatus === 'error' ? 'bg-red-500' :
                      hasUnsavedChanges ? 'bg-orange-500' :
                      'bg-gray-300'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {autoSaveStatus === 'saving' ? 'Saving...' :
                       autoSaveStatus === 'saved' ? 'All changes saved' :
                       autoSaveStatus === 'error' ? 'Save failed' :
                       hasUnsavedChanges ? 'Unsaved changes' :
                       'No changes'}
                    </span>
                  </div>
                  {lastSaved && (
                    <span className="text-xs text-gray-500">
                      Last saved: {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <button
                      onClick={saveCurrentReport}
                      disabled={autoSaveStatus === 'saving'}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save Now
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    Report ID: {currentReportId.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              setReportText(e.currentTarget.innerHTML);
              setHasUnsavedChanges(true);
            }}
            onMouseUp={handleHighlightEdit}
            className="prose prose-lg max-w-full p-6 bg-white shadow border border-blue-100 relative"
            style={{
              fontFamily: "Times New Roman, serif",
              fontSize: "12pt",
              lineHeight: 2,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              borderRadius: "16px",
              minHeight: "600px",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          />

          {modalOpen && (
            <PromptPopover
              open={modalOpen}
              anchorEl={popoverAnchor}
              previewText={previewText}
              onClose={() => setModalOpen(false)}
              onSubmit={applyDiff}
            />
          )}

          {isEditStreaming && (
            <div className="fixed top-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg z-50">
              <div className="flex items-center gap-2 text-blue-800">
                <RefreshCw className="animate-spin" size={16} />
                <span className="text-sm font-medium">Claude is rewriting...</span>
              </div>
            </div>
          )}

          {showHumanizationPanel && (
            <div className="mt-6">
              <HumanizationPanel
                originalText={reportText}
                onHumanized={(humanizedText) => {
                  if (editorRef.current) {
                    editorRef.current.innerHTML = humanizedText;
                    setReportText(humanizedText);
                    setHasUnsavedChanges(true);
                  }
                }}
              />
            </div>
          )}

          <div className="mt-8 space-y-6">
            {rubricText && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    📋 Grading Rubric
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      Points-based evaluation
                    </span>
                  </h2>
                  <button
                    onClick={() => setShowOriginalRubric(!showOriginalRubric)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {showOriginalRubric ? "Hide Rubric" : "Show Rubric"}
                    <ChevronDown className={`transform transition-transform ${showOriginalRubric ? 'rotate-180' : ''}`} size={16} />
                  </button>
                </div>
                {showOriginalRubric && (
                  <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-sm max-h-64 overflow-y-auto">
                    <div className="whitespace-pre-line text-gray-800 font-mono text-xs leading-relaxed">
                      {stripMarkdownSync(rubricText)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  🤖 AI Report Analysis
                  {rubricAnalysis && rubricAnalysis.trim() && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      Analysis complete
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleCheckCompleteness}
                  disabled={isStreaming}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isStreaming ? 'animate-spin' : ''} />
                  {isStreaming ? 'Analyzing...' : (rubricAnalysis ? 'Re-analyze' : 'Check Completeness')}
                </button>
              </div>
              <div className="border border-gray-300 bg-white rounded-lg p-4 text-sm max-h-96 overflow-y-auto">
                {rubricAnalysis && rubricAnalysis.trim() ? (
                  <div className="whitespace-pre-wrap space-y-2">
                    {rubricAnalysis.split('\n').map((line, index) => {
                      if (line.includes('✅') || line.includes('Excellent')) {
                        return <div key={index} className="text-green-700 font-medium">{line}</div>;
                      } else if (line.includes('⚠️') || line.includes('Consider')) {
                        return <div key={index} className="text-yellow-700">{line}</div>;
                      } else if (line.includes('❌') || line.includes('Missing')) {
                        return <div key={index} className="text-red-700 font-medium">{line}</div>;
                      } else {
                        return <div key={index} className="text-gray-700">{line}</div>;
                      }
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-center py-8">
                    {isStreaming ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="animate-spin" size={16} />
                        Claude is analyzing your report against the rubric...
                      </div>
                    ) : (
                      rubricText 
                        ? "Click 'Check Completeness' above to get detailed AI analysis of your report based on the rubric." 
                        : "No rubric available. Upload files with grading criteria to see detailed feedback."
                    )}
                  </div>
                )}
              </div>
            </div>
            {rubricAnalysis && !isStreaming && (
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <span>💡 Analysis based on your uploaded rubric and lab manual</span>
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Version History</h2>
            <ul className="space-y-2">
              {versionHistory.map((v, idx) => (
                <li key={idx} className="flex items-center justify-between border p-2 rounded-md">
                  <div>
                    <div className="font-semibold text-sm">{v.timestamp}</div>
                    <div className="text-xs text-gray-600">{v.summary}</div>
                  </div>
                  <button 
                    onClick={() => handleRestore(v.content)} 
                    className="text-blue-500 hover:underline"
                  >
                    ↺ Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-4">Data Visualization</h2>
            {chartSpec ? (
              <canvas ref={chartRef} className="w-full max-w-3xl" height={300} />
            ) : (
              <div className="flex items-center justify-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Raw Data Provided</h3>
                  <p className="text-gray-500 text-sm max-w-md">
                    Upload an Excel file (.xlsx) with your experimental data to generate charts and visualizations for your lab report.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="w-72 p-4 border-l bg-white space-y-4 shadow-sm">
          <div className="bg-gradient-to-br from-[#00e3ae] to-[#0090f1] text-white rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Wand2 size={16} /> AI Writing Assistant
            </h3>
            <p className="text-sm">Highlight text and get instant AI suggestions for improvement.</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Bot size={16} /> ML Humanization
            </h3>
            <p className="text-sm text-purple-100">
              Make your text sound naturally human with advanced ML models.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-cyan-600"/> Quick Actions
            </h4>
            <div className="space-y-2">
              <button 
                onClick={handleRegenerateReport}
                disabled={isEditStreaming || isHumanizing}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming || isHumanizing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw size={16} className={`text-cyan-600 ${isEditStreaming ? 'animate-spin' : ''}`}/>
                {isEditStreaming ? 'Regenerating...' : 'Regenerate Entire Report'}
              </button>
              
              <button 
                onClick={handleHumanizeReport}
                disabled={isEditStreaming || isHumanizing}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming || isHumanizing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Bot size={16} className="text-purple-600"/>
                {isHumanizing ? 'Humanizing...' : 'Humanize Entire Report'}
              </button>

              <button 
                onClick={handleHumanizeSelection}
                disabled={isEditStreaming || isHumanizing}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming || isHumanizing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Sparkles size={16} className="text-purple-600"/>
                Humanize Selection
              </button>

              <button 
                onClick={() => setShowHumanizationPanel(!showHumanizationPanel)}
                className="flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Wand2 size={16} className="text-purple-600"/>
                {showHumanizationPanel ? 'Hide ML Panel' : 'Show ML Panel'}
              </button>

              <button 
                onClick={handleImproveTone}
                disabled={isEditStreaming || isHumanizing}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming || isHumanizing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <PenLine size={16} className="text-green-600"/>
                {isEditStreaming ? 'Improving...' : 'Improve Academic Tone'}
              </button>

              <button 
                onClick={handleCheckCompleteness} 
                disabled={isEditStreaming || isHumanizing}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming || isHumanizing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ListChecks size={16} className="text-blue-600"/>
                Check for Completeness
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ArrowDownToLine size={16} className="text-cyan-600"/> Export Report
            </h4>
            <div className="space-y-2">
              <button 
                onClick={() => handleExport("PDF")} 
                className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"
              >
                <FileIcon size={16} className="text-blue-600"/> PDF
              </button>
              <button 
                onClick={() => handleExport("DOCX")} 
                className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"
              >
                <BookText size={16} className="text-green-600"/> Word
              </button>
              <button 
                onClick={() => handleExport("LaTeX")} 
                className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"
              >
                <FileCode2 size={16} className="text-purple-600"/> LaTeX
              </button>
              <button 
                onClick={() => handleExport("TXT")} 
                className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"
              >
                <FileType2 size={16} className="text-orange-600"/> Text
              </button>
            </div>
          </div>

          {humanization.isProcessing && (
            <div className="bg-white border border-purple-200 rounded-xl p-4 shadow">
              <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <Bot size={16} /> ML Processing
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-purple-600 animate-spin" />
                  <span className="text-sm text-purple-700">{humanization.progress}</span>
                </div>
                <div className="w-full bg-purple-100 h-2 rounded-full">
                  <div className="h-2 bg-purple-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Target size={16} /> Progress
            </h4>
            <div className="text-sm text-gray-700 mb-2">
              Report Completion 
              <span className="float-right font-semibold text-emerald-600">85%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="h-2 bg-gray-800 w-[85%] rounded-full"></div>
            </div>
            <ul className="text-sm text-gray-600 mt-3 space-y-1">
              <li>
                <CircleCheck className="inline mr-1 text-emerald-500" size={14}/>
                Introduction Complete
              </li>
              <li>
                <CircleCheck className="inline mr-1 text-emerald-500" size={14}/>
                Methodology Complete
              </li>
              <li>
                <CircleCheck className="inline mr-1 text-emerald-500" size={14}/>
                Results In Progress
              </li>
              <li>
                <CircleCheck className="inline mr-1 text-gray-300" size={14}/>
                Conclusion Pending
              </li>
            </ul>
          </div>
        </aside>
        </div>
  </Layout>
  );
}