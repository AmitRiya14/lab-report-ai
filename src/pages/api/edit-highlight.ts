import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set up streaming response headers immediately
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  try {
    // Parse request body (same as rubric.ts)
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const raw = Buffer.concat(buffers).toString("utf8");
    const { original, prompt, fullReport } = JSON.parse(raw);

    if (!original?.trim() || !prompt?.trim()) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Missing original text or prompt" })}\n\n`);
      res.end();
      return;
    }

    const fullPrompt = `You are an AI assistant helping revise a lab report. Follow the user instruction precisely.

Instruction: ${prompt}

Full Report (for context only):
"""
${fullReport}
"""

Text to edit:
"""
${original}
"""

Rewrite ONLY the specified text passage according to the instruction. Return the revised text in plain markdown format without any JSON wrapper or additional formatting. Do not include a summary or explanation - just return the improved text directly.`;

    // Stream directly from Claude (same pattern as rubric.ts)
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        stream: true,
        max_tokens: 6000,
        messages: [{ role: "user", content: fullPrompt }]
      })
    });

    if (!claudeResponse.ok) {
      res.write(`data: ${JSON.stringify({ type: "error", error: `Claude API error: ${claudeResponse.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = claudeResponse.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          // Forward the line directly to client (same as rubric.ts)
          res.write(line + '\n');
          
          // Force immediate flush
          if (res.flush) {
            res.flush();
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    res.write('data: [DONE]\n\n');

  } catch (error) {
    console.error("API Error:", error);
    res.write(`data: ${JSON.stringify({ 
      type: "error", 
      error: error instanceof Error ? error.message : "Unknown error"
    })}\n\n`);
  } finally {
    res.end();
  }
}