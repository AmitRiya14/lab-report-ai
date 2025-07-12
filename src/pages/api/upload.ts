// --- /pages/api/upload.ts ---
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import * as XLSX from "xlsx";
import { parseLabManual } from "../../lib/parser";
import { generateChartSpecFromManual } from "../../lib/claude";
import { generateLabReportPrompt } from "../../utils/prompts";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const form = new IncomingForm({ uploadDir: "./uploads", keepExtensions: true, multiples: true });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) return res.status(500).json({ message: "Form parsing failed" });

      const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
      let extractedText = "";
      let dataHeaders = [];
      let dataRows = [];
      let chartSpec: any = null;

      for (const file of uploadedFiles) {
        if (!file || !file.filepath) continue;

        const buffer = fs.readFileSync(file.filepath);

        if (file.mimetype?.includes("pdf") || file.originalFilename?.endsWith(".pdf")) {
          extractedText = await parseLabManual(buffer);
          chartSpec = await generateChartSpecFromManual(extractedText);
          console.log("AI-generated chartSpec:", chartSpec);
        } else if (file.mimetype?.includes("excel") || file.originalFilename?.endsWith(".xlsx")) {
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          dataHeaders = raw[0];
          dataRows = raw.slice(1);
        }
      }

      console.log("Extracted manual:", extractedText?.slice(0, 1000));
      console.log("Excel headers:", dataHeaders);
      console.log("Excel preview:", dataRows.slice(0, 5));

      if (!extractedText || !chartSpec || dataHeaders.length === 0 || dataRows.length === 0) {
        return res.status(400).json({ message: "Manual or data file incomplete" });
      }

      const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
      const prompt = generateLabReportPrompt(extractedText, dataRows);

      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": CLAUDE_API_KEY!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        })
      });

      const reportData = await aiResponse.json();
      const generatedReport = reportData?.content?.[0]?.text || reportData?.content || "No response from Claude API.";

      return res.status(200).json({
        extractedText,
        chartSpec,
        data: {
          headers: dataHeaders,
          rows: dataRows
        },
        generatedReport
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Error handling upload", error: (error as Error).message });
    }
  });
}