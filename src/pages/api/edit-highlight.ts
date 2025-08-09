import { NextApiRequest, NextApiResponse } from "next";
import { claudeService } from "@/lib/server/claude-server";
import { createSecureHandler } from '@/lib/middleware';
import { TextInputSchema } from '@/lib/validation/schemas';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function editHighlightHandler(req: NextApiRequest, res: NextApiResponse) {
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

    // Use server-side Claude service for streaming
    try {
      await claudeService.streamGeneration(req, res, fullPrompt);
    } catch (error) {
      console.error("Claude service error:", error);
      res.write(`data: ${JSON.stringify({ 
        type: "error", 
        error: error instanceof Error ? error.message : "Unknown error"
      })}\n\n`);
    }

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

import { withRateLimit, RATE_LIMITS } from "@/lib/middleware/rateLimit";

// Apply advanced rate limiting
const rateLimitedHandler = withRateLimit(
  RATE_LIMITS.GENERATE.requests,
  RATE_LIMITS.GENERATE.windowMs
)(editHighlightHandler);

export default createSecureHandler(rateLimitedHandler, {
  requireAuth: true,
});