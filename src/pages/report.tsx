// ✅ FULLY INTEGRATED: Figma UI + Original Functionality
// This version includes: header, nav styling, upgrade box, how-to box, AI Assistant, rubric, version history, chart rendering, localStorage, and export buttons

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { marked } from "marked";
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
import InlineDiff from "@/components/InlineDiff";
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

export default function ReportPage() {
  const [title, setTitle] = useState("Lab Report: Quantum Entanglement Experiment");
  const [name, setName] = useState("Student Name");
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportText, setReportText] = useState("");
  const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null);
  const initialContent = typeof window !== 'undefined' ? localStorage.getItem("labReport") || "" : "";

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



  const [modalOpen, setModalOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState("");

  const [diffData, setDiffData] = useState<null | { original: string; updated: string }>(null);
  const [previewText, setPreviewText] = useState("");

  const handleHighlightEdit = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();

    if (text && rect) {
      setSelectedText(text);
      setPopoverAnchor(rect);
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

    const response = await fetch('/api/edit-highlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, original: selectedText }),
    });

    let result;
    try {
      result = await response.json();
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      // Optionally show a toast or fallback message
    }


    if (!result) return;
    const { editedText, summaryTitle } = result;


    // Wrap the Claude-generated text in a yellow span with the original as a data attribute
    const wrapped = `<span class="inline-edit-suggestion" data-original="${encodeURIComponent(
      selectedText
    )}">${editedText}</span>`;

    const updated = reportText.replace(selectedText, wrapped);
    setReportText(updated);

    setVersionHistory([
      {
        timestamp: new Date().toLocaleString(),
        summary: summaryTitle,
        content: updated,
      },
      ...versionHistory,
    ]);

    setDiffData({ original: selectedText, updated: editedText });

    if (editorRef.current) editorRef.current.innerHTML = updated;
  };




  const chartRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleRestore = (content: string) => {
    if (!content || content.trim().length < 10) {
      console.warn("Empty restore content – skipping.");
      return;
    }

    setReportText(content);
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  };


  const handleExport = (format: string) => {
    alert(`Exporting as ${format} not implemented yet.`);
  };

  useEffect(() => {
    const storedReport = localStorage.getItem("labReport");
    const storedChart = localStorage.getItem("chartSpec");

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

      const labels = chartSpec.labels?.length
        ? chartSpec.labels
        : chartSpec.series?.[0]?.values.map((_, i) => i);

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
            x: { title: { display: true, text: chartSpec.xLabel } },
            y: { title: { display: true, text: chartSpec.yLabel } },
          },
        },
      });
    }
  }, [chartSpec]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const span = target.closest(".inline-edit-suggestion") as HTMLElement;
      if (!span) return;

      const actionBox = span.querySelector(".inline-action-box");
      const original = decodeURIComponent(span.dataset.original || "");

      // Hover hint will handle Accept/Reject decision
      const accept = confirm("Accept the suggested change?");
      if (accept) {
        span.classList.remove("inline-edit-suggestion");
        span.removeAttribute("data-original");
      } else {
        span.outerHTML = original;
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
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

          {diffData && (
            <div className="mt-6">
              <InlineDiff
                original={diffData.original}
                updated={diffData.updated}
                onAccept={() => {
                  setReportText(reportText.replace(diffData.original, diffData.updated));
                  setDiffData(null);
                  if (editorRef.current)
                    editorRef.current.innerHTML = reportText.replace(diffData.original, diffData.updated);
                }}
                onReject={() => setReportText(reportText)}
              />
            </div>
          )}


          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Rubric Feedback</h2>
            <div className="border border-gray-300 bg-gray-50 rounded-md p-4 text-sm">
              Claude-generated feedback from rubric will appear here (based on manual).
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
            <button className="flex items-center gap-2 w-full py-2 px-3 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">
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
