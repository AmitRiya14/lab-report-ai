import { supabaseAdmin } from '@/lib/supabase';

interface UsageOptions {
  operation: 'UPLOAD' | 'GENERATE' | 'EDIT';
  checkOnly?: boolean;
  reportTitle?: string;
  reportContent?: string;
}

interface UsageResult {
  success: boolean;
  error?: string;
  usage?: {
    current: number;
    limit: number;
    tier: string;
  };
}

export async function trackUsage(userEmail: string, options: UsageOptions): Promise<UsageResult> {
  try {
    // Get user from database
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, tier, reports_used, reset_date')
      .eq('email', userEmail)
      .single();

    if (fetchError || !user) {
      return { success: false, error: 'User not found' };
    }

    // Check if usage should reset
    const now = new Date();
    const resetDate = new Date(user.reset_date);
    const shouldReset = now.getMonth() !== resetDate.getMonth() || 
                       now.getFullYear() !== resetDate.getFullYear();

    const limits = { Free: 3, Basic: 15, Pro: 50, Plus: 999 };
    const userLimit = limits[user.tier as keyof typeof limits] || 3;
    const currentUsage = shouldReset ? 0 : user.reports_used;

    // Check if user has exceeded limit
    if (currentUsage >= userLimit && user.tier !== 'Plus') {
      return {
        success: false,
        error: 'Usage limit exceeded',
        usage: { current: currentUsage, limit: userLimit, tier: user.tier }
      };
    }

    // If this is just a check, return success without updating
    if (options.checkOnly) {
      return {
        success: true,
        usage: { current: currentUsage, limit: userLimit, tier: user.tier }
      };
    }

    // Update usage
    const newUsage = shouldReset ? 1 : currentUsage + 1;
    const newResetDate = shouldReset ? now.toISOString() : user.reset_date;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        reports_used: newUsage,
        reset_date: newResetDate,
        updated_at: now.toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: 'Failed to update usage' };
    }

    // Save report if provided
    if (options.reportTitle && options.reportContent) {
      await supabaseAdmin
        .from('reports')
        .insert({
          title: options.reportTitle,
          content: options.reportContent,
          user_id: user.id,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });
    }

    return {
      success: true,
      usage: { current: newUsage, limit: userLimit, tier: user.tier }
    };

  } catch (error) {
    console.error('Usage tracking error:', error);
    return { success: false, error: 'Internal server error' };
  }
}