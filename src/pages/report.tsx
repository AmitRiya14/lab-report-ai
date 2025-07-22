// ✅ FULLY INTEGRATED: Figma UI + Original Functionality
// This version includes: header, nav styling, upgrade box, how-to box, AI Assistant, rubric, version history, chart rendering, localStorage, and export buttons

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { marked } from "marked";
import { flushSync } from 'react-dom';
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
  Target
} from "lucide-react";
import PromptPopover from "@/components/PromptModal";


Chart.register(...registerables);

let currentChart: Chart | null = null;

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

export async function streamSSE(response: Response, onMessage: (text: string) => void) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  if (!reader) {
    console.error("❌ No readable stream body found.");
    return;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Ignore empty lines or non-data events
      if (!trimmed.startsWith("data:")) continue;

      const jsonStr = trimmed.replace(/^data:\s*/, "");

      try {
        const parsed = JSON.parse(jsonStr);

        if (parsed?.type === "content_block_delta" && parsed?.delta?.text) {
          onMessage(parsed.delta.text); // Append live text
        }
      } catch (err) {
        console.warn("⚠️ Skipping invalid JSON line:", trimmed);
      }
    }
  }
}



export default function ReportPage() {
  const [title, setTitle] = useState("Lab Report: Quantum Entanglement Experiment");
  const [name, setName] = useState("Student Name");
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportText, setReportText] = useState("");
  const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null);
  const initialContent = typeof window !== 'undefined' ? localStorage.getItem("labReport") || "" : "";
  const [rubricFeedback, setRubricFeedback] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [manualText, setManualText] = useState("");
  const [cleanRubric, setCleanRubric] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const rubricRef = useRef<HTMLDivElement>(null);
  const [isEditStreaming, setIsEditStreaming] = useState(false);
const [streamingText, setStreamingText] = useState("");
const [streamingContainer, setStreamingContainer] = useState<HTMLElement | null>(null);


// Debug version of handleCheckCompleteness - replace your current function
const handleCheckCompleteness = async () => {
  console.log("🚀 Starting streaming request...");
  setRubricFeedback(""); 
  setCleanRubric("");
  setIsStreaming(true);

  try {
    const response = await fetch("/api/rubric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportText, rubricText, manualText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let accumulatedPlainText = ""; // For clean display

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
            
            // Strip markdown from the accumulated text in real-time
            const cleanText = stripMarkdownSync(accumulatedText);
            accumulatedPlainText = cleanText;
            
            // Display the clean text
            setRubricFeedback(cleanText);
          }
        } catch (parseError) {
          console.warn("⚠️ JSON parse error:", parseError);
        }
      }
    }

    // Final cleanup
    if (accumulatedPlainText) {
      setCleanRubric(accumulatedPlainText);
      localStorage.setItem("lastRubricFeedback", accumulatedPlainText);
    }

  } catch (error) {
    console.error("💥 Streaming error:", error);
    setRubricFeedback(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsStreaming(false);
  }
};

// Synchronous markdown stripping function (faster for real-time)
function stripMarkdownSync(text: string): string {
  return text
    // Remove headers
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+(.+)$/gm, '• $1')
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

  const [versionHistory, setVersionHistory] = useState([
    {
      timestamp: new Date().toLocaleString(),
      summary: "Original generation",
      content: initialContent,
    },
  ]);


  useEffect(() => {
    const stored = localStorage.getItem("labReport");
    if (!stored) return;

    (async () => {
      const html = await marked.parse(stored);
      setReportText(html);

      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      } else {
        console.warn("editorRef is not ready yet.");
      }
    })();
  }, []);

