// --- /src/pages/api/generate.ts ---
import type { NextApiRequest, NextApiResponse } from "next";
import { generateLabReportPrompt } from "@/utils/prompts";

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
    console.log("Manual preview:", text?.slice(0, 200));
    console.log("Raw data preview:", rawData);

    const prompt = generateLabReportPrompt(text, rawData);
    console.log("Claude prompt preview:", prompt.slice(0, 400));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const result = await response.json();
    console.log("Claude full response:", JSON.stringify(result, null, 2));

    const completion = result?.content?.[0]?.text?.trim();
    if (!completion || completion.length < 100) {
      console.error("Claude returned incomplete or no content:", result);
      return res.status(500).json({ error: "Claude returned an invalid response." });
    }

    res.status(200).json({ report: completion });
  } catch (error) {
    console.error("Claude generation error:", error);
    res.status(500).json({ error: "Failed to generate lab report." });
  }
}
