// --- PATCHED: /lib/claude.ts ---
import { getHash, getCachedEdit, storeCachedEdit } from './cache';

export type ChartSpec = {
  graphType: "line" | "bar" | "scatter";
  xLabel: string;
  yLabel: string;
  series: { label: string; column: string; values: number[] }[];
};

export async function generateChartSpecFromManual(manualText: string): Promise<ChartSpec> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: `From the lab manual below, extract and return JSON instructions for generating a graph. Include:
- graphType: "line", "bar", or "scatter"
- xLabel and yLabel
- series: array of { label, column }

Respond ONLY with JSON.

Manual text:
"""${manualText}"""`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${errorText}`);
  }

  try {
    const raw = await response.text();
    const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (!codeMatch) throw new Error("No JSON code block found in Claude response.");

    return JSON.parse(codeMatch[1]);
  } catch (err) {
    console.error("Claude JSON parse failed:", err);
    throw new Error("Claude returned malformed JSON or non-JSON content.");
  }
}

export async function generateLabReport(manualText: string, rawDataSummary: string): Promise<string | null> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  const fullPrompt = `You are a scientific writer. Your task is to write a complete, original lab report using the materials below.

DO NOT reuse prior reports or invent generalized content. Base all sections strictly on the following lab manual and data.

---
📘 Lab Manual:
${manualText}

📊 Raw Data:
${rawDataSummary}


✍️ Instructions: Generate a full lab report following these grading criteria and based solely on the material above.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.4,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ]
    })
  });

  try {
    const contentType = response.headers.get("content-type");
    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`Claude API error: ${raw}`);
    }

    if (contentType?.includes("application/json")) {
      const data = JSON.parse(raw);
      return data?.content?.[0]?.text || null;
    } else {
      return raw; // fallback for malformed headers
    }
  } catch (err) {
    console.error("Claude lab report generation failed:", err);
    return null;
  }
}

export async function editHighlightedText(prompt: string, text: string, fullReport: string) {
  const hash = getHash(text, prompt);
  const cached = getCachedEdit(hash);
  if (cached) return cached;

  const fullPrompt = `
You are an AI assistant helping revise a lab report. Follow the user instruction precisely.

Instruction: ${prompt}
Full Report (for context only):
"""
${fullReport}
"""
Text:
"""
${text}
"""

Rewrite the passage accordingly. Also return a short summary of the change (max 12 words).
Respond in this JSON format:
{
  "editedText": "...",
  "summaryTitle": "..."
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude edit error: ${errorText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data?.content?.[0]?.text || '{}');
  storeCachedEdit(hash, parsed);
  return parsed;
}

export async function callClaude(prompt: string, maxTokens = 800, temperature = 0.4): Promise<string> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) throw new Error("Claude API key not set");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Claude API error: ${result?.error?.message || response.statusText}`);
  }

  return result?.content?.[0]?.text?.trim() || "";
}

// --- New: Claude Streaming Wrapper ---
export async function streamClaude({
  prompt,
  temperature = 0.4,
  max_tokens = 800,
  signal
}: {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) throw new Error("Claude API key not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      stream: true,
      temperature,
      max_tokens,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`Claude streaming error: ${errText}`);
  }

  return res.body;
}
