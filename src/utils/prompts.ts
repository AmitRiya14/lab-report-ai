// --- /utils/prompts.ts ---
export const generateLabReportPrompt = (manualText: string, rawData: string): string => {
  const formattedData = Array.isArray(rawData)
    ? rawData.map(row => row.join('\t')).join('\n')
    : rawData;

  return `You are a scientific writer. Your task is to write a complete, original lab report using the materials below.

DO NOT reuse prior reports or invent generalized content. Base all sections strictly on the following lab manual and data.

---
📘 Lab Manual Content:
${manualText}

${formattedData && formattedData !== "No raw data was provided. Please interpret results based on expected trends and procedures." ? `📊 Raw Data (analyze this in results/discussion):
${formattedData}` : ""}

---
✍️ Write the report in this order:
1. Title (be descriptive and specific)
2. Abstract (summarize this experiment only)
3. Introduction (use scientific background relevant to this experiment)
4. Hypothesis (infer from procedure)
5. Materials & Methods (summarize from manual)
6. Results (analyze actual or inferred data)
7. Discussion (interpret results in context)
8. Conclusion (summarize key takeaways)
9. References (fabricate but realistic)
10. Appendix (mention raw data origin if any)

🧠 Reminder: This is a lab about ${manualText.slice(0, 100).replace(/\s+/g, ' ')}...
ONLY write about that.`;
};
