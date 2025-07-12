// --- /lib/claude.ts ---
export async function generateChartSpecFromManual(manualText: string): Promise<any> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY!,
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

  const data = await response.json();
  const jsonMatch = data?.content?.[0]?.text?.match(/{[\s\S]*}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}