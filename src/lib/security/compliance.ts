// ========================================
// src/lib/security/compliance.ts
// ========================================

import { supabaseAdmin } from '../supabase'; // Adjust the path as needed

export class ComplianceManager {
  /**
   * GDPR Data Export
   */
  static async exportUserData(userId: string): Promise<any> {
    try {
      // Export all user data for GDPR compliance
      const [user, reports, sessions, logs] = await Promise.all([
        supabaseAdmin.from('users').select('*').eq('id', userId).single(),
        supabaseAdmin.from('reports').select('*').eq('user_id', userId),
        supabaseAdmin.from('user_sessions').select('*').eq('user_id', userId),
        supabaseAdmin.from('security_logs').select('*').eq('user_id', userId)
      ]);

      return {
        user_profile: user.data,
        reports: reports.data || [],
        sessions: sessions.data || [],
        security_logs: logs.data || [],
        export_date: new Date().toISOString(),
        data_retention_policy: '90 days for logs, indefinite for user content'
      };
    } catch (error) {
      console.error('Data export error:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * GDPR Data Deletion
   */
  static async deleteUserData(userId: string, keepLogs: boolean = true): Promise<void> {
    try {
      // Delete user data while preserving security logs if required
      await Promise.all([
        supabaseAdmin.from('reports').delete().eq('user_id', userId),
        supabaseAdmin.from('user_sessions').delete().eq('user_id', userId),
        ...(keepLogs ? [] : [supabaseAdmin.from('security_logs').delete().eq('user_id', userId)]),
        supabaseAdmin.from('users').delete().eq('id', userId)
      ]);

      // Log the deletion
      await AuditLogger.logAuditEvent({
        action: 'GDPR_DELETION',
        resource: `user_${userId}`,
        userId,
        success: true,
        details: { 
          keepLogs,
          deletionReason: 'GDPR_REQUEST'
        }
      });
    } catch (error) {
      console.error('Data deletion error:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Data Retention Cleanup
   */
  static async cleanupExpiredData(): Promise<void> {
    try {
      const retentionPeriod = 90; // days
      const cutoffDate = new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000);

      // Clean up old security logs
      await supabaseAdmin
        .from('security_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      // Clean up old inactive sessions
      await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('is_active', false)
        .lt('ended_at', cutoffDate.toISOString());

      console.log(`Data retention cleanup completed for data older than ${retentionPeriod} days`);
    } catch (error) {
      console.error('Data retention cleanup error:', error);
    }
  }
}