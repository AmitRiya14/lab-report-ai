/**
 * Report Page Component
 * 
 * Main lab report editing interface with AI-powered features including:
 * - ContentEditable report editor with real-time text editing
 * - AI-powered text suggestions with streaming responses
 * - Chart visualization from Excel data
 * - Rubric-based feedback system
 * - Version history and restore functionality
 * - Export capabilities for multiple formats
 * 
 * Key Features:
 * - Inline text editing with Claude AI integration
 * - Streaming text generation with real-time display
 * - Accept/reject suggestions with visual feedback
 * - Chart.js integration for data visualization
 * - localStorage persistence for report data
 */

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { marked } from "marked";
import { useRouter } from "next/navigation"; // ✅ ADD THIS IMPORT
import {
  Upload,
  FileText,
  HelpCircle,
  Settings,
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
  MousePointerClick,
  Crown,
  CircleCheck,
  ChevronDown,
  Target
} from "lucide-react";
import PromptPopover from "@/components/PromptModal";

// Register Chart.js components
Chart.register(...registerables);

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
// UTILITY FUNCTIONS
// ========================================

/**
 * Strip markdown formatting from text for clean display
 * Used for real-time rubric feedback display without markdown artifacts
 * 
 * @param text - Text containing markdown formatting
 * @returns Clean text without markdown formatting
 */
