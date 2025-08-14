// ========================================
// src/lib/security/audit-logger.ts
// ========================================

import { supabaseAdmin } from '@/lib/supabase';

export interface AuditEvent {
  action: string;
  resource: string;
  userId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  timestamp?: Date;
}

export class AuditLogger {
  /**
   * Log security-sensitive actions
   */
  static async logAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          event_type: `AUDIT_${event.action.toUpperCase()}`,
          user_id: event.userId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          metadata: {
            action: event.action,
            resource: event.resource,
            success: event.success,
            details: event.details || {},
            timestamp: (event.timestamp || new Date()).toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failures shouldn't break the main flow
    }
  }

  /**
   * Log file access
   */
  static async logFileAccess(
    userId: string,
    fileName: string,
    action: 'upload' | 'download' | 'delete',
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    await this.logAuditEvent({
      action: `FILE_${action.toUpperCase()}`,
      resource: fileName,
      userId,
      success,
      ipAddress,
      details: { fileName, fileAction: action }
    });
  }

  /**
   * Log report generation
   */
  static async logReportGeneration(
    userId: string,
    reportTitle: string,
    success: boolean,
    processingTime?: number,
    ipAddress?: string
  ): Promise<void> {
    await this.logAuditEvent({
      action: 'REPORT_GENERATION',
      resource: reportTitle,
      userId,
      success,
      ipAddress,
      details: { 
        reportTitle, 
        processingTime,
        generationMethod: 'AI'
      }
    });
  }

  /**
   * Log payment events
   */
  static async logPaymentEvent(
    userId: string,
    action: 'subscription_created' | 'subscription_updated' | 'payment_failed',
    amount?: number,
    planType?: string,
    success: boolean = true
  ): Promise<void> {
    await this.logAuditEvent({
      action: `PAYMENT_${action.toUpperCase()}`,
      resource: `subscription_${planType}`,
      userId,
      success,
      details: { 
        amount,
        planType,
        paymentAction: action
      }
    });
  }

  /**
   * Log admin actions
   */
  static async logAdminAction(
    adminUserId: string,
    action: string,
    targetResource: string,
    targetUserId?: string,
    success: boolean = true,
    ipAddress?: string
  ): Promise<void> {
    await this.logAuditEvent({
      action: `ADMIN_${action.toUpperCase()}`,
      resource: targetResource,
      userId: adminUserId,
      success,
      ipAddress,
      details: {
        targetUserId,
        adminAction: action,
        targetResource
      }
    });
  }
}