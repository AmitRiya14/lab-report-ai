import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { parseLabManual } from "@/lib/parser";
import { processExcelFile } from "@/lib/excel";
import { generateChartSpecFromManual } from "@/lib/claude";
import { generateLabReportPrompt } from "@/utils/prompts";

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    let chartSpec = null;

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

    const prompt = generateLabReportPrompt(manualText, rawDataText);
    console.log("Claude prompt preview:", prompt.slice(0, 500));

    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0.5,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ]
        })
      });

      const bodyText = await claudeRes.text();
      console.log("Claude raw response:", bodyText);

      const data = JSON.parse(bodyText);
      const fullText = data?.content?.[0]?.text;
      let report = fullText;
      let extractedChartSpec = null;

      const chartJsonMatch = fullText?.match(/```json\s*([\s\S]*?)```/);
      if (chartJsonMatch) {
        try {
          extractedChartSpec = JSON.parse(chartJsonMatch[1]);
          console.log("✅ Extracted chartSpec from Claude response:", extractedChartSpec);
        } catch (e) {
          console.warn("⚠️ Failed to parse chartSpec from Claude's markdown block");
        }
      }

      // Remove chartSpec JSON block from markdown body if present
      report = report?.replace(/```json\s*[\s\S]*?```/, "").trim();

      if (!report || report.length < 100) {
        console.error("⚠️ Empty or invalid report:", report);
        return res.status(500).json({ error: "Failed to generate report" });
      }

      return res.status(200).json({ labReport: report, chartSpec: extractedChartSpec });
    } catch (error) {
      console.error("Claude API call failed:", error);
      return res.status(500).json({ error: "Claude API call failed" });
    }
  });
}
