import { supabaseAdmin } from '@/lib/supabase';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export type SecurityEventType = 
  | 'FAILED_LOGIN'
  | 'SUCCESSFUL_LOGIN'
  | 'SUSPICIOUS_ACTIVITY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MALICIOUS_FILE_UPLOAD'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_BREACH_ATTEMPT'
  | 'UNUSUAL_USAGE_PATTERN'
  | 'API_ABUSE'
  | 'ACCOUNT_LOCKED'
  | 'EMERGENCY_LOCKDOWN'
  | 'VULNERABILITY_DETECTED'
  | 'SECURITY_POLICY_VIOLATION';

interface AlertConfig {
  count: number;
  timeWindow: number;
  action: 'LOCK_ACCOUNT' | 'BAN_IP' | 'IMMEDIATE_ALERT' | 'SECURITY_REVIEW';
}

interface SecurityAlert {
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  count: number;
  timeWindow: number;
  action: string;
  triggeredBy: SecurityEvent;
  timestamp: Date;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private alertThresholds: Map<SecurityEventType, AlertConfig> = new Map();
  private recentEvents: Map<string, SecurityEvent[]> = new Map();

  constructor() {
    this.setupAlertThresholds();
    this.startPeriodicAnalysis();
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  private setupAlertThresholds() {
    this.alertThresholds.set('FAILED_LOGIN', {
      count: 5,
      timeWindow: 15 * 60 * 1000,
      action: 'LOCK_ACCOUNT'
    });

    this.alertThresholds.set('RATE_LIMIT_EXCEEDED', {
      count: 3,
      timeWindow: 5 * 60 * 1000,
      action: 'BAN_IP'
    });

    this.alertThresholds.set('MALICIOUS_FILE_UPLOAD', {
      count: 1,
      timeWindow: 0,
      action: 'IMMEDIATE_ALERT'
    });

    this.alertThresholds.set('SUSPICIOUS_ACTIVITY', {
      count: 10,
      timeWindow: 60 * 60 * 1000,
      action: 'SECURITY_REVIEW'
    });
  }

  private startPeriodicAnalysis() {
    // Run security analysis every 5 minutes
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 5 * 60 * 1000);
  }

  private async performPeriodicAnalysis() {
    try {
      await this.cleanupOldEvents();
      await this.analyzeRecentPatterns();
    } catch (error) {
      console.error('Periodic analysis failed:', error);
    }
  }

