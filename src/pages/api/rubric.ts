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
    // Parse request body
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const raw = Buffer.concat(buffers).toString("utf8");
    const { reportText, rubricText, manualText } = JSON.parse(raw);

    if (!reportText?.trim()) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Report text is required" })}\n\n`);
      res.end();
      return;
    }

    const prompt = `You are grading a university-level lab report using the provided rubric and manual.

For each section, use:
- ✅ (complete and well-done)
- ⚠️ (present but needs improvement) 
- ❌ (missing or inadequate)

Evaluate these sections: Abstract, Introduction, Methods, Results, Discussion, References.

Give specific, actionable feedback for improvement.

RUBRIC:
${rubricText || "Standard academic lab report rubric"}

MANUAL/INSTRUCTIONS:
${manualText || "Standard lab report guidelines"}

REPORT TO EVALUATE:
${reportText}

Provide clear, constructive feedback:`;

    // Stream directly from Claude
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
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!claudeResponse.ok) {
      res.write(`data: ${JSON.stringify({ type: "error", error: `Claude API error: ${claudeResponse.status}` })}\n\n`);
      res.end();
      return;
    }

    if (!claudeResponse.body) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "No response body from Claude API" })}\n\n`);
      res.end();
      return;
    }

    const reader = claudeResponse.body.getReader();
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
          
          // Forward the line directly to client
          res.write(line + '\n');
          
          // Force immediate flush - safely access the underlying Node.js response
          const nodeRes = res as NextApiResponse & { flush?: () => void };
          if (nodeRes.flush) {
            nodeRes.flush();
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