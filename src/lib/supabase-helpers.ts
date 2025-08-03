// lib/supabase-helpers.ts
import { supabaseAdmin, User, Report } from './supabase';
import { getCachedUser, cacheUser, getCachedUsage, setCachedUsage } from './redis';

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  // Try cache first
  const cached = await getCachedUser(email);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  // Cache the result
  await cacheUser(email, data);
  return data as User;
};

export const updateUserUsage = async (
  userId: string, 
  reportsUsed: number, 
  resetDate?: string
) => {
  const updateData: any = { reports_used: reportsUsed };
  if (resetDate) updateData.reset_date = resetDate;

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
};

export const createUser = async (userData: {
  email: string;
  name?: string;
  image?: string;
}) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      ...userData,
      tier: 'Free',
      reports_used: 0,
      reset_date: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
};

// Report operations
export const createReport = async (reportData: {
  title: string;
  content: string;
  user_id: string;
}) => {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .insert({
      ...reportData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
};

export const getReportsByUserId = async (userId: string): Promise<Report[]> => {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }

  return data as Report[];
};

export const deleteReport = async (reportId: string, userId: string) => {
  const { error } = await supabaseAdmin
    .from('reports')
    .delete()
    .eq('id', reportId)
    .eq('user_id', userId); // Ensure user can only delete their own reports

  return { error };
};

// Usage tracking with caching
export const trackUsage = async (
  userEmail: string,
  reportTitle?: string,
  reportContent?: string
) => {
  try {
    const user = await getUserByEmail(userEmail);
    if (!user) throw new Error('User not found');

    // Check usage limits
    const now = new Date();
    const resetDate = new Date(user.reset_date);
    const shouldReset = now.getMonth() !== resetDate.getMonth() || 
                       now.getFullYear() !== resetDate.getFullYear();

    const limits = { Free: 3, Basic: 15, Pro: 50, Plus: 999 };
    const userLimit = limits[user.tier as keyof typeof limits] || 3;
    const currentUsage = shouldReset ? 0 : user.reports_used;

    if (currentUsage >= userLimit && user.tier !== 'Plus') {
      return {
        success: false,
        error: 'Usage limit exceeded',
        currentUsage,
        limit: userLimit,
        tier: user.tier
      };
    }

    // Update usage
    const newUsage = shouldReset ? 1 : currentUsage + 1;
    const newResetDate = shouldReset ? now.toISOString() : user.reset_date;

    const { error: updateError } = await updateUserUsage(
      user.id, 
      newUsage, 
      newResetDate
    );

    if (updateError) throw updateError;

    // Create report if data provided
    if (reportTitle && reportContent) {
      await createReport({
        title: reportTitle,
        content: reportContent,
        user_id: user.id
      });
    }

    // Update caches
    const updatedUser = { ...user, reports_used: newUsage, reset_date: newResetDate };
    await cacheUser(userEmail, updatedUser);
    await setCachedUsage(user.id, {
      current: newUsage,
      limit: userLimit,
      tier: user.tier
    });

    return {
      success: true,
      usage: {
        current: newUsage,
        limit: userLimit,
        tier: user.tier
      }
    };

  } catch (error) {
    console.error('Usage tracking error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
};

// Get usage info with caching
export const getUsageInfo = async (userId: string) => {
  // Try cache first
  const cached = await getCachedUsage(userId);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('tier, reports_used, reset_date')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const limits = { Free: 3, Basic: 15, Pro: 50, Plus: 999 };
  const limit = limits[data.tier as keyof typeof limits] || 3;

  const now = new Date();
  const resetDate = new Date(data.reset_date);
  const shouldReset = now.getMonth() !== resetDate.getMonth() || 
                     now.getFullYear() !== resetDate.getFullYear();

  const usageInfo = {
    current: shouldReset ? 0 : data.reports_used,
    limit,
    tier: data.tier
  };

  // Cache the result
  await setCachedUsage(userId, usageInfo);
  return usageInfo;
};