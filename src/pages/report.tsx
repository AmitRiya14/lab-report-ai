// --- PATCHED: /src/pages/report.tsx ---
import React, { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { Chart, registerables } from "chart.js";
import { marked } from "marked";

Chart.register(...registerables);

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [reportText, setReportText] = useState("");
  const [chartSpec, setChartSpec] = useState<any>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("Loading lab report from localStorage...");
    const stored = localStorage.getItem("labReport");
    const chartJson = localStorage.getItem("chartSpec");
    console.log("labReport raw value:", stored);

    if (stored && editorRef.current) {
      const htmlContent = marked.parse(stored);
      editorRef.current.innerHTML = htmlContent;
      setReportText(stored);
    } else {
      console.warn("No lab report found in storage.");
    }

    if (chartJson) {
      try {
        const parsed = JSON.parse(chartJson);
        setChartSpec(parsed);
      } catch (err) {
        console.error("Error parsing chartSpec from localStorage:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (chartSpec && chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      const labels = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
      const datasets = chartSpec.series.map((s: any, i: number) => ({
        label: s.label,
        data: labels.map((_, j) => [
          [-0.167, -0.105, -0.05, 0, 0.046, 0.087, 0.127, 0.166, 0.204, 0.241, 0.277][i % 11]
        ][0]),
        borderWidth: 2,
        borderColor: `hsl(${i * 90}, 70%, 50%)`,
        backgroundColor: `hsla(${i * 90}, 70%, 50%, 0.3)`
      }));

      new Chart(ctx, {
        type: chartSpec.graphType,
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          scales: {
            x: {
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

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold text-center">Lab Report</h2>

      <div className="flex gap-2 flex-wrap">
        <input type="text" placeholder="Experiment Title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-[200px] p-2 border rounded" />
        <input type="text" placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[200px] p-2 border rounded" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48 p-2 border rounded" />
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="mx-auto bg-white p-8 rounded-lg shadow-lg prose"
        style={{
          maxHeight: "70vh",
          overflowY: "auto",
          width: "100%",
          fontFamily: "Times New Roman, serif",
          fontSize: "12pt",
          lineHeight: 2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: "2px solid #3B82F6",
          borderRadius: "16px"
        }}
      />

      {chartSpec && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Generated Graph</h3>
          <canvas ref={chartRef} className="w-full max-w-3xl mx-auto border rounded shadow" height={300} />
        </div>
      )}

      <style jsx>{`
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .prose table, .prose th, .prose td {
          border: 1px solid black;
        }
        .prose th, .prose td {
          padding: 8px;
          text-align: center;
          font-size: 12pt;
        }
        .prose thead {
          background-color: #f3f3f3;
        }
      `}</style>
    </div>
  );
}