function stripMarkdownSync(text: string): string {
  return text
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove bold and italic formatting
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Convert list markers to simple bullets
    .replace(/^[\s]*[-*+]\s+(.+)$/gm, '• $1')
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function ReportPage() {
  // ========================================
  // STATE DECLARATIONS (organized by purpose)
  // ========================================
  
  // Basic report metadata
  const [title, setTitle] = useState("Lab Report: Quantum Entanglement Experiment");
  const [name, setName] = useState("Student Name");
  const [date, setDate] = useState(new Date().toLocaleDateString());
  
  // Report content and data
  const [reportText, setReportText] = useState("");
  const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null);
  
  // Rubric and feedback system
  const [rubricFeedback, setRubricFeedback] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [manualText, setManualText] = useState("");
  const [cleanRubric, setCleanRubric] = useState("");
  const [rubricAnalysis, setRubricAnalysis] = useState(""); // ✅ NEW: Separate state for Claude analysis
  const [showOriginalRubric, setShowOriginalRubric] = useState(true); // ✅ NEW: Toggle for original rubric

  
  // Modal and text selection state
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [previewText, setPreviewText] = useState("");
  
  // Streaming and loading states
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditStreaming, setIsEditStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingContainer, setStreamingContainer] = useState<HTMLElement | null>(null);
  
  // Version history
  const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([
    {
      timestamp: new Date().toLocaleString(),
      summary: "Original generation",
      content: typeof window !== 'undefined' ? localStorage.getItem("labReport") || "" : "",
    },
  ]);

  const router = useRouter(); // ✅ ADD THIS

  // ========================================
  // REFS (for DOM manipulation and chart management)
  // ========================================
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null); // ✅ Fixed: Use ref instead of module variable

  // ========================================
  // CORE FUNCTIONALITY HANDLERS
  // ========================================

  /**
   * Handle text selection and open editing modal
   * Triggered when user highlights text in the contentEditable div
   * Stores the selected range for later manipulation
   */
  const handleHighlightEdit = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();

    if (text && rect && range) {
      setSelectedText(text);
      setPopoverAnchor(rect);
      savedRangeRef.current = range.cloneRange(); // Store actual DOM range
      
      // Create preview text (truncate if too long for UI)
      const words = text.split(/\s+/);
      setPreviewText(
        words.length > 10
          ? `${words.slice(0, 5).join(" ")} ... ${words.slice(-5).join(" ")}`
          : text
      );

      setModalOpen(true);
    }
  };

  /**
   * Apply AI-powered text edits with streaming display
   * 
   * Complex flow:
   * 1. Validates range and editor references
   * 2. Cleans up any existing edit suggestions
   * 3. Creates streaming container in DOM
   * 4. Makes API call to /api/edit-highlight
   * 5. Processes streaming response in real-time
   * 6. Adds accept/reject buttons when complete
   * 7. Updates version history
   * 
   * @param prompt - User's editing instruction
   */
  const applyDiff = async (prompt: string) => {
    setModalOpen(false);

    const range = savedRangeRef.current;
    const editor = editorRef.current;

    if (!range || !editor) {
      console.warn("Missing saved range or editor reference");
      return;
    }

    // Step 1: Clean up any existing edit suggestions to prevent conflicts
    const existingBoxes = editor.querySelectorAll(".inline-action-box");
    existingBoxes.forEach(box => box.remove());

    const existingContainers = editor.querySelectorAll(".inline-edit-suggestion");
    existingContainers.forEach(container => {
      container.removeAttribute("data-processing");
    });

    const originalText = range.toString();
    console.log("🚀 Starting edit streaming for:", originalText.substring(0, 50) + "...");

    // Step 2: Create streaming container for live text updates
    const streamingSpan = document.createElement("span");
    streamingSpan.className = "inline-edit-suggestion animate-pulse";
    streamingSpan.setAttribute("data-original", encodeURIComponent(originalText));
    streamingSpan.setAttribute("data-processing", "true"); // Prevent duplicate processing
    streamingSpan.innerHTML = '<span class="streaming-content text-gray-500 italic">Claude is rewriting...</span>';

    // Step 3: Replace selected text with streaming container
    try {
      const selectedFragment = range.extractContents();
      range.insertNode(streamingSpan);
      window.getSelection()?.removeAllRanges(); // Clear selection
    } catch (error) {
      console.error("Range manipulation error:", error);
      return;
    }

    // Step 4: Set streaming state
    setStreamingContainer(streamingSpan);
    setIsEditStreaming(true);
    setStreamingText("");

    try {
      // Step 5: Make API call to edit-highlight endpoint
      const response = await fetch("/api/edit-highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          original: originalText,
          fullReport: editor.innerText, // Full context for AI
        }),
      });

      if (!response.ok) {
        console.error(`Edit API error: ${response.status}`);
        
        // ✅ UPDATED: Specific error handling by status code
        if (response.status >= 500) {
          localStorage.setItem('lastError', 'server');
          router.push("/error?type=server");
          return;
        } else if (response.status === 429) {
          // Rate limit - show in streaming container
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


      // Step 6: Process streaming response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      const contentSpan = streamingSpan.querySelector('.streaming-content');
      if (!contentSpan) {
        throw new Error("Content span not found in streaming container");
      }

      // Step 7: Stream processing loop
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("✅ Streaming completed successfully");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(dataStr);
            
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              const newText = parsed.delta.text;
              accumulatedText += newText;
              
              // Step 8: Format text with basic markdown support
              let displayText = accumulatedText
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>');
              
              // Handle paragraph breaks properly
              if (displayText.includes('\n\n')) {
                const paragraphs = displayText.split('\n\n').filter(p => p.trim());
                displayText = paragraphs.map(p => 
                  p.trim() ? `<p class="inline">${p.replace(/\n/g, '<br>')}</p>` : ''
                ).join('');
              } else {
                displayText = displayText.replace(/\n/g, '<br>');
              }
              
              // Step 9: Update display in real-time
              contentSpan.innerHTML = displayText || accumulatedText;
              contentSpan.className = 'streaming-content text-gray-800';
              contentSpan.offsetHeight; // Force visual update
              setStreamingText(accumulatedText);
              
              // Controlled streaming speed for better UX
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          } catch (parseError) {
            console.warn("⚠️ JSON parse error, skipping line:", parseError);
          }
        }
      }

      // Step 10: Finalize streaming display
      if (streamingSpan && accumulatedText.trim()) {
        console.log("✅ Finalizing stream with accept/reject buttons");
        
        // Remove pulsing animation
        streamingSpan.classList.remove("animate-pulse");
        streamingSpan.removeAttribute("data-processing");
        
        // Add accept/reject buttons after brief delay for smooth UX
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

        // Step 11: Update version history
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
      
      // ✅ UPDATED: Better error type detection
      if (err instanceof TypeError && err.message.includes('fetch')) {
        localStorage.setItem('lastError', 'network');
        router.push("/error?type=network");
      } else if (err.name === 'AbortError') {
        // Request cancelled - show in streaming container
        const contentSpan = streamingSpan.querySelector('.streaming-content');
        if (contentSpan) {
          contentSpan.innerHTML = '<span class="text-gray-600 font-medium">Edit was cancelled.</span>';
        }
      } else {
        // Show error in streaming container
        const contentSpan = streamingSpan.querySelector('.streaming-content');
        if (contentSpan) {
          contentSpan.innerHTML = `<span class="text-red-600 font-medium">❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}</span>`;
        }
      }

      streamingSpan.classList.remove("animate-pulse");
      streamingSpan.removeAttribute("data-processing");
    } finally {
      // Step 12: Clean up streaming state
      setIsEditStreaming(false);
      setStreamingContainer(null);
      savedRangeRef.current = null;
    }
  };

  /**
   * Analyze report completeness using rubric
   * Streams feedback from Claude API for real-time display
   * Uses rubric text and manual text for context-aware analysis
   */
  const handleCheckCompleteness = async () => {
  console.log("🚀 Starting rubric analysis...");
  setRubricAnalysis(""); // ✅ Clear analysis, not the rubric feedback
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

    // Process streaming rubric response
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
            
            // Strip markdown for clean real-time display
            const cleanText = stripMarkdownSync(accumulatedText);
            accumulatedPlainText = cleanText;
            setRubricAnalysis(cleanText); // ✅ Update analysis, not rubricFeedback
          }
        } catch (parseError) {
          console.warn("⚠️ JSON parse error in rubric response:", parseError);
        }
      }
    }

    // Store final cleaned result
    if (accumulatedPlainText) {
      localStorage.setItem("lastRubricAnalysis", accumulatedPlainText);
    }

  } catch (error) {
    console.error("💥 Rubric analysis error:", error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      localStorage.setItem('lastError', 'network');
      router.push("/error?type=network");
    } else if (error.name === 'AbortError') {
      setRubricAnalysis("Analysis was cancelled.");
    } else {
      setRubricAnalysis(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  } finally {
    setIsStreaming(false);
  }
};

  /**
   * Restore previous version from history
   * Converts markdown to HTML if needed and updates editor
   * 
   * @param content - Version content to restore
   */
  const handleRestore = async (content: string) => {
    if (!content || content.trim().length < 10) {
      console.warn("Empty restore content – skipping restoration");
      return;
    }

    // Convert markdown to HTML if needed
    const html = content.includes("<p>") ? content : await marked.parse(content);

    setReportText(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };

  /**
   * Export report in various formats
   * Currently shows placeholder - would integrate with export libraries
   * 
   * @param format - Export format (PDF, DOCX, LaTeX, TXT)
   */
  const handleExport = (format: string) => {
    // TODO: Implement actual export functionality
    alert(`Exporting as ${format} not implemented yet.`);
  };


  /**
 * Generic streaming function for full report regeneration
 * Handles streaming response and updates the entire editor content
 * 
 * @param prompt - The instruction prompt for Claude
 * @param actionType - Type of action for logging and UI feedback
 */
const streamReportRegeneration = async (prompt: string, actionType: 'regenerate' | 'improve-tone') => {
  const editor = editorRef.current;
  if (!editor) {
    console.error("Editor reference not found");
    return;
  }

  console.log(`🚀 Starting ${actionType} with full report streaming...`);
  
  // Set loading state
  setIsEditStreaming(true);
  
  // Show loading message in editor
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
        original: originalContent, // Send full content as context
        fullReport: editor.innerText,
      }),
    });

    if (!response.ok) {
      console.error(`${actionType} API error: ${response.status}`);
      
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

    // Process streaming response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let buffer = "";

    // Clear editor for streaming content
    editor.innerHTML = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`✅ ${actionType} streaming completed successfully`);
        break;
      }

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
            
            // Convert markdown to HTML for display
            const htmlContent = await marked.parse(accumulatedText);
            editor.innerHTML = htmlContent;
            
            // Auto-scroll to bottom to show new content
            editor.scrollTop = editor.scrollHeight;
            
            // Controlled streaming speed
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        } catch (parseError) {
          console.warn("⚠️ JSON parse error, skipping line:", parseError);
        }
      }
    }

    // Finalize the regeneration
    if (accumulatedText.trim()) {
      console.log(`✅ Finalizing ${actionType}`);
      
      // Convert final content to HTML
      const finalHtml = await marked.parse(accumulatedText);
      editor.innerHTML = finalHtml;
      setReportText(finalHtml);
      
      // Save to localStorage
      localStorage.setItem("labReport", accumulatedText);
      
      // Update version history
      setVersionHistory(prev => [
        {
          timestamp: new Date().toLocaleString(),
          summary: actionType === 'regenerate' ? 'Full report regeneration' : 'Academic tone improvement',
          content: finalHtml,
        },
        ...prev,
      ]);
      
      console.log(`✅ ${actionType} completed and saved`);
    }

  } catch (err) {
    console.error(`💥 ${actionType} streaming error:`, err);
    
    if (err instanceof TypeError && err.message.includes('fetch')) {
      localStorage.setItem('lastError', 'network');
      router.push("/error?type=network");
    } else if (err.name === 'AbortError') {
      editor.innerHTML = `
        <div class="flex items-center justify-center py-12 text-gray-600">
          <div class="text-center">
            <p class="text-lg font-medium">${actionType} was cancelled</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Reload Page</button>
          </div>
        </div>
      `;
    } else {
      // Show error and restore original content
      editor.innerHTML = `
        <div class="flex items-center justify-center py-12 text-red-600">
          <div class="text-center">
            <p class="text-lg font-medium">❌ Error during ${actionType}</p>
            <p class="text-sm mt-2">${err instanceof Error ? err.message : 'Unknown error'}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Reload Page</button>
          </div>
        </div>
      `;
      
      // Restore original content after a delay
      setTimeout(() => {
        editor.innerHTML = originalContent;
      }, 5000);
    }
  } finally {
    setIsEditStreaming(false);
  }
};

