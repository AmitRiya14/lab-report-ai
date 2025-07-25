/**
 * Chart specification for data visualization
 */
export type ChartSpec = {
  graphType: "line" | "bar" | "scatter";
  xLabel: string;
  yLabel: string;
  series: { label: string; column: string; values: number[] }[];
};

/**
 * Generate chart specification from lab manual text using Claude API
 * Extracts visualization requirements and returns structured chart data
 */
export async function generateChartSpecFromManual(manualText: string): Promise<ChartSpec> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY) {
    throw new Error("Claude API key not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: `From the lab manual below, extract and return JSON instructions for generating a graph. Include:
- graphType: "line", "bar", or "scatter"
- xLabel and yLabel
- series: array of { label, column }

Respond ONLY with JSON.

Manual text:
"""${manualText}"""`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${errorText}`);
  }

  try {
    const raw = await response.text();
    // Extract JSON from code block if present
    const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (!codeMatch) {
      throw new Error("No JSON code block found in Claude response.");
    }

    return JSON.parse(codeMatch[1]);
  } catch (err) {
    console.error("Claude JSON parse failed:", err);
    throw new Error("Claude returned malformed JSON or non-JSON content.");
  }
}

/**
 * Generate complete lab report using Claude API
 * Combines manual text and raw data to create structured academic report
 */
export async function generateLabReport(
  manualText: string, 
  rawDataSummary: string
): Promise<string | null> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY) {
    throw new Error("Claude API key not configured");
  }

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
${rawDataSummary}

Generate a complete, professional lab report:`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.4,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ]
    })
  });

  try {
    const contentType = response.headers.get("content-type");
    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`Claude API error: ${raw}`);
    }

    // Handle both JSON and plain text responses
    if (contentType?.includes("application/json")) {
      const data = JSON.parse(raw);
      return data?.content?.[0]?.text || null;
    } else {
      return raw; // Fallback for malformed headers
    }
  } catch (err) {
    console.error("Claude lab report generation failed:", err);
    return null;
  }
}