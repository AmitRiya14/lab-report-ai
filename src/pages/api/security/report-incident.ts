// src/pages/api/security/report-incident.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createSecureHandler } from '@/lib/middleware';
import { securityMonitor } from '@/lib/security/monitoring';

async function reportIncidentHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      type,
      description,
      severity,
      userEmail,
      additionalData,
      timestamp,
      userAgent,
      url,
      sessionId
    } = req.body;

    // Validate input
    if (!type || !description || !severity) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, description, severity' 
      });
    }

    // Get client IP
    const clientIP = (req.headers['x-forwarded-for'] as string) ||
                    (req.headers['x-real-ip'] as string) ||
                    req.socket.remoteAddress ||
                    'unknown';

    // Log the security incident
    await securityMonitor.logSecurityEvent({
      type: type,
      severity: severity,
      email: userEmail,
      ipAddress: clientIP,
      userAgent: userAgent || req.headers['user-agent'] as string,
      metadata: {
        description,
        url,
        sessionId,
        additionalData,
        timestamp: timestamp || new Date().toISOString(),
        reportedFromClient: true,
        clientReportTime: new Date().toISOString()
      }
    });

    console.log(`🔒 Security incident reported: ${type} - ${description}`, {
      severity,
      userEmail,
      ip: clientIP
    });

    res.status(200).json({ 
      success: true,
      message: 'Security incident reported successfully'
    });

  } catch (error) {
    console.error('Security incident reporting error:', error);
    res.status(500).json({ 
      error: 'Failed to report security incident',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default createSecureHandler(reportIncidentHandler, {
  requireAuth: false, // Allow unauthenticated reporting for security incidents
});