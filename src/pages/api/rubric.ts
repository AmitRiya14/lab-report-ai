import { NextApiRequest, NextApiResponse } from "next";
import { claudeService } from "@/lib/server/claude-server";
import { createSecureHandler } from '@/lib/middleware';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function rubricHandler(req: NextApiRequest, res: NextApiResponse) {
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

    // Use server-side Claude service for streaming
    try {
      await claudeService.streamGeneration(req, res, prompt);
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
)(rubricHandler);

export default createSecureHandler(rateLimitedHandler, {
  requireAuth: true,
});