import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import formidable from "formidable";
import fs from "fs";
import { parseLabManual } from "@/lib/parser";
import { processExcelFile, ChartSpec } from "@/lib/excel";
import { claudeService } from "@/lib/server/claude-server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSecureHandler } from '@/lib/middleware';
import { FileValidator } from '@/lib/security/fileValidation';
import { withRateLimit, RATE_LIMITS, withDDoSProtection } from "@/lib/middleware/rateLimit";
import { trackUsage } from "@/lib/server/usage-tracking";
import { securityMonitor, checkUserSecurity } from '@/lib/security/monitoring'; // ✅ Enhanced import

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Strip markdown formatting from text for clean display
 */
function stripMarkdownSync(text: string): string {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^>\s+(.+)$/gm, '$1')
    .replace(/^[\s]*[-*+]\s+(.+)$/gm, '• $1')
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1')
    .replace(/\|/g, '')
    .replace(/^[-\s:]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Save report to Supabase and return the report ID
 */
async function saveReport(userEmail: string, title: string, content: string): Promise<string | null> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (user) {
      const { data: newReport, error } = await supabaseAdmin
        .from('reports')
        .insert({
          title,
          content,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Save report error:', error);
        return null;
      }

      return newReport?.id || null;
    }
  } catch (error) {
    console.error('Save report error:', error);
    return null;
  }
  return null;
}

/**
 * Generate rubric using Claude
 */
async function generateRubricFromManual(manualText: string, rawData: string): Promise<string> {
  const prompt = `Create a point-based grading rubric for a university lab report. Format as a clean, structured list with specific requirements and point values.

Based on this lab content, generate a rubric that lists:
- Each required section (Title, Abstract, Introduction, etc.)
- Specific requirements for each section
- Point values that add up to 100 points total

Format example:
**Title Page (5 points)**
- Clear, descriptive title
- Student name and ID
- Date and lab section

**Abstract (15 points)**
- Concise summary of experiment
- Key findings mentioned
- Word limit: 150-200 words

LAB CONTENT:
${manualText}

DATA SUMMARY:
${rawData}

Generate a clear, point-based rubric:`;

  try {
    const rawRubric = await claudeService.generateReport(prompt, 1200);
    return stripMarkdownSync(rawRubric || "Rubric generation failed.");
  } catch (error) {
    console.error('Rubric generation error:', error);
    return "Error generating rubric. Please try again.";
  }
}

/**
 * Generate report title using Claude
 */
