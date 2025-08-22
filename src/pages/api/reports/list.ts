// src/pages/api/reports/list.ts - FIXED VERSION with better rate limiting
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '@/lib/supabase';
import { createSecureHandler } from '@/lib/middleware';
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';

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

    // Validate pagination parameters
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-50)' });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter' });
    }

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

    // Get total count for pagination (only if not recent-only request)
    let totalCount = 0;
    if (!isRecentOnly) {
      const { count, error: countError } = await supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Reports count error:', countError);
      } else {
        totalCount = count || 0;
      }
    }

    // Transform reports to metadata format
    const reportsMetadata: ReportMetadata[] = (reports || []).map(report => {
      const content = report.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      // Create safe preview by removing HTML and truncating
      const textContent = content.replace(/<[^>]*>/g, '');
      const preview = textContent.length > 150 
        ? textContent.substring(0, 150) + '...'
        : textContent || 'No content available';
      
      // Check if report has charts (basic detection)
      const hasChart = content.toLowerCase().includes('chart') || 
                       content.toLowerCase().includes('graph') || 
                       content.toLowerCase().includes('figure') ||
                       content.includes('<canvas') ||
                       content.includes('chartSpec');
      
      // Extract file types from content (basic detection)
      const fileTypes: string[] = [];
      if (content.toLowerCase().includes('excel') || content.toLowerCase().includes('xlsx')) {
        fileTypes.push('Excel');
      }
      if (content.toLowerCase().includes('pdf')) {
        fileTypes.push('PDF');
      }
      if (content.toLowerCase().includes('data')) {
        fileTypes.push('Data');
      }
      if (fileTypes.length === 0) {
        fileTypes.push('Text');
      }

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
      total: isRecentOnly ? reportsMetadata.length : totalCount,
      hasMore: isRecentOnly ? false : (totalCount > (offsetNum + limitNum))
    });

  } catch (error) {
    console.error('Reports list API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply rate limiting specifically for reports API
const rateLimitedHandler = withRateLimit(
  RATE_LIMITS.REPORTS.requests,
  RATE_LIMITS.REPORTS.windowMs,
  {
    keyGenerator: (req) => {
      // Use user-specific rate limiting for reports
      const userEmail = req.headers['x-user-email'] as string;
      const ip = req.headers['x-forwarded-for'] as string || 
                 req.headers['x-real-ip'] as string ||
                 req.socket.remoteAddress;
      return userEmail ? `reports:user:${userEmail}` : `reports:ip:${ip}`;
    },
  }
)(reportsListHandler);

export default createSecureHandler(rateLimitedHandler, {
  requireAuth: true,
});