/**
 * Handle full report regeneration
 * Uses the existing lab manual and data to create a completely new report
 */
// Replace your existing handleRegenerateReport function with this:
const handleRegenerateReport = async () => {
  // Check what data we actually have available
  const storedReport = localStorage.getItem("labReport") || "";
  const storedChart = localStorage.getItem("chartSpec") || "";
  const storedRubric = localStorage.getItem("rubricText") || "";
  const storedManual = localStorage.getItem("manualText") || "";
  
  // If we have ANY data, we can regenerate
  if (!storedReport && !storedChart && !storedRubric && !storedManual) {
    alert("Cannot regenerate: No lab data found. Please return to the upload page and upload your files again.");
    router.push('/');
    return;
  }

  const confirmRegenerate = window.confirm(
    "This will completely replace your current report with a new version based on your uploaded data. Continue?"
  );
  
  if (!confirmRegenerate) return;

  // Build prompt with available data
  let regenerationPrompt = `Create a comprehensive lab report with all sections: Title, Abstract, Introduction, Methods, Results, Discussion, Conclusion, and References.

Use proper academic style and include detailed analysis.`;

  if (storedManual) {
    regenerationPrompt += `\n\nLab Manual:\n${storedManual}`;
  }
  
  if (storedChart) {
    try {
      const chartData = JSON.parse(storedChart);
      regenerationPrompt += `\n\nData: ${chartData.graphType} chart with ${chartData.series?.length || 0} data series`;
    } catch (e) {
      console.warn("Could not parse chart data");
    }
  }
  
  if (storedReport) {
    regenerationPrompt += `\n\nCurrent report (for context):\n${storedReport.substring(0, 1000)}...`;
  }

  regenerationPrompt += `\n\nGenerate a completely new, comprehensive lab report.`;

  await streamReportRegeneration(regenerationPrompt, 'regenerate');
};

