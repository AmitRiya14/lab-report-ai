// pages/api/test-supabase.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Supabase URL:', supabaseUrl);
    console.log('Service Key exists:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        envCheck: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
          SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'Set' : 'Missing'
        }
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Test 1: Simple connection test - just try to query users table
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (connectionError) {
      console.error('Connection error:', connectionError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: connectionError.message,
        code: connectionError.code,
        hint: connectionError.hint
      });
    }

    // Test 2: Check all required tables exist
    const tables = ['users', 'accounts', 'sessions', 'reports'];
    const tableChecks = [];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        tableChecks.push({
          table,
          exists: !error,
          error: error?.message || null,
          recordCount: data?.length || 0
        });
      } catch (err) {
        tableChecks.push({
          table,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Test 3: Try to create a test user (and then delete it)
    const testEmail = `test-${Date.now()}@example.com`;
    let userOperationResult = null;

    try {
      const { data: testUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: testEmail,
          name: 'Test User',
          tier: 'Free',
          reports_used: 0,
          reset_date: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        userOperationResult = { 
          success: false, 
          error: createError.message,
          operation: 'create'
        };
      } else {
        // Clean up - delete the test user
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', testUser.id);
        
        userOperationResult = { 
          success: true, 
          userId: testUser.id,
          cleanupSuccess: !deleteError,
          operations: ['create', 'delete']
        };
      }
    } catch (err) {
      userOperationResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        operation: 'create'
      };
    }

    // Test 4: Check RLS policies (optional)
    const { error: rlsError } = await supabase
      .rpc('has_table_privilege', { 
        table_name: 'users', 
        privilege: 'SELECT' 
      });

    return res.status(200).json({
      success: true,
      message: 'Supabase connection successful!',
      timestamp: new Date().toISOString(),
      tests: {
        connection: { 
          success: true, 
          recordsFound: connectionTest?.length || 0 
        },
        tables: tableChecks,
        userOperations: userOperationResult,
        rls: {
          tested: !rlsError,
          error: rlsError?.message || null
        }
      },
      environment: {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : null
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    });
  }
}