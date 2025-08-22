// src/pages/api/reports/[id].ts - FIXED VERSION
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '@/lib/supabase';
import { createSecureHandler } from '@/lib/middleware';
import { z } from 'zod';

const updateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(10).max(100000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

async function reportHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Report ID is required' });
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

  if (req.method === 'GET') {
    // Get a specific report
    try {
      const { data: report, error: reportError } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (reportError || !report) {
        return res.status(404).json({ error: 'Report not found or access denied' });
      }

      return res.status(200).json(report);

    } catch (error) {
      console.error('Get report API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    // Update a report
    try {
      // Validate request body
      const validation = updateReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.issues
        });
      }

      const { title, content, metadata } = validation.data;

      // Check if report exists and belongs to user
      const { data: existingReport, error: checkError } = await supabaseAdmin
        .from('reports')
        .select('id, user_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (checkError || !existingReport) {
        return res.status(404).json({ error: 'Report not found or access denied' });
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (metadata !== undefined) updateData.metadata = metadata;

      // Update the report
      const { data: updatedReport, error: updateError } = await supabaseAdmin
        .from('reports')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Report update error:', updateError);
        return res.status(500).json({ error: 'Failed to update report' });
      }

      return res.status(200).json({
        id: updatedReport.id,
        title: updatedReport.title,
        updated_at: updatedReport.updated_at,
        message: 'Report updated successfully'
      });

    } catch (error) {
      console.error('Update report API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete a report
    try {
      const { error: deleteError } = await supabaseAdmin
        .from('reports')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Report delete error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete report' });
      }

      return res.status(200).json({ message: 'Report deleted successfully' });

    } catch (error) {
      console.error('Delete report API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

export default createSecureHandler(reportHandler, {
  requireAuth: true,
});