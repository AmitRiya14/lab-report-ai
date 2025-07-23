import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { parseLabManual } from "@/lib/parser";
import { processExcelFile, ChartSpec } from "@/lib/excel";
import { generateChartSpecFromManual, generateLabReport } from "@/lib/claude";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Strip markdown formatting from text for clean display
 * Copied from report.tsx to maintain consistency
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
    // Remove table formatting
    .replace(/\|/g, '')
    .replace(/^[-\s:]+$/gm, '') // Remove table separator lines
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 🧠 Rubric generator using Claude
async function generateRubricFromManual(manualText: string, rawData: string): Promise<string> {
  const prompt = `
You are an academic TA generating a grading rubric for a university-level lab report.

Use the structure of these reference rubrics (Lab 5 and Lab 7) to create expectations for each section: title, abstract, intro, methods, results, discussion, references, appendix.

⚠️ Do NOT make it topic-specific. Create a general-purpose rubric based on this lab's structure and intent.

--- LAB MANUAL ---
${manualText}

--- RAW DATA SUMMARY ---
${rawData}
`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const body = await response.text();
  const parsed = JSON.parse(body);
  const rawRubric = parsed?.content?.[0]?.text?.trim() || "Rubric generation failed.";
  return stripMarkdownSync(rawRubric); // ✅ This strips the markdown
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({ multiples: true, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Error parsing files" });

    const rawFiles = files["files"];
    if (!rawFiles) {
      console.error("No files received under field name 'files'");
      return res.status(400).json({ error: "No uploaded files found" });
    }

    const uploadedFiles = Array.isArray(rawFiles) ? rawFiles : [rawFiles];

    let manualText = "";
    let rawDataText = "";
    let chartSpec: ChartSpec | null = null;

    for (const file of uploadedFiles) {
      if (!file) continue;

      const filepath = file.filepath || file.filepath;
      if (!filepath) {
        console.warn("Missing file path:", file);
        continue;
      }

      if (file.originalFilename?.match(/\.pdf$/i)) {
        manualText += await parseLabManual(fs.readFileSync(filepath));
      } else if (file.originalFilename?.match(/\.xlsx$/i)) {
        const result = await processExcelFile(filepath);
        rawDataText += result.summary;
        chartSpec = result.chartSpec;
      }
    }

    if (!manualText) return res.status(400).json({ error: "No lab manual provided" });
    if (!chartSpec) {
      chartSpec = await generateChartSpecFromManual(manualText);
    }

    console.log("Manual preview:", manualText.slice(0, 300));
    console.log("Raw data preview:", rawDataText.slice(0, 300));
    console.log("Initial chartSpec:", chartSpec);

    // 🔥 Generate Claude-based rubric
    const rubric = await generateRubricFromManual(manualText, rawDataText);
    console.log("📋 Claude-generated rubric preview:\n", rubric.slice(0, 500));

    // 🔥 Generate lab report using rubric
    const report = await generateLabReport(manualText, rawDataText);

    if (!report || report.length < 100) {
      console.error("⚠️ Empty or invalid report:", report);
      return res.status(500).json({ error: "Failed to generate report" });
    }

    // Attempt to extract ChartSpec from report (if present)
    let extractedChartSpec = null;
    const chartJsonMatch = report?.match(/```json\s*([\s\S]*?)```/);
    if (chartJsonMatch) {
      try {
        extractedChartSpec = JSON.parse(chartJsonMatch[1]);
        console.log("✅ Extracted chartSpec from Claude response:", extractedChartSpec);
      } catch (e) {
        console.warn("⚠️ Failed to parse chartSpec from Claude");
      }
    }

    const cleanedReport = report.replace(/```json\s*[\s\S]*?```/, "").trim();

    return res.status(200).json({
      labReport: cleanedReport,
      chartSpec: extractedChartSpec || chartSpec,
      rubric, // ✅ include rubric in response
    });
  });
}
