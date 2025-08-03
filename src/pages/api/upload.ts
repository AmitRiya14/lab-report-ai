import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import formidable from "formidable";
import fs from "fs";
import { parseLabManual } from "@/lib/parser";
import { processExcelFile, ChartSpec } from "@/lib/excel";
import { generateLabReport } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";

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
 * Check and update user usage limits using Supabase
 */
async function checkAndUpdateUsage(userEmail: string): Promise<{
  success: boolean;
  error?: string;
  usage?: {
    current: number;
    limit: number;
    tier: string;
  };
}> {
  try {
    // Get user from Supabase
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, tier, reports_used, reset_date')
      .eq('email', userEmail)
      .single();

    if (fetchError || !user) {
      console.error('User fetch error:', fetchError);
      return { success: false, error: 'User not found' };
    }

    // Check if usage should reset (monthly reset)
    const now = new Date();
    const resetDate = new Date(user.reset_date);
    const shouldReset = now.getMonth() !== resetDate.getMonth() || 
                       now.getFullYear() !== resetDate.getFullYear();

    // Get tier limits
    const limits = {
      Free: 3,
      Basic: 15,
      Pro: 50,
      Plus: 999
    };

    const userLimit = limits[user.tier as keyof typeof limits] || 3;
    const currentUsage = shouldReset ? 0 : user.reports_used;

    // Check if user has exceeded limit
    if (currentUsage >= userLimit && user.tier !== 'Plus') {
      return {
        success: false,
        error: 'Monthly report limit exceeded',
        usage: {
          current: currentUsage,
          limit: userLimit,
          tier: user.tier
        }
      };
    }

    // Update usage in Supabase
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
      console.error('User update error:', updateError);
      return { success: false, error: 'Failed to update usage' };
    }

    return {
      success: true,
      usage: {
        current: newUsage,
        limit: userLimit,
        tier: user.tier
      }
    };

  } catch (error) {
    console.error('Usage check error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Save report to Supabase
 */
async function saveReport(userEmail: string, title: string, content: string): Promise<void> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (user) {
      await supabaseAdmin
        .from('reports')
        .insert({
          title,
          content,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Save report error:', error);
    // Don't fail the entire request if saving fails
  }
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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const body = await response.text();
    const parsed = JSON.parse(body);
    const rawRubric = parsed?.content?.[0]?.text?.trim() || "Rubric generation failed.";
    return stripMarkdownSync(rawRubric);
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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const body = await response.text();
    const parsed = JSON.parse(body);
    const title = parsed?.content?.[0]?.text?.trim() || "Lab Report: Experiment Analysis";
    
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Upload API called');

    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No authenticated session');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please sign in to generate lab reports'
      });
    }

    console.log('✅ Authenticated user:', session.user.email);

    // Check usage limits
    const usageCheck = await checkAndUpdateUsage(session.user.email);
    
    if (!usageCheck.success) {
      console.log('❌ Usage check failed:', usageCheck.error);
      if (usageCheck.error === 'Monthly report limit exceeded') {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          message: `You've reached your monthly limit of ${usageCheck.usage?.limit} reports. Upgrade your plan to generate more reports.`,
          usage: usageCheck.usage
        });
      } else {
        return res.status(500).json({ error: usageCheck.error });
      }
    }

    console.log('✅ Usage updated:', usageCheck.usage);

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
        const [rubric, report] = await Promise.all([
          generateRubricFromManual(manualText, rawDataText),
          generateLabReport(manualText, rawDataText)
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

        // Save report to database
        await saveReport(session.user.email, generatedTitle, cleanedReport);

        console.log('✅ Upload API completed successfully');

        return res.status(200).json({
          labReport: cleanedReport,
          chartSpec: extractedChartSpec || chartSpec,
          rubric,
          title: generatedTitle,
          usage: usageCheck.usage
        });

      } catch (generationError) {
        console.error('Content generation error:', generationError);
        return res.status(500).json({ 
          error: 'Failed to generate report content',
          message: 'There was an error processing your files. Please try again.'
        });
      }
    });

  } catch (error) {
    console.error('💥 Upload API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
}