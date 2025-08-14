// ========================================
// src/lib/security/session-security.ts
// ========================================

import { NextApiRequest } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { securityMonitor } from './monitoring';

export class SessionSecurity {
  /**
   * Detect session hijacking attempts
   */
  static async detectSessionAnomaly(
    userId: string,
    sessionId: string,
    req: NextApiRequest
  ): Promise<{ isAnomalous: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    
    try {
      // Get session data
      const { data: session } = await supabaseAdmin
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .single();

      if (!session) {
        reasons.push('SESSION_NOT_FOUND');
        return { isAnomalous: true, reasons };
      }

      // Check for rapid IP changes
      const currentIP = this.getClientIP(req);
      const { data: recentSessions } = await supabaseAdmin
        .from('security_logs')
        .select('ip_address, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'SUCCESSFUL_LOGIN')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentSessions && recentSessions.length > 0) {
        const uniqueIPs = new Set(recentSessions.map(s => s.ip_address));
        if (uniqueIPs.size > 3) {
          reasons.push('MULTIPLE_IP_ADDRESSES');
        }
        
        // Check for geographically impossible travel
        if (this.detectImpossibleTravel(recentSessions)) {
          reasons.push('IMPOSSIBLE_TRAVEL');
        }
      }

      // Check User-Agent consistency
      const currentUserAgent = req.headers['user-agent'] || '';
      const { data: recentUserAgents } = await supabaseAdmin
        .from('security_logs')
        .select('user_agent')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (recentUserAgents && recentUserAgents.length > 0) {
        const agents = recentUserAgents.map(r => r.user_agent).filter(Boolean);
        if (agents.length > 0 && !agents.includes(currentUserAgent)) {
          reasons.push('USER_AGENT_MISMATCH');
        }
      }

      // Check session duration
      const sessionAge = Date.now() - new Date(session.created_at).getTime();
      if (sessionAge > 8 * 60 * 60 * 1000) { // 8 hours
        reasons.push('SESSION_TOO_OLD');
      }

      return { isAnomalous: reasons.length > 0, reasons };
    } catch (error) {
      console.error('Session anomaly detection error:', error);
      return { isAnomalous: false, reasons: [] };
    }
  }

  /**
   * Invalidate all user sessions
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    await supabaseAdmin
      .from('user_sessions')
      .update({ 
        is_active: false, 
        ended_at: new Date().toISOString() 
      })
      .eq('user_id', userId);
  }

  /**
   * Check for concurrent session limit
   */
  static async enforceConcurrentSessionLimit(userId: string, limit: number = 3): Promise<void> {
    const { data: activeSessions } = await supabaseAdmin
      .from('user_sessions')
      .select('session_id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (activeSessions && activeSessions.length > limit) {
      // Deactivate oldest sessions
      const sessionsToDeactivate = activeSessions.slice(limit);
      const sessionIds = sessionsToDeactivate.map(s => s.session_id);
      
      await supabaseAdmin
        .from('user_sessions')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .in('session_id', sessionIds);

      await securityMonitor.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        userId,
        metadata: {
          reason: 'CONCURRENT_SESSION_LIMIT_EXCEEDED',
          deactivatedSessions: sessionIds.length,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private static getClientIP(req: NextApiRequest): string {
    return (req.headers['x-forwarded-for'] as string) ||
           (req.headers['x-real-ip'] as string) ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  private static detectImpossibleTravel(sessions: any[]): boolean {
    // Simple implementation - in production, use proper geolocation
    // This would require a geolocation service to determine if travel
    // between IP addresses is physically impossible in the time frame
    return false; // Placeholder
  }
}