// After successful completion
useEffect(() => {
  if (!isStreaming && rubricFeedback && cleanRubric) {
    localStorage.setItem("lastRubricFeedback", cleanRubric);
  }
}, [isStreaming, rubricFeedback, cleanRubric]);

  const [modalOpen, setModalOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState("");

  const [previewText, setPreviewText] = useState("");
  const savedRangeRef = useRef<Range | null>(null);

  const handleHighlightEdit = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();

    if (text && rect && range) {
      setSelectedText(text);
      setPopoverAnchor(rect);
      savedRangeRef.current = range.cloneRange(); // ✅ store actual DOM range
      const words = text.split(/\s+/);
      setPreviewText(
        words.length > 10
          ? `${words.slice(0, 5).join(" ")} ... ${words.slice(-5).join(" ")}`
          : text
      );

      setModalOpen(true);
    }
  };

  const chartRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

// Complete fixed streaming applyDiff function
// Fixed applyDiff function with proper streaming display

// Replace your applyDiff function with this version that forces React updates:

const applyDiff = async (prompt: string) => {
  setModalOpen(false);

  const range = savedRangeRef.current;
  const editor = editorRef.current;

  if (!range || !editor) {
    console.warn("Missing saved range or editor");
    return;
  }

  // FIX 1: Remove any existing action boxes and prevent conflicts
  const existingBoxes = editor.querySelectorAll(".inline-action-box");
  existingBoxes.forEach(box => box.remove());

  // FIX 2: Clear any processing states
  const existingContainers = editor.querySelectorAll(".inline-edit-suggestion");
  existingContainers.forEach(container => {
    container.removeAttribute("data-processing");
  });

  const originalText = range.toString();
  console.log("🚀 Starting edit streaming for:", originalText.substring(0, 50) + "...");

  // FIX 3: Create properly wrapped container
  const streamingSpan = document.createElement("span");
  streamingSpan.className = "inline-edit-suggestion animate-pulse";
  streamingSpan.setAttribute("data-original", encodeURIComponent(originalText));
  streamingSpan.setAttribute("data-processing", "true"); // Prevent duplicates
  
  // Initial streaming message
  streamingSpan.innerHTML = '<span class="streaming-content text-gray-500 italic">Claude is rewriting...</span>';

  // FIX 4: Better range replacement that preserves structure
  try {
    // Extract any HTML structure from the selected range
    const selectedFragment = range.extractContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedFragment);
    const hadParagraphs = tempDiv.querySelector('p') !== null;
    
    // Insert our streaming container
    range.insertNode(streamingSpan);
    
    // Clear selection
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let buffer = "";

    const contentSpan = streamingSpan.querySelector('.streaming-content');
    if (!contentSpan) {
      throw new Error("Content span not found");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("✅ Streaming completed");
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
            
            // Format text for proper display
            let displayText = accumulatedText
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*([^*]+)\*/g, '<em>$1</em>')
              .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>');
            
            // Handle paragraph breaks properly
            if (displayText.includes('\n\n')) {
              // Convert double newlines to paragraph breaks
              const paragraphs = displayText.split('\n\n').filter(p => p.trim());
              displayText = paragraphs.map(p => 
                p.trim() ? `<p class="inline">${p.replace(/\n/g, '<br>')}</p>` : ''
              ).join('');
            } else {
              // Single paragraph with line breaks
              displayText = displayText.replace(/\n/g, '<br>');
            }
            
            // Update the content
            contentSpan.innerHTML = displayText || accumulatedText;
            contentSpan.className = 'streaming-content text-gray-800';
            
            // Force visual update
            contentSpan.offsetHeight;
            setStreamingText(accumulatedText);
            
            // Controlled streaming speed
            await new Promise(resolve => setTimeout(resolve, 25));
          }
        } catch (parseError) {
          console.warn("⚠️ JSON parse error:", parseError);
        }
      }
    }

    // FIX 5: Clean finalization
    if (streamingSpan && accumulatedText.trim()) {
      console.log("✅ Finalizing stream");
      
      // Remove pulsing animation
      streamingSpan.classList.remove("animate-pulse");
      streamingSpan.removeAttribute("data-processing");
      
      // Add action buttons after a brief delay
      setTimeout(() => {
        // Ensure we don't add duplicate boxes
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

      // Update version history
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
    
    const contentSpan = streamingSpan.querySelector('.streaming-content');
    if (contentSpan) {
      contentSpan.innerHTML = `<span class="text-red-600 font-medium">❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}</span>`;
    }
    streamingSpan.classList.remove("animate-pulse");
    streamingSpan.removeAttribute("data-processing");
  } finally {
    setIsEditStreaming(false);
    setStreamingContainer(null);
    savedRangeRef.current = null;
  }
};

// Also update the click handler to properly handle the new structure
useEffect(() => {
  const editor = editorRef.current;
  if (!editor) return;

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const container = target.closest(".inline-edit-suggestion") as HTMLElement;
    if (!container) return;

    // Handle Accept
    if (target.classList.contains("accept-btn")) {
      console.log("✅ Accepting edit");
      
      // Get the content from the streaming container
      const contentSpan = container.querySelector('.streaming-content');
      if (contentSpan) {
        // Create a document fragment with the content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentSpan.innerHTML;
        
        // Replace the container with the content
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        container.replaceWith(fragment);
      } else {
        // Fallback: just remove the container styling
        container.classList.remove("inline-edit-suggestion", "bg-yellow-100", "border-yellow-300");
        const box = container.querySelector(".inline-action-box");
        if (box) box.remove();
        container.removeAttribute("data-original");
      }
      
      setReportText(editor.innerHTML);
      localStorage.setItem("labReport", editor.innerText);
    }

    // Handle Reject
    if (target.classList.contains("reject-btn")) {
      console.log("❌ Rejecting edit");
      
      const original = decodeURIComponent(container.dataset.original || "").trim();
      
      // Replace with original text
      const textNode = document.createTextNode(original);
      container.replaceWith(textNode);
      
      setReportText(editor.innerHTML);
      localStorage.setItem("labReport", editor.innerText);
    }
  };

const handleHover = (e: MouseEvent) => {
    const container = (e.target as HTMLElement).closest(".inline-edit-suggestion") as HTMLElement;
    if (!container || container.querySelector(".inline-action-box") || container.classList.contains("animate-pulse")) return;

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

// Add visual indicator for streaming in your JSX (add this near your editor)
{isEditStreaming && (
  <div className="fixed top-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg z-50">
    <div className="flex items-center gap-2 text-blue-800">
      <RefreshCw className="animate-spin" size={16} />
      <span className="text-sm font-medium">Claude is rewriting...</span>
    </div>
  </div>
)}



// Update your existing click handler to work with the new streaming system
useEffect(() => {
  const editor = editorRef.current;
  if (!editor) return;

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const container = target.closest(".inline-edit-suggestion") as HTMLElement;
    if (!container) return;

    // Handle Accept
    if (target.classList.contains("accept-btn")) {
      // Remove suggestion styling and action box
      container.classList.remove("inline-edit-suggestion", "bg-yellow-100", "border-yellow-300", "animate-pulse");
      const box = container.querySelector(".inline-action-box");
      if (box) box.remove();
      container.removeAttribute("data-original");
      
      // Clean up the content
      const content = container.querySelector('.streaming-content');
      if (content) {
        const cleanDiv = document.createElement('div');
        cleanDiv.innerHTML = content.innerHTML;
        container.replaceWith(...Array.from(cleanDiv.childNodes));
      }
      
      setReportText(editor.innerHTML);
      localStorage.setItem("labReport", editor.innerText);
    }

    // Handle Reject
    if (target.classList.contains("reject-btn")) {
      const original = decodeURIComponent(container.dataset.original || "").trim();
      
      // Create text nodes for the original content
      const textNode = document.createTextNode(original);
      container.replaceWith(textNode);
      
      setReportText(editor.innerHTML);
      localStorage.setItem("labReport", editor.innerText);
    }
  };

  const handleHover = (e: MouseEvent) => {
    const container = (e.target as HTMLElement).closest(".inline-edit-suggestion") as HTMLElement;
    if (!container || container.querySelector(".inline-action-box") || container.classList.contains("animate-pulse")) return;

    const box = document.createElement("div");
    box.className = "inline-action-box absolute left-0 mt-1 bg-white border text-sm px-2 py-1 rounded shadow flex gap-2 z-50";
    box.innerHTML = `
      <button class="text-green-600 accept-btn hover:bg-green-50 px-2 py-1 rounded">✅ Accept</button>
      <button class="text-red-600 reject-btn hover:bg-red-50 px-2 py-1 rounded">❌ Reject</button>
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

// Add visual indicator for streaming in your JSX (add this near your editor)
{isEditStreaming && (
  <div className="fixed top-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg z-50">
    <div className="flex items-center gap-2 text-blue-800">
      <RefreshCw className="animate-spin" size={16} />
      <span className="text-sm font-medium">Claude is rewriting...</span>
    </div>
  </div>
)}





  const handleRestore = async (content: string) => {
    if (!content || content.trim().length < 10) {
      console.warn("Empty restore content – skipping.");
      return;
    }

    // Optional: Convert markdown to HTML if needed
    const html = content.includes("<p>") ? content : await marked.parse(content);

    setReportText(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };



  const handleExport = (format: string) => {
    alert(`Exporting as ${format} not implemented yet.`);
  };

  useEffect(() => {
    const storedReport = localStorage.getItem("labReport");
    const storedChart = localStorage.getItem("chartSpec");

    const storedRubric = localStorage.getItem("rubricText");
    const storedManual = localStorage.getItem("manualText");

    if (storedRubric) setRubricText(storedRubric);
    if (storedManual) setManualText(storedManual);


    if (storedReport && editorRef.current) {
      const parseAndSet = async () => {
        const parsed = await Promise.resolve(marked.parse(storedReport));
        editorRef.current!.innerHTML = parsed;
        setReportText(parsed);
      };
      parseAndSet();
    }

    if (storedChart) {
      try {
        const parsed: ChartSpec = JSON.parse(storedChart);
        setChartSpec(parsed);
      } catch (e) {
        console.error("Invalid chartSpec in localStorage", e);
      }
    }
  }, []);


  useEffect(() => {
    if (chartSpec && chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      if (currentChart) {
        currentChart.destroy();
        currentChart = null;
      }

      const labels =
  Array.isArray(chartSpec.labels) && chartSpec.labels.length > 0
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
        let trendlineDataset = [];

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

      currentChart = new Chart(ctx, {
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
    }
  }, [chartSpec]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(".inline-edit-suggestion") as HTMLElement;
      if (!container) return;

      // Handle Accept
      if (target.classList.contains("accept-btn")) {
        container.classList.remove("inline-edit-suggestion", "bg-yellow-100", "border-yellow-300");
        const box = container.querySelector(".inline-action-box");
        if (box) box.remove();
        container.removeAttribute("data-original");
        setReportText(editor.innerHTML);
      }

      // Handle Reject
      if (target.classList.contains("reject-btn")) {
        const original = decodeURIComponent(container.dataset.original || "").trim();
        const paragraphs = original.split(/\n{2,}/);
        const fragment = document.createDocumentFragment();
        for (const para of paragraphs) {
          const p = document.createElement("p");
          p.textContent = para.trim();
          fragment.appendChild(p);
        }
        container.replaceWith(fragment);
        setReportText(editor.innerHTML);
      }
    };

    const handleHover = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest(".inline-edit-suggestion") as HTMLElement;
      if (!container || container.querySelector(".inline-action-box")) return;

      const box = document.createElement("div");
      box.className = "inline-action-box absolute left-0 mt-1 bg-white border text-sm px-2 py-1 rounded shadow flex gap-2 z-50";
      box.innerHTML = `
        <button class="text-green-600 accept-btn">✅ Accept</button>
        <button class="text-red-600 reject-btn">❌ Reject</button>
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
        {/* Sidebar Left */}
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

        {/* Main Content */}
        <main className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-cyan-700">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">Name: {name} | Date: {date}</p>
            <div className="mt-4 flex gap-2">
              <button className="flex items-center gap-1 text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
                <ArrowDownToLine size={16} /> Export
              </button>
              <button className="flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600">
                ▶ Preview
              </button>
            </div>
          </div>

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
          ></div>
          {modalOpen && (
            <PromptPopover
              open={modalOpen}
              anchorEl={popoverAnchor}
              previewText={previewText}
              onClose={() => setModalOpen(false)}
              onSubmit={applyDiff}
            />
          )}

<div className="mt-8">
  <h2 className="text-lg font-semibold mb-2">Rubric Feedback</h2>
  
  {isStreaming && (
    <div className="flex items-center gap-2 text-blue-600 mb-2">
      <RefreshCw className="animate-spin" size={16} />
      Claude is analyzing your report...
    </div>
  )}
  
  <div className="border border-gray-300 bg-gray-50 rounded-md p-4 text-sm whitespace-pre-wrap">
    {rubricFeedback || "Claude-generated feedback from rubric will appear here (based on manual)."}
  </div>
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
                  <button onClick={() => handleRestore(v.content)} className="text-blue-500 hover:underline">↺ Restore</button>
                </li>
              ))}
            </ul>
          </div>

          {chartSpec && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold mb-2">Graph</h2>
              <canvas ref={chartRef} className="w-full max-w-3xl" height={300} />
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-72 p-4 border-l bg-white space-y-4 shadow-sm">
          <div className="bg-gradient-to-br from-[#00e3ae] to-[#0090f1] text-white rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Wand2 size={16} /> AI Writing Assistant</h3>
            <p className="text-sm">Highlight text and get instant AI suggestions for improvement.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-cyan-600"/> Quick Actions</h4>
            <button className="flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">
              <RefreshCw size={16} className="text-cyan-600"/> Regenerate Entire Report
            </button>
            <button className="flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">
              <PenLine size={16} className="text-green-600"/> Improve Academic Tone
            </button>
            <button onClick={handleCheckCompleteness} className="flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">
              <ListChecks size={16} className="text-blue-600"/> Check for Completeness
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><ArrowDownToLine size={16} className="text-cyan-600"/> Export Report</h4>
            <button onClick={() => handleExport("PDF")} className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"><FileIcon size={16} className="text-blue-600"/> PDF</button>
            <button onClick={() => handleExport("DOCX")} className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"><BookText size={16} className="text-green-600"/> Word</button>
            <button onClick={() => handleExport("LaTeX")} className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"><FileCode2 size={16} className="text-purple-600"/> LaTeX</button>
            <button onClick={() => handleExport("TXT")} className="flex items-center gap-2 w-full py-2 px-3 border rounded-md text-gray-800 hover:bg-gray-50"><FileType2 size={16} className="text-orange-600"/> Text</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2"><Target size={16} /> Progress</h4>
            <div className="text-sm text-gray-700 mb-2">Report Completion <span className="float-right font-semibold text-emerald-600">85%</span></div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="h-2 bg-gray-800 w-[85%] rounded-full"></div>
            </div>
            <ul className="text-sm text-gray-600 mt-3 space-y-1">
              <li><CircleCheck className="inline mr-1 text-emerald-500" size={14}/> Introduction Complete</li>
              <li><CircleCheck className="inline mr-1 text-emerald-500" size={14}/> Methodology Complete</li>
              <li><CircleCheck className="inline mr-1 text-emerald-500" size={14}/> Results In Progress</li>
              <li><CircleCheck className="inline mr-1 text-gray-300" size={14}/> Conclusion Pending</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
