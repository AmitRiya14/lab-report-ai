// --- /pages/api/generate.ts ---
import type { NextApiRequest, NextApiResponse } from "next";
import { generateLabReportPrompt } from "../../utils/prompts";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { text, rawData } = req.body;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ message: "Missing Claude API key." });
  }

  try {
    console.log("Claude Input Preview (manual):", text?.slice(0, 500));
    console.log("Claude Input Preview (rawData):", rawData?.slice(0, 500));
    const prompt = generateLabReportPrompt(text, rawData);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    console.log("Claude raw response:", JSON.stringify(data, null, 2));

    const output = data?.content?.[0]?.text || data?.content || "No response from Claude API.";
    res.status(200).json({ generatedReport: output });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate report", error });
  }
}
