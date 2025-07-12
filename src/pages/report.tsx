// --- /pages/report.tsx ---
import React, { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import saveAs from "file-saver";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line, Bar, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [reportText, setReportText] = useState("");
  const [chartSpec, setChartSpec] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("labReport");
    const storedChartSpec = localStorage.getItem("chartSpec");
    const storedHeaders = localStorage.getItem("dataHeaders");
    const storedRows = localStorage.getItem("dataRows");

    if (stored && editorRef.current) {
      editorRef.current.innerHTML = stored;
      setReportText(stored);
    }

    if (storedChartSpec && storedHeaders && storedRows) {
      const spec = JSON.parse(storedChartSpec);
      const headers = JSON.parse(storedHeaders);
      const rows = JSON.parse(storedRows);
      const labels = rows.map(r => r[0]);

      const datasets = spec.series.map((s: any) => {
        const colIndex = headers.indexOf(s.column);
        return {
          label: s.label,
          data: rows.map((r: any) => r[colIndex]),
          borderWidth: 2,
          pointRadius: 4,
        };
      });

      setChartSpec(spec);
      setChartData({ labels, datasets });
    }
  }, []);

  const downloadText = () => {
    const fullText = `Title: ${title}\nName: ${name}\nDate: ${date}\n\n${reportText}`;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "Lab_Report.txt");
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const fullText = `Title: ${title}\nName: ${name}\nDate: ${date}\n\n${reportText}`;
    const lines = doc.splitTextToSize(fullText, 520);
    let y = 40;
    lines.forEach((line: string) => {
      if (y > 800) {
        doc.addPage();
        y = 40;
      }
      doc.text(line, 40, y);
      y += 20;
    });
    doc.save("Lab_Report.pdf");
  };

  const downloadDOCX = async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `Title: ${title}`, bold: true }),
                new TextRun("\n"),
                new TextRun({ text: `Name: ${name}`, bold: true }),
                new TextRun("\n"),
                new TextRun({ text: `Date: ${date}`, bold: true }),
                new TextRun("\n\n"),
              ]
            }),
            ...reportText.split("\n").map(line => new Paragraph(line)),
          ]
        }
      ]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Lab_Report.docx");
  };

  const saveChanges = () => {
    localStorage.setItem("labReport", reportText);
    alert("Changes saved to localStorage");
  };

  const charCount = reportText.length;
  const wordCount = reportText.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
  const estimatedPages = Math.ceil(charCount / 1600);

  const ChartPreview = chartSpec?.graphType === "bar" ? Bar : chartSpec?.graphType === "scatter" ? Scatter : Line;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-gray-800 font-sans">
      <h1 className="text-4xl font-bold text-center text-blue-800">Lab Report Editor</h1>

      <div className="bg-white border border-gray-300 shadow-lg rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Experiment Title" className="p-3 border border-gray-300 rounded-lg w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="text" placeholder="Student Name" className="p-3 border border-gray-300 rounded-lg w-full" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="date" className="p-3 border border-gray-300 rounded-lg w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="w-full flex justify-center">
          <div ref={editorRef} contentEditable suppressContentEditableWarning className="min-h-[400px] max-h-[700px] w-[80%] p-6 border-2 border-blue-500 rounded-lg bg-gray-50 font-serif text-base leading-7 whitespace-pre-wrap overflow-y-scroll focus:outline-none" onInput={(e) => setReportText((e.target as HTMLDivElement).innerHTML)} />
        </div>

        <div className="text-sm text-gray-500 text-center">Word Count: <strong>{wordCount}</strong> | Estimated Pages: <strong>{estimatedPages}</strong></div>

        {chartData && (
          <div className="pt-6">
            <h2 className="text-xl font-semibold mb-2 text-blue-700">Graph Preview</h2>
            <div className="bg-white p-4 rounded-lg border shadow">
              <ChartPreview
                data={chartData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' }, title: { display: true, text: chartSpec?.title || 'Generated Graph' } },
                  scales: {
                    x: { title: { display: true, text: chartSpec?.xLabel || 'X Axis' } },
                    y: { title: { display: true, text: chartSpec?.yLabel || 'Y Axis' } }
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button onClick={saveChanges} className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-lg shadow-md">Save</button>
          <button onClick={downloadText} className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg shadow-md">Download .txt</button>
          <button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md">Download .pdf</button>
          <button onClick={downloadDOCX} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg shadow-md">Download .docx</button>
        </div>
      </div>
    </div>
  );
}
