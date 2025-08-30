// src/pages/api/humanize.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { createSecureHandler } from '@/lib/middleware';
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';
import { mlService } from '@/lib/ml-service';

async function humanizeHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { text, target_style = 'natural', preserve_meaning = true } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text too long (max 10,000 characters)' });
    }

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    try {
      // First, analyze user patterns if we don't have them
      let userPatterns;
      try {
        const patternAnalysis = await mlService.analyzePatterns(text, session.user.email);
        userPatterns = patternAnalysis.patterns;
      } catch (error) {
        console.warn('Pattern analysis failed, using defaults:', error);
        userPatterns = null;
      }

      // Stream the humanization process
      const humanizedText = await mlService.humanizeText(
        {
          text,
          user_id: session.user.email,
          user_patterns: userPatterns,
          target_style,
          preserve_meaning,
        },
        (progress) => {
          // Forward progress to client
          res.write(`data: ${JSON.stringify(progress)}\n\n`);
        }
      );

      // Send final completion
      res.write(`data: ${JSON.stringify({ 
        type: 'final_complete', 
        text: humanizedText 
      })}\n\n`);
      res.write('data: [DONE]\n\n');

    } catch (mlError) {
      console.error('ML Service error:', mlError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Failed to humanize text. Please try again.' 
      })}\n\n`);
    }

  } catch (error) {
    console.error('Humanization API error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Internal server error' 
      })}\n\n`);
    }
  } finally {
    res.end();
  }
}

// Apply rate limiting
const rateLimitedHandler = withRateLimit(
  RATE_LIMITS.GENERATE.requests,
  RATE_LIMITS.GENERATE.windowMs
)(humanizeHandler);

export default createSecureHandler(rateLimitedHandler, {
  requireAuth: true,
});