/**
 * Handle academic tone improvement
 * Improves the writing style while maintaining all content and structure
 */
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

  // ========================================
  // USEEFFECTS (consolidated and well-organized)
  // ========================================

  /**
   * INITIALIZATION EFFECT
   * ✅ Fixed: Combined multiple localStorage reads into single effect
   * Loads all persisted data on component mount
   */
useEffect(() => {
  console.log("🔄 Loading persisted data from localStorage...");

  localStorage.setItem('lastSuccessfulPage', '/report');

  const storedReport = localStorage.getItem("labReport");
  const storedChart = localStorage.getItem("chartSpec");
  const storedRubric = localStorage.getItem("rubricText");
  const storedManual = localStorage.getItem("manualText");
  const storedAnalysis = localStorage.getItem("lastRubricAnalysis"); // ✅ NEW

  console.log("📋 Found data:", {
    report: storedReport ? "✅" : "❌",
    chart: storedChart ? "✅" : "❌",
    rubric: storedRubric ? "✅" : "❌",
    manual: storedManual ? "✅" : "❌",
    analysis: storedAnalysis ? "✅" : "❌" // ✅ NEW
  });

  if (!storedReport || storedReport.trim().length < 50) {
    console.error("No valid report data found in localStorage");
    localStorage.setItem('lastError', 'data');
    router.push("/error?type=data");
    return;
  }

  // Set all data
  if (storedRubric) {
    setRubricText(storedRubric);
    // ✅ Set initial rubric feedback to show rubric is available
    setRubricFeedback("📋 Rubric loaded! Click 'Check for Completeness' for detailed analysis.");
  }
  if (storedManual) setManualText(storedManual);
  if (storedAnalysis) {
    setRubricAnalysis(storedAnalysis); // ✅ Load previous analysis
  }

    // Parse and set report content
    if (storedReport && editorRef.current) {
      const parseAndSet = async () => {
        try {
          const parsed = await marked.parse(storedReport);
          if (editorRef.current) {
            editorRef.current.innerHTML = parsed;
            setReportText(parsed);
          }
        } catch (error) {
          // ✅ ADD THIS: Redirect on parse error
          router.push("/error");
        }
      };
      parseAndSet();
    }

    // Parse chart specification
    if (storedChart) {
      try {
        const parsed: ChartSpec = JSON.parse(storedChart);
        setChartSpec(parsed);
      } catch (e) {
        console.error("Invalid chartSpec in localStorage:", e);
      }
    }

    console.log("✅ Data loading completed");
  }, [router]); // ✅ ADD router to dependency array

  /**
   * CHART MANAGEMENT EFFECT
   * ✅ Fixed: Use ref instead of module variable, proper cleanup
   * Handles chart creation, updates, and cleanup
   */
  useEffect(() => {
    if (!chartSpec || !chartRef.current) return;

    console.log("📊 Creating/updating chart visualization...");
    
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart to prevent memory leaks
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Generate chart labels
    const labels = Array.isArray(chartSpec.labels) && chartSpec.labels.length > 0
      ? chartSpec.labels
      : Array.isArray(chartSpec.series?.[0]?.values)
        ? chartSpec.series[0].values.map((_, i) => i)
        : [];

    // Warn about scatter plot configuration issues
    if (chartSpec.graphType === "scatter" && !Array.isArray(chartSpec.labels)) {
      console.warn("⚠️ Scatter graph expected labels[], but none were provided.");
    }

    // Generate datasets with optional trendlines
    const datasets = chartSpec.series.flatMap((s, i) => {
      const baseColor = `hsl(${i * 90}, 70%, 50%)`;
      const pointData = labels.map((x, idx) => ({ x: Number(x), y: s.values[idx] }));

      const addTrendline = chartSpec.graphType === "scatter" && pointData.length > 1;
      let trendlineDataset = [];

      // Calculate and add trendline for scatter plots
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

    // Create new chart instance
    chartInstanceRef.current = new Chart(ctx, {
      type: chartSpec.graphType,
      data: { labels, datasets: datasets as any },
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

    console.log("✅ Chart created successfully");

    // Cleanup function to prevent memory leaks
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartSpec]); // Re-run when chartSpec changes

  /**
   * EVENT HANDLERS EFFECT
   * ✅ Fixed: Single effect with proper cleanup, no duplicates
   * Sets up DOM event listeners for edit suggestion interactions
   */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    console.log("🖱️ Setting up edit suggestion event handlers...");

    /**
     * Handle clicks on accept/reject buttons in edit suggestions
     */
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(".inline-edit-suggestion") as HTMLElement;
      if (!container) return;

      // Handle Accept button click
      if (target.classList.contains("accept-btn")) {
        console.log("✅ Accepting edit suggestion");
        
        const contentSpan = container.querySelector('.streaming-content');
        if (contentSpan) {
          // Extract content and replace container with actual content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = contentSpan.innerHTML;
          
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          container.replaceWith(fragment);
        } else {
          // Fallback: just remove suggestion styling
          container.classList.remove("inline-edit-suggestion", "bg-yellow-100", "border-yellow-300");
          const box = container.querySelector(".inline-action-box");
          if (box) box.remove();
          container.removeAttribute("data-original");
        }
        
        // Update report state and persist to localStorage
        setReportText(editor.innerHTML);
        localStorage.setItem("labReport", editor.innerText);
      }

      // Handle Reject button click
      if (target.classList.contains("reject-btn")) {
        console.log("❌ Rejecting edit suggestion");
        
        const original = decodeURIComponent(container.dataset.original || "").trim();
        
        // Replace suggestion with original text
        const textNode = document.createTextNode(original);
        container.replaceWith(textNode);
        
        // Update report state and persist to localStorage
        setReportText(editor.innerHTML);
        localStorage.setItem("labReport", editor.innerText);
      }
    };

    /**
     * Handle hover to show accept/reject buttons
     */
    const handleHover = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest(".inline-edit-suggestion") as HTMLElement;
      if (!container || 
          container.querySelector(".inline-action-box") || 
          container.classList.contains("animate-pulse")) return;

      // Create and append action buttons
      const box = document.createElement("div");
      box.className = "inline-action-box absolute left-0 top-full mt-1 bg-white border border-gray-300 text-sm px-2 py-1 rounded shadow-lg flex gap-2 z-50 whitespace-nowrap";
      box.innerHTML = `
        <button class="text-green-600 accept-btn hover:bg-green-50 px-2 py-1 rounded transition-colors font-medium">✅ Accept</button>
        <button class="text-red-600 reject-btn hover:bg-red-50 px-2 py-1 rounded transition-colors font-medium">❌ Reject</button>
      `;
      container.appendChild(box);
    };

    // Add event listeners
    document.addEventListener("click", handleClick);
    editor.addEventListener("mouseover", handleHover);

    // Cleanup function to prevent memory leaks
    return () => {
      document.removeEventListener("click", handleClick);
      editor.removeEventListener("mouseover", handleHover);
    };
  }, []); // Empty dependency array - set up once

  /**
   * RUBRIC PERSISTENCE EFFECT
   * Save rubric feedback when analysis completes
   */
  useEffect(() => {
    if (!isStreaming && rubricFeedback && cleanRubric) {
      localStorage.setItem("lastRubricFeedback", cleanRubric);
    }
  }, [isStreaming, rubricFeedback, cleanRubric]);

  // ========================================
  // RENDER JSX
  // ========================================

  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b">
        <h1 className="text-xl font-bold text-cyan-600 flex items-center gap-2">
          <Wand2 className="text-cyan-500" /> StudyLab AI
        </h1>
        <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-300">
          <Crown size={14} className="inline mr-1 text-emerald-500" /> Pro Student
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r p-4 space-y-4 shadow-sm">
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 text-gray-600 hover:text-cyan-600">
              <Upload size={16} /> Upload Files
            </a>
            <a href="#" className="flex items-center gap-3 text-white bg-gradient-to-r from-[#00e3ae] to-[#0090f1] rounded-full px-4 py-2 font-semibold">
              <FileText size={16} /> Report Editing
            </a>
            <a href="#" className="flex items-center gap-3 text-gray-600 hover:text-cyan-600">
              <Settings size={16} /> Settings
            </a>
            <a href="#" className="flex items-center gap-3 text-gray-600 hover:text-cyan-600">
              <HelpCircle size={16} /> Help
            </a>
          </nav>

          {/* Profile upgrade section */}
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

          {/* How to edit instructions */}
          <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
              <MousePointerClick size={16} /> How to Edit
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Highlight any text in the report</li>
              <li>Type your modification prompt</li>
              <li>AI will update that section</li>
            </ul>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
          {/* Report Header Section */}
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-cyan-700">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">Name: {name} | Date: {date}</p>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => handleExport("PDF")}
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                <ArrowDownToLine size={16} /> Export
              </button>
              <button className="flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600">
                ▶ Preview
              </button>
            </div>
          </div>

          {/* Main Editor - ContentEditable Report Area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setReportText(e.currentTarget.innerHTML)}
            onMouseUp={handleHighlightEdit}
            className="prose prose-lg max-w-full p-6 bg-white shadow border border-blue-100"
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

          {/* Text Editing Modal */}
          {modalOpen && (
            <PromptPopover
              open={modalOpen}
              anchorEl={popoverAnchor}
              previewText={previewText}
              onClose={() => setModalOpen(false)}
              onSubmit={applyDiff}
            />
          )}

          {/* Streaming Indicator */}
          {isEditStreaming && (
            <div className="fixed top-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg z-50">
              <div className="flex items-center gap-2 text-blue-800">
                <RefreshCw className="animate-spin" size={16} />
                <span className="text-sm font-medium">Claude is rewriting...</span>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-6">
  {/* Original Rubric Section */}
  {rubricText && (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          📋 Grading Rubric
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            Generated from upload
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
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-sm max-h-64 overflow-y-auto">
          <div className="whitespace-pre-wrap font-mono text-blue-900">
            {stripMarkdownSync(rubricText)}
          </div>
        </div>
      )}
    </div>
  )}

  {/* Claude Analysis Section */}
  <div>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        🤖 AI Report Analysis
        {rubricAnalysis && (
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            Analysis complete
          </span>
        )}
      </h2>
      
      {!isStreaming && (
        <button
          onClick={handleCheckCompleteness}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1"
        >
          <RefreshCw size={14} />
          {rubricAnalysis ? 'Re-analyze' : 'Check Completeness'}
        </button>
      )}
    </div>
    
    {isStreaming && (
      <div className="flex items-center gap-2 text-blue-600 mb-3">
        <RefreshCw className="animate-spin" size={16} />
        Claude is analyzing your report against the rubric...
      </div>
    )}
    
    <div className="border border-gray-300 bg-white rounded-lg p-4 text-sm max-h-96 overflow-y-auto">
      {rubricAnalysis ? (
        <div className="whitespace-pre-wrap space-y-2">
          {rubricAnalysis.split('\n').map((line, index) => {
            // Add color coding for different feedback types
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
          {rubricText 
            ? "Click 'Check Completeness' above to get detailed AI analysis of your report based on the rubric." 
            : "No rubric available. Upload files with grading criteria to see detailed feedback."
          }
        </div>
      )}
    </div>
    
    {rubricAnalysis && !isStreaming && (
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
        <span>💡 Analysis based on your uploaded rubric and lab manual</span>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    )}
  </div>
</div>

          {/* Version History Section */}
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

          {/* Chart Visualization Section */}
          {chartSpec && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold mb-2">Graph</h2>
              <canvas ref={chartRef} className="w-full max-w-3xl" height={300} />
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-72 p-4 border-l bg-white space-y-4 shadow-sm">
          {/* AI Writing Assistant Card */}
          <div className="bg-gradient-to-br from-[#00e3ae] to-[#0090f1] text-white rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Wand2 size={16} /> AI Writing Assistant
            </h3>
            <p className="text-sm">Highlight text and get instant AI suggestions for improvement.</p>
          </div>

          {/* Quick Actions Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-cyan-600"/> Quick Actions
            </h4>
            <div className="space-y-2">
              <button 
                onClick={handleRegenerateReport}
                disabled={isEditStreaming}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw size={16} className={`text-cyan-600 ${isEditStreaming ? 'animate-spin' : ''}`}/>
                {isEditStreaming ? 'Regenerating...' : 'Regenerate Entire Report'}
              </button>
              <button 
                onClick={handleImproveTone}
                disabled={isEditStreaming}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <PenLine size={16} className="text-green-600"/>
                {isEditStreaming ? 'Improving...' : 'Improve Academic Tone'}
              </button>
              <button 
                onClick={handleCheckCompleteness} 
                disabled={isEditStreaming}
                className={`flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors ${
                  isEditStreaming ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ListChecks size={16} className="text-blue-600"/>
                Check for Completeness
              </button>
            </div>
          </div>


          {/* Export Options Section */}
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

          {/* Progress Tracking Section */}
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
    </div>
  );
}