  private cleanupOldEvents() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, events] of this.recentEvents.entries()) {
      const filtered = events.filter(e => 
        (e.timestamp?.getTime() || Date.now()) > oneHourAgo
      );
      if (filtered.length === 0) {
        this.recentEvents.delete(key);
      } else {
        this.recentEvents.set(key, filtered);
      }
    }
  }

  private async analyzeRecentPatterns() {
    // Analyze patterns across all tracked identifiers
    for (const [identifier, events] of this.recentEvents.entries()) {
      if (events.length >= 5) {
        await this.detectSuspiciousPatterns(identifier, events);
      }
    }
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in database
      await supabaseAdmin
        .from('security_logs')
        .insert({
          event_type: event.type,
          user_id: event.userId,
          email: event.email,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          metadata: event.metadata || {},
          created_at: (event.timestamp || new Date()).toISOString()
        });

      // Real-time analysis
      await this.analyzeEvent(event);
      await this.checkForPatterns(event);
      await this.evaluateAlerts(event);

      console.log(`Security event logged: ${event.type}`, {
        severity: event.severity,
        userId: event.userId,
        ip: event.ipAddress
      });

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private async analyzeEvent(event: SecurityEvent): Promise<void> {
    switch (event.type) {
      case 'MALICIOUS_FILE_UPLOAD':
        await this.handleMaliciousUpload(event);
        break;
      case 'FAILED_LOGIN':
        await this.handleFailedLogin(event);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        await this.handleRateLimit(event);
        break;
    }
  }

  private async checkForPatterns(event: SecurityEvent): Promise<void> {
    const key = event.ipAddress || event.email || event.userId || 'unknown';
    
    if (!this.recentEvents.has(key)) {
      this.recentEvents.set(key, []);
    }
    
    const events = this.recentEvents.get(key)!;
    events.push(event);
    
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEvents = events.filter(e => 
      (e.timestamp?.getTime() || Date.now()) > oneHourAgo
    );
    this.recentEvents.set(key, recentEvents);

    await this.detectSuspiciousPatterns(key, recentEvents);
  }

  private async detectSuspiciousPatterns(
    identifier: string, 
    events: SecurityEvent[]
  ): Promise<void> {
    // Rapid sequential attempts
    const rapidAttempts = events.filter(e => 
      ['FAILED_LOGIN', 'RATE_LIMIT_EXCEEDED'].includes(e.type)
    );
    
    if (rapidAttempts.length >= 10) {
      await this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        ipAddress: events[0].ipAddress,
        metadata: {
          pattern: 'RAPID_ATTEMPTS',
          count: rapidAttempts.length,
          identifier
        }
      });
    }

    // Multiple user enumeration
    const uniqueEmails = new Set(events.map(e => e.email).filter(Boolean));
    if (uniqueEmails.size >= 5) {
      await this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        ipAddress: events[0].ipAddress,
        metadata: {
          pattern: 'USER_ENUMERATION',
          uniqueAccounts: uniqueEmails.size,
          identifier
        }
      });
    }
  }

  private async evaluateAlerts(event: SecurityEvent): Promise<void> {
    const config = this.alertThresholds.get(event.type);
    if (!config) return;

    const recentCount = await this.getRecentEventCount(event.type, config.timeWindow);
    
    if (recentCount >= config.count) {
      await this.triggerAlert(event, config, recentCount);
    }
  }

  private async getRecentEventCount(
    eventType: SecurityEventType, 
    timeWindow: number
  ): Promise<number> {
    const since = new Date(Date.now() - timeWindow);
    
    const { count } = await supabaseAdmin
      .from('security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('created_at', since.toISOString());
    
    return count || 0;
  }

  private async triggerAlert(
    event: SecurityEvent, 
    config: AlertConfig, 
    count: number
  ): Promise<void> {
    const alert: SecurityAlert = {
      type: event.type,
      severity: event.severity,
      count,
      timeWindow: config.timeWindow,
      action: config.action,
      triggeredBy: event,
      timestamp: new Date()
    };

    console.error('🚨 SECURITY ALERT TRIGGERED:', alert);

    // Store alert in database
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: 'SECURITY_ALERT',
        metadata: {
          alert_type: alert.type,
          severity: alert.severity,
          event_count: alert.count,
          action_taken: alert.action,
          triggered_by: alert.triggeredBy
        },
        created_at: alert.timestamp.toISOString()
      });

    await this.executeAlertAction(alert);
    await this.sendSecurityNotification(alert);
  }

  private async executeAlertAction(alert: SecurityAlert): Promise<void> {
    switch (alert.action) {
      case 'LOCK_ACCOUNT':
        if (alert.triggeredBy.email) {
          await this.lockUserAccount(alert.triggeredBy.email);
        }
        break;
      case 'BAN_IP':
        if (alert.triggeredBy.ipAddress) {
          await this.banIPAddress(alert.triggeredBy.ipAddress);
        }
        break;
    }
  }

  private async lockUserAccount(email: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('users')
        .update({
          is_active: false,
          locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      console.log(`Account locked: ${email}`);
    } catch (error) {
      console.error('Failed to lock account:', error);
    }
  }

  private async banIPAddress(ipAddress: string): Promise<void> {
    try {
      // Log the ban in security_logs for now
      await supabaseAdmin
        .from('security_logs')
        .insert({
          event_type: 'IP_BANNED',
          ip_address: ipAddress,
          metadata: {
            banned_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            reason: 'Automated ban due to suspicious activity'
          },
          created_at: new Date().toISOString()
        });

      console.log(`IP banned: ${ipAddress}`);
    } catch (error) {
      console.error('Failed to ban IP:', error);
    }
  }

  private async sendSecurityNotification(alert: SecurityAlert): Promise<void> {
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      console.error('🚨 HIGH PRIORITY SECURITY ALERT:', {
        type: alert.type,
        severity: alert.severity,
        count: alert.count,
        user: alert.triggeredBy.email,
        ip: alert.triggeredBy.ipAddress
      });
    }
  }

  private async handleMaliciousUpload(event: SecurityEvent): Promise<void> {
    if (event.userId && event.email) {
      await this.lockUserAccount(event.email);
    }
    
    if (event.ipAddress) {
      await this.banIPAddress(event.ipAddress);
    }
  }

  private async handleFailedLogin(event: SecurityEvent): Promise<void> {
    if (event.email) {
      try {
        await supabaseAdmin.rpc('log_failed_login', {
          p_email: event.email,
          p_ip: event.ipAddress || '0.0.0.0'
        });
      } catch (error) {
        console.error('Failed to log failed login:', error);
      }
    }
  }

  private async handleRateLimit(event: SecurityEvent): Promise<void> {
    const recentViolations = await this.getRecentEventCount(
      'RATE_LIMIT_EXCEEDED', 
      60 * 60 * 1000
    );

    if (recentViolations >= 5 && event.ipAddress) {
      await this.banIPAddress(event.ipAddress);
    }
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();