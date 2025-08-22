// src/pages/api/reports/list.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '@/lib/supabase';
import { createSecureHandler } from '@/lib/middleware';

interface ReportMetadata {
  id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  has_chart: boolean;
  file_types: string[];
}

async function reportsListHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get query parameters for pagination
    const { limit = '10', offset = '0', recent = 'false' } = req.query;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const isRecentOnly = recent === 'true';

    // Get user ID first
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build query for reports
    let query = supabaseAdmin
      .from('reports')
      .select('id, title, content, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply pagination
    if (isRecentOnly) {
      query = query.limit(3); // Only 3 most recent for sidebar
    } else {
      query = query.range(offsetNum, offsetNum + limitNum - 1);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error('Reports fetch error:', reportsError);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Reports count error:', countError);
    }

    // Transform reports to metadata format
    const reportsMetadata: ReportMetadata[] = (reports || []).map(report => {
      const content = report.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const preview = content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
      
      // Check if report has charts (basic detection)
      const hasChart = content.includes('chart') || content.includes('graph') || content.includes('Figure');
      
      // Extract file types from content (basic detection)
      const fileTypes: string[] = [];
      if (content.includes('Excel') || content.includes('xlsx')) fileTypes.push('Excel');
      if (content.includes('PDF')) fileTypes.push('PDF');
      if (content.includes('data')) fileTypes.push('Data');

      return {
        id: report.id,
        title: report.title || `Lab Report ${new Date(report.created_at).toLocaleDateString()}`,
        preview,
        created_at: report.created_at,
        updated_at: report.updated_at,
        word_count: wordCount,
        has_chart: hasChart,
        file_types: fileTypes
      };
    });

    return res.status(200).json({
      reports: reportsMetadata,
      total: count || 0,
      hasMore: (count || 0) > (offsetNum + limitNum)
    });

  } catch (error) {
    console.error('Reports list API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default createSecureHandler(reportsListHandler, {
  requireAuth: true,
});