async function generateReportTitle(manualText: string, reportContent: string): Promise<string> {
  const prompt = `You are an academic writing assistant. Based on the following lab report content, generate a clear, professional, and specific title that accurately reflects the experiment or research described.

Requirements:
- Format: "Lab Report: [Specific Experiment/Topic Name]"
- Be specific about the actual experiment or topic
- Use proper scientific terminology
- Keep it concise but descriptive
- Make it suitable for academic submission

${manualText ? `Lab Manual Context:\n${manualText.substring(0, 500)}\n\n` : ''}

Report Content:
${reportContent.substring(0, 1500)}

Generate only the title, nothing else:`;

  try {
    const rawTitle = await claudeService.generateReport(prompt, 100);
    const title = rawTitle?.trim() || "Lab Report: Experiment Analysis";
    
    // Clean up the title and ensure proper format
    let cleanTitle = title.replace(/^["']|["']$/g, ''); // Remove quotes
    if (!cleanTitle.startsWith('Lab Report:')) {
      cleanTitle = `Lab Report: ${cleanTitle}`;
    }
    
    return cleanTitle;
  } catch (error) {
    console.error('Title generation error:', error);
    return "Lab Report: Experiment Analysis";
  }
}

function getClientIP(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string) ||
         (req.headers['x-real-ip'] as string) ||
         req.socket.remoteAddress ||
         'unknown';
}

async function uploadHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Upload API called');

    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No authenticated session');
      
      // ✅ LOG UNAUTHORIZED ACCESS ATTEMPT
      await securityMonitor.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'MEDIUM',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] as string,
        metadata: {
          endpoint: '/api/upload',
          attemptedAction: 'file_upload',
          timestamp: new Date().toISOString()
        }
      });
      
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please sign in to generate lab reports'
      });
    }

    console.log('✅ Authenticated user:', session.user.email);
    req.headers['x-user-id'] = session.user.email;

    // 🔒 NEW: Enhanced security checks
    const userEmail = session.user.email;
    const clientIP = getClientIP(req);

    // Check if account is locked or inactive
    const userSecurity = await checkUserSecurity(userEmail);
    
    if (!userSecurity.isActive || userSecurity.isLocked) {
      console.log('❌ Account security check failed:', userSecurity);
      
      await securityMonitor.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        email: userEmail,
        ipAddress: clientIP,
        userAgent: req.headers['user-agent'] as string,
        metadata: {
          reason: userSecurity.isLocked ? 'ACCOUNT_LOCKED' : 'ACCOUNT_INACTIVE',
          lockReason: userSecurity.lockReason,
          lockUntil: userSecurity.lockUntil,
          endpoint: '/api/upload',
          timestamp: new Date().toISOString()
        }
      });
      
      return res.status(403).json({ 
        error: 'Account suspended',
        message: userSecurity.lockReason || 'Your account has been temporarily suspended. Contact support.',
        contactSupport: true
      });
    }

    // 🔒 NEW: Check for excessive recent uploads (additional rate limiting)
    const recentUploads = await supabaseAdmin
      .from('security_logs')
      .select('created_at')
      .eq('email', userEmail)
      .contains('metadata', { action: 'report_generated' })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentUploads.data && recentUploads.data.length >= 5) {
      console.log('❌ User upload rate limit exceeded:', userEmail);
      
      await securityMonitor.logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        email: userEmail,
        ipAddress: clientIP,
        metadata: {
          reason: 'USER_UPLOAD_RATE_LIMIT',
          recentUploads: recentUploads.data.length,
          timeWindow: '1 hour',
          endpoint: '/api/upload',
          timestamp: new Date().toISOString()
        }
      });

      return res.status(429).json({
        error: 'Upload rate limit exceeded',
        message: 'You are uploading files too frequently. Please wait before trying again.',
        retryAfter: 3600 // 1 hour
      });
    }

    // Check usage limits using the existing tracking service
    const usageCheck = await trackUsage(session.user.email, {
      operation: 'UPLOAD',
      checkOnly: true
    });
    
    if (!usageCheck.success) {
      console.log('❌ Usage check failed:', usageCheck.error);
      if (usageCheck.error === 'Usage limit exceeded') {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          message: `You've reached your monthly limit of ${usageCheck.usage?.limit} reports. Upgrade your plan to generate more reports.`,
          usage: usageCheck.usage
        });
      } else {
        return res.status(500).json({ error: usageCheck.error });
      }
    }

    console.log('✅ Security checks passed, usage verified:', usageCheck.usage);

    // Process files
    const form = formidable({ 
      multiples: true, 
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB limit
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('File parsing error:', err);
        return res.status(500).json({ error: "Error parsing files" });
      }

      const rawFiles = files["files"];
      if (!rawFiles) {
        console.error("No files received under field name 'files'");
        return res.status(400).json({ error: "No uploaded files found" });
      }

      const uploadedFiles = Array.isArray(rawFiles) ? rawFiles : [rawFiles];
      console.log('📁 Processing', uploadedFiles.length, 'files');

      let manualText = "";
      let rawDataText = "";
      let chartSpec: ChartSpec | null = null;

      // Validate each uploaded file
      for (const file of uploadedFiles) {
        if (!file?.filepath) continue;
        
        const fileBuffer = fs.readFileSync(file.filepath);
        const validation = await FileValidator.validateFile({
          name: file.originalFilename || 'unknown',
          buffer: fileBuffer,
          mimetype: file.mimetype || 'application/octet-stream',
          size: file.size || 0
        });
        
        if (!validation.isValid) {
          console.error('File validation failed:', validation.errors);
          
          // ✅ LOG MALICIOUS FILE UPLOAD ATTEMPT
          await securityMonitor.logSecurityEvent({
            type: 'MALICIOUS_FILE_UPLOAD',
            severity: 'CRITICAL',
            userId: session.user.id,
            email: session.user.email,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'] as string,
            metadata: {
              filename: file.originalFilename,
              errors: validation.errors,
              fileHash: FileValidator.generateFileHash(fileBuffer),
              fileSize: file.size,
              mimetype: file.mimetype,
              timestamp: new Date().toISOString()
            }
          });
          
          return res.status(400).json({
            error: 'File validation failed',
            details: validation.errors
          });
        }
      }

      // Process uploaded files
      for (const file of uploadedFiles) {
        if (!file?.filepath) {
          console.warn("Missing file path:", file);
          continue;
        }

        try {
          if (file.originalFilename?.match(/\.pdf$/i)) {
            console.log('📄 Processing PDF:', file.originalFilename);
            const fileBuffer = fs.readFileSync(file.filepath);
            manualText += await parseLabManual(fileBuffer);
          } else if (file.originalFilename?.match(/\.xlsx$/i)) {
            console.log('📊 Processing Excel:', file.originalFilename);
            const result = await processExcelFile(file.filepath);
            rawDataText += result.summary;
            chartSpec = result.chartSpec;
          }
        } catch (fileError) {
          console.error('Error processing file:', file.originalFilename, fileError);
          // Continue with other files
        }
      }

      if (!manualText && !rawDataText) {
        return res.status(400).json({ 
          error: "No processable content found",
          message: "Please upload at least one PDF or Excel file with valid content."
        });
      }

      console.log('📝 Manual text length:', manualText.length);
      console.log('📊 Raw data length:', rawDataText.length);

      try {
        // Generate content
        const fullPrompt = `You are a scientific writer creating a comprehensive university-level lab report. 

Generate a complete lab report with these sections:
1. **Title** - Descriptive and scientific
2. **Abstract** - 150-200 words summarizing experiment, methods, key findings
3. **Introduction** - Background theory, relevant literature, clear hypothesis
4. **Methods** - Detailed experimental procedure (reference lab manual)
5. **Results** - Data presentation with figures/tables, statistical analysis, clear trends
6. **Discussion** - Interpretation of results, comparison to literature, limitations
7. **Conclusion** - Summary of key findings and implications
8. **References** - Proper scientific citations

Requirements:
- Use formal academic language
- Include specific data and measurements
- Show statistical analysis (t-tests, p-values, error bars)
- Reference relevant literature
- Write 2000-3000 words total

Lab Manual:
${manualText}

Experimental Data:
${rawDataText}

Generate a complete, professional lab report:`;

        const [rubric, report] = await Promise.all([
          generateRubricFromManual(manualText, rawDataText),
          claudeService.generateReport(fullPrompt, 4000)
        ]);

        if (!report || report.length < 100) {
          console.error("⚠️ Empty or invalid report:", report);
          return res.status(500).json({ error: "Failed to generate report content" });
        }

        // Generate title
        const generatedTitle = await generateReportTitle(manualText, report);
        console.log("🎯 Generated title:", generatedTitle);

        // Extract ChartSpec from report if present
        let extractedChartSpec = null;
        const chartJsonMatch = report?.match(/```json\s*([\s\S]*?)```/);
        if (chartJsonMatch) {
          try {
            extractedChartSpec = JSON.parse(chartJsonMatch[1]);
            console.log("✅ Extracted chartSpec from Claude response");
          } catch {
            console.warn("⚠️ Failed to parse chartSpec from Claude");
          }
        }

        const cleanedReport = report.replace(/```json\s*[\s\S]*?```/, "").trim();

        // Update usage after successful generation
        await trackUsage(session.user.email, {
          operation: 'UPLOAD',
          reportTitle: generatedTitle,
          reportContent: cleanedReport
        });

        // Save report to database and get the report ID
        const reportId = await saveReport(session.user.email, generatedTitle, cleanedReport);

        // ✅ LOG SUCCESSFUL REPORT GENERATION
        await securityMonitor.logSecurityEvent({
          type: 'SUCCESSFUL_LOGIN', // Using this as closest match for successful operation
          severity: 'LOW',
          userId: session.user.id,
          email: session.user.email,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] as string,
          metadata: {
            action: 'report_generated',
            reportTitle: generatedTitle,
            reportLength: cleanedReport.length,
            filesProcessed: uploadedFiles.length,
            securityChecksPass: true, // 🔒 NEW: Indicate security checks passed
            reportId: reportId, // Include the report ID for tracking
            timestamp: new Date().toISOString()
          }
        });

        console.log('✅ Upload API completed successfully');

        return res.status(200).json({
          labReport: cleanedReport,
          chartSpec: extractedChartSpec || chartSpec,
          rubric,
          title: generatedTitle,
          usage: usageCheck.usage,
          reportId: reportId // ✅ NEW: Include report ID in response
        });

      } catch (generationError) {
        console.error('Content generation error:', generationError);
        
        // ✅ LOG API ABUSE OR UNUSUAL PATTERN
        await securityMonitor.logSecurityEvent({
          type: 'API_ABUSE',
          severity: 'MEDIUM',
          userId: session.user.id,
          email: session.user.email,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] as string,
          metadata: {
            error: generationError instanceof Error ? generationError.message : 'Unknown error',
            endpoint: '/api/upload',
            timestamp: new Date().toISOString()
          }
        });
        
        return res.status(500).json({ 
          error: 'Failed to generate report content',
          message: 'There was an error processing your files. Please try again.'
        });
      }
    });

  } catch (error) {
    console.error('💥 Upload API error:', error);

    // 🔒 NEW: Log system-level errors for security monitoring
    let session: any = null;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch {}

    if (session?.user?.email) {
      await securityMonitor.logSecurityEvent({
        type: 'API_ABUSE',
        severity: 'HIGH',
        email: session.user.email,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] as string,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown system error',
          endpoint: '/api/upload',
          errorType: 'SYSTEM_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
}

// Apply advanced rate limiting and DDoS protection
const rateLimitedHandler = withDDoSProtection()(
  withRateLimit(
    RATE_LIMITS.UPLOAD.requests,
    RATE_LIMITS.UPLOAD.windowMs,
    {
      keyGenerator: (req) => {
        const userId = req.headers['x-user-id'] as string;
        const ip = req.headers['x-forwarded-for'] as string || 
                 req.headers['x-real-ip'] as string ||
                 req.socket.remoteAddress;
        return userId ? `upload:user:${userId}` : `upload:ip:${ip}`;
      },
      onLimitReached: (req, res) => {
        console.warn(`Upload rate limit exceeded`);
        res.status(429).json({
          error: 'Usage limit exceeded',
          message: 'You are uploading files too frequently. Please wait 15 minutes.',
          retryAfter: 900
        });
      }
    }
  )(uploadHandler)
);

export default createSecureHandler(rateLimitedHandler, {
  requireAuth: